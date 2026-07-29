import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db, systems, stages, subjects, workspaces } from "@/lib/db";
import {
  parseFrontMatter,
  str,
  num,
  list,
  type FrontMatter,
} from "@/lib/generate/frontmatter";
import { headSha, listTree, readFile, type RepoRef } from "./repo";

/**
 * Rebuild the Postgres index from the repo tree.
 *
 * Git wins every conflict: the index is a derived cache and its rebuild is a
 * deterministic function of the tree, because every structure file carries its
 * own identity in front-matter. Reconciliation is therefore re-read and
 * replace, not adjudication.
 *
 * Rows are matched by the id in the file, not by path, so renaming or
 * reordering a stage keeps its identity — and its run history, once runs
 * exist. Only ids that have genuinely left the repo are deleted.
 */

export type ReconcileReport = {
  headSha: string | null;
  systems: number;
  stages: number;
  subjects: number;
  /** Files that look like structure but no longer parse as it. */
  issues: string[];
};

type ParsedSystem = {
  id: string;
  name: string;
  purpose: string;
  position: number;
  repoPath: string;
  dir: string;
};

type ParsedStage = {
  id: string;
  systemDir: string;
  name: string;
  type: string;
  position: number;
  goal: string;
  declaredInputs: string[];
  allowedTools: string[];
  toolCeilingTokens: number;
  defaultModel: string | null;
  repoPath: string;
};

type ParsedSubject = {
  id: string;
  name: string;
  slug: string;
};

export async function reconcile(
  workspaceId: string,
  ref: RepoRef,
): Promise<ReconcileReport> {
  const tree = await listTree(ref);
  const issues: string[] = [];

  const systemPaths: string[] = [];
  const stagePaths: string[] = [];
  const subjectPaths: string[] = [];

  for (const entry of tree) {
    const parts = entry.path.split("/");
    if (parts[0] === "Systems" && parts.at(-1) === "Context.md") {
      if (parts.length === 3) systemPaths.push(entry.path);
      else if (parts.length === 4) stagePaths.push(entry.path);
    } else if (
      parts[0] === "Subjects" &&
      parts.length === 3 &&
      parts.at(-1) === "Context.md"
    ) {
      subjectPaths.push(entry.path);
    }
  }

  const read = async (path: string): Promise<FrontMatter | null> => {
    const content = await readFile(ref, path);
    if (content === null) {
      issues.push(`${path} — could not be read from the repository.`);
      return null;
    }
    const parsed = parseFrontMatter(content);
    if (!parsed) {
      issues.push(`${path} — front-matter is missing or malformed.`);
      return null;
    }
    return parsed.data;
  };

  // Systems ---------------------------------------------------------------
  const parsedSystems: ParsedSystem[] = [];
  for (const path of systemPaths) {
    const data = await read(path);
    if (!data) continue;
    if (str(data, "salience") !== "system") {
      issues.push(`${path} — sits where a system should but is not one.`);
      continue;
    }
    const id = str(data, "id");
    const name = str(data, "name");
    if (!id || !name) {
      issues.push(`${path} — a system needs both an id and a name.`);
      continue;
    }
    const dir = path.slice(0, -"/Context.md".length);
    parsedSystems.push({
      id,
      name,
      purpose: str(data, "purpose") ?? "",
      position: num(data, "position") ?? parsedSystems.length + 1,
      repoPath: dir,
      dir,
    });
  }

  const systemByDir = new Map(parsedSystems.map((s) => [s.dir, s]));

  // Stages ----------------------------------------------------------------
  const parsedStages: ParsedStage[] = [];
  for (const path of stagePaths) {
    const data = await read(path);
    if (!data) continue;
    if (str(data, "salience") !== "stage") {
      issues.push(`${path} — sits where a stage should but is not one.`);
      continue;
    }
    const id = str(data, "id");
    const name = str(data, "name");
    if (!id || !name) {
      issues.push(`${path} — a stage needs both an id and a name.`);
      continue;
    }

    const dir = path.slice(0, -"/Context.md".length);
    const systemDir = dir.split("/").slice(0, 2).join("/");
    if (!systemByDir.has(systemDir)) {
      issues.push(`${path} — its system has no Context.md, so it has no parent.`);
      continue;
    }

    const type = str(data, "type") === "build" ? "build" : "text";
    const model = str(data, "default_model");
    parsedStages.push({
      id,
      systemDir,
      name,
      type,
      position: num(data, "position") ?? parsedStages.length + 1,
      goal: str(data, "goal") ?? "",
      declaredInputs: list(data, "declared_inputs"),
      allowedTools: list(data, "allowed_tools"),
      toolCeilingTokens: num(data, "tool_ceiling_tokens") ?? 20000,
      defaultModel: model || null,
      repoPath: dir,
    });
  }

  // Subjects --------------------------------------------------------------
  const parsedSubjects: ParsedSubject[] = [];
  for (const path of subjectPaths) {
    const data = await read(path);
    if (!data) continue;
    if (str(data, "salience") !== "subject") {
      issues.push(`${path} — sits where a subject should but is not one.`);
      continue;
    }
    const id = str(data, "id");
    const name = str(data, "name");
    if (!id || !name) {
      issues.push(`${path} — a subject needs both an id and a name.`);
      continue;
    }
    parsedSubjects.push({
      id,
      name,
      slug: str(data, "slug") ?? path.split("/")[1],
    });
  }

  // Replace ---------------------------------------------------------------
  for (const system of parsedSystems) {
    await db
      .insert(systems)
      .values({
        id: system.id,
        workspaceId,
        name: system.name,
        purpose: system.purpose,
        position: system.position,
        repoPath: system.repoPath,
      })
      .onConflictDoUpdate({
        target: systems.id,
        set: {
          workspaceId,
          name: system.name,
          purpose: system.purpose,
          position: system.position,
          repoPath: system.repoPath,
        },
      });
  }

  for (const stage of parsedStages) {
    const systemId = systemByDir.get(stage.systemDir)!.id;
    await db
      .insert(stages)
      .values({
        id: stage.id,
        systemId,
        position: stage.position,
        name: stage.name,
        type: stage.type,
        goal: stage.goal,
        declaredInputs: stage.declaredInputs,
        allowedTools: stage.allowedTools,
        toolCeilingTokens: stage.toolCeilingTokens,
        defaultModel: stage.defaultModel,
        repoPath: stage.repoPath,
      })
      .onConflictDoUpdate({
        target: stages.id,
        set: {
          systemId,
          position: stage.position,
          name: stage.name,
          type: stage.type,
          goal: stage.goal,
          declaredInputs: stage.declaredInputs,
          allowedTools: stage.allowedTools,
          toolCeilingTokens: stage.toolCeilingTokens,
          defaultModel: stage.defaultModel,
          repoPath: stage.repoPath,
        },
      });
  }

  for (const subject of parsedSubjects) {
    await db
      .insert(subjects)
      .values({
        id: subject.id,
        workspaceId,
        name: subject.name,
        slug: subject.slug,
      })
      .onConflictDoUpdate({
        target: subjects.id,
        set: { workspaceId, name: subject.name, slug: subject.slug },
      });
  }

  // Anything the repo no longer describes stops existing. Deletes run last so
  // a failed read earlier never removes a row that is still in the tree.
  await pruneSystems(workspaceId, parsedSystems.map((s) => s.id));
  await pruneStages(
    parsedSystems.map((s) => s.id),
    parsedStages.map((s) => s.id),
  );
  await pruneSubjects(workspaceId, parsedSubjects.map((s) => s.id));

  const sha = await headSha(ref);
  await db
    .update(workspaces)
    .set({ headSha: sha })
    .where(eq(workspaces.id, workspaceId));

  return {
    headSha: sha,
    systems: parsedSystems.length,
    stages: parsedStages.length,
    subjects: parsedSubjects.length,
    issues,
  };
}

async function pruneSystems(workspaceId: string, keep: string[]) {
  await db
    .delete(systems)
    .where(
      keep.length
        ? and(eq(systems.workspaceId, workspaceId), notInArray(systems.id, keep))
        : eq(systems.workspaceId, workspaceId),
    );
}

async function pruneStages(systemIds: string[], keep: string[]) {
  if (!systemIds.length) return;
  await db
    .delete(stages)
    .where(
      keep.length
        ? and(inArray(stages.systemId, systemIds), notInArray(stages.id, keep))
        : inArray(stages.systemId, systemIds),
    );
}

async function pruneSubjects(workspaceId: string, keep: string[]) {
  await db
    .delete(subjects)
    .where(
      keep.length
        ? and(
            eq(subjects.workspaceId, workspaceId),
            notInArray(subjects.id, keep),
          )
        : eq(subjects.workspaceId, workspaceId),
    );
}
