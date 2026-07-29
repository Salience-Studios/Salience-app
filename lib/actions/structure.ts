"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, systems, stages, subjects } from "@/lib/db";
import { commitFiles, listTree, readFile, type FileWrite, type RepoRef } from "@/lib/github/repo";
import { reconcile, type ReconcileReport } from "@/lib/github/reconcile";
import { generateSystemFiles } from "@/lib/generate/system";
import { generateStageFiles } from "@/lib/generate/stage";
import { generateSubjectFiles, subjectSlug } from "@/lib/generate/subject";
import { parseFrontMatter, writeFrontMatter } from "@/lib/generate/frontmatter";
import { stagePath, systemPath } from "@/lib/generate/paths";
import { parseGrants, grantsFor, encodeGrant, type StageType } from "@/lib/tools";
import { getWorkspace } from "./workspace";

type Result = { error: string } | undefined;

async function repoFor(workspaceId: string): Promise<RepoRef | null> {
  const ws = await getWorkspace(workspaceId);
  if (!ws) return null;
  return {
    installationId: ws.installationId,
    owner: ws.repoOwner,
    name: ws.repoName,
  };
}

/**
 * Every structure write is commit-then-index, in that order. If the commit
 * fails there is no row, and if the row write fails the commit still stands —
 * which is the recoverable direction, because reconciliation rebuilds the
 * index from the repo but nothing rebuilds the repo from the index.
 *
 * 03 specifies an advisory lock on `workspace_id` around read-modify-commit.
 * It is still not implemented — carried from M1 as a known issue, and due with
 * M3 where concurrent approvals introduce the actual race.
 */
async function commitStructure(
  ref: RepoRef,
  files: FileWrite[],
  message: string,
  deletePaths: string[] = [],
): Promise<{ error: string } | { sha: string }> {
  try {
    const sha = await commitFiles(ref, files, message, deletePaths);
    return { sha };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { error: `GitHub rejected the commit: ${reason}` };
  }
}

/* -------------------------------------------------------------- Systems */

export async function createSystem(_prev: unknown, formData: FormData): Promise<Result> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();

  const ref = await repoFor(workspaceId);
  if (!ref) return { error: "Workspace not found." };
  if (!name) return { error: "Give the system a name." };

  const siblings = await db
    .select({ id: systems.id, repoPath: systems.repoPath })
    .from(systems)
    .where(eq(systems.workspaceId, workspaceId));

  const dir = systemPath(name);
  if (siblings.some((s) => s.repoPath === dir)) {
    return { error: `A system already lives at ${dir}.` };
  }

  const id = crypto.randomUUID();
  const position = siblings.length + 1;
  const files = generateSystemFiles({ id, name, purpose, position });

  const commit = await commitStructure(
    ref,
    files,
    `Salience: add system "${name}"`,
  );
  if ("error" in commit) return commit;

  await db.insert(systems).values({
    id,
    workspaceId,
    name,
    purpose,
    position,
    repoPath: dir,
  });

  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}/systems/${id}`);
}

/* --------------------------------------------------------------- Stages */

export async function createStage(_prev: unknown, formData: FormData): Promise<Result> {
  const systemId = String(formData.get("systemId") ?? "");
  const [system] = await db
    .select()
    .from(systems)
    .where(eq(systems.id, systemId))
    .limit(1);
  if (!system) return { error: "System not found." };

  const workspaceId = system.workspaceId;
  const ref = await repoFor(workspaceId);
  if (!ref) return { error: "Workspace not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the stage a name." };

  const type: StageType =
    String(formData.get("type") ?? "text") === "build" ? "build" : "text";

  const siblings = await db
    .select({ position: stages.position })
    .from(stages)
    .where(eq(stages.systemId, systemId));
  const position = siblings.length + 1;

  const tools = grantsFor(type, parseGrants(formData.getAll("tools").map(String)));
  const declaredInputs = formData.getAll("inputs").map(String).filter(Boolean);
  const ceiling = Number(formData.get("toolCeiling") ?? 20000);
  const defaultModel = String(formData.get("defaultModel") ?? "").trim() || null;

  const id = crypto.randomUUID();
  const files = generateStageFiles({
    id,
    systemName: system.name,
    position,
    name,
    type,
    goal: String(formData.get("goal") ?? "").trim(),
    declaredInputs,
    tools,
    toolCeilingTokens: Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 20000,
    defaultModel,
    does: String(formData.get("does") ?? ""),
    doesNot: String(formData.get("doesNot") ?? ""),
    outputSections: String(formData.get("outputSections") ?? ""),
    closingRule: String(formData.get("closingRule") ?? ""),
    referenceRules: String(formData.get("referenceRules") ?? ""),
  });

  const commit = await commitStructure(
    ref,
    files,
    `Salience: add stage "${name}" to ${system.name}`,
  );
  if ("error" in commit) return commit;

  await db.insert(stages).values({
    id,
    systemId,
    position,
    name,
    type,
    goal: String(formData.get("goal") ?? "").trim(),
    declaredInputs,
    allowedTools: tools.map(encodeGrant),
    toolCeilingTokens: Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 20000,
    defaultModel,
    repoPath: stagePath(system.name, position, name),
  });

  revalidatePath(`/workspaces/${workspaceId}/systems/${systemId}`);
  redirect(`/workspaces/${workspaceId}/systems/${systemId}`);
}

/**
 * Reorder by swapping with a neighbour. Position lives in the folder name, so
 * this moves directories: every blob under each stage is rewritten at its new
 * prefix and deleted from the old one, in a single commit. A repo that is
 * briefly missing a stage is a repo whose index cannot be rebuilt from it.
 */
export async function moveStage(stageId: string, direction: -1 | 1) {
  const [stage] = await db
    .select()
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  if (!stage) return;

  const [system] = await db
    .select()
    .from(systems)
    .where(eq(systems.id, stage.systemId))
    .limit(1);
  if (!system) return;

  const ordered = await db
    .select()
    .from(stages)
    .where(eq(stages.systemId, stage.systemId))
    .orderBy(asc(stages.position));

  const index = ordered.findIndex((s) => s.id === stageId);
  const swapWith = ordered[index + direction];
  if (!swapWith) return;

  const ref = await repoFor(system.workspaceId);
  if (!ref) return;

  const tree = await listTree(ref);
  const moves: FileWrite[] = [];
  const removals: string[] = [];

  const plan = [
    { row: stage, to: swapWith.position },
    { row: swapWith, to: stage.position },
  ];

  for (const { row, to } of plan) {
    const from = row.repoPath;
    const dest = stagePath(system.name, to, row.name);
    if (from === dest) continue;

    for (const entry of tree) {
      if (entry.path !== from && !entry.path.startsWith(`${from}/`)) continue;
      const suffix = entry.path.slice(from.length);
      const content = (await readFile(ref, entry.path)) ?? "";
      moves.push({ path: `${dest}${suffix}`, content });
      removals.push(entry.path);
    }

    // The moved Context.md still declares the old position and title.
    const original = await readFile(ref, `${from}/Context.md`);
    const parsed = original ? parseFrontMatter(original) : null;
    if (parsed) {
      const heading = `# ${system.name} — ${String(to).padStart(2, "0")}_${row.name}`;
      const body = parsed.body.replace(/^#\s.*$/m, heading);
      moves.push({
        path: `${dest}/Context.md`,
        content: writeFrontMatter({ ...parsed.data, position: to }) + body,
      });
    }
  }

  if (!moves.length) return;

  const commit = await commitStructure(
    ref,
    moves,
    `Salience: reorder ${system.name} stages`,
    removals,
  );
  if ("error" in commit) return;

  for (const { row, to } of plan) {
    await db
      .update(stages)
      .set({ position: to, repoPath: stagePath(system.name, to, row.name) })
      .where(eq(stages.id, row.id));
  }

  revalidatePath(`/workspaces/${system.workspaceId}/systems/${system.id}`);
}

/* ------------------------------------------------------------- Subjects */

export async function createSubject(_prev: unknown, formData: FormData): Promise<Result> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  const ref = await repoFor(workspaceId);
  if (!ref) return { error: "Workspace not found." };
  if (!name) return { error: "Give the subject a name." };

  const slug = subjectSlug(name);
  const clash = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.workspaceId, workspaceId), eq(subjects.slug, slug)))
    .limit(1);
  if (clash.length) {
    return { error: `${slug} already exists. One folder per subject.` };
  }

  const id = crypto.randomUUID();
  const files = generateSubjectFiles({
    id,
    name,
    slug,
    what: String(formData.get("what") ?? "").trim(),
    facts: String(formData.get("facts") ?? ""),
    constraints: String(formData.get("constraints") ?? ""),
  });

  const commit = await commitStructure(
    ref,
    files,
    `Salience: add subject "${name}"`,
  );
  if ("error" in commit) return commit;

  await db.insert(subjects).values({ id, workspaceId, name, slug });

  revalidatePath(`/workspaces/${workspaceId}/subjects`);
  redirect(`/workspaces/${workspaceId}/subjects/${id}`);
}

/* --------------------------------------------------------------- Reads */

export async function listSystems(workspaceId: string) {
  return db
    .select()
    .from(systems)
    .where(eq(systems.workspaceId, workspaceId))
    .orderBy(asc(systems.position));
}

export async function getSystem(systemId: string) {
  const [row] = await db
    .select()
    .from(systems)
    .where(eq(systems.id, systemId))
    .limit(1);
  return row ?? null;
}

export async function listStages(systemId: string) {
  return db
    .select()
    .from(stages)
    .where(eq(stages.systemId, systemId))
    .orderBy(asc(stages.position));
}

export async function getStage(stageId: string) {
  const [row] = await db
    .select()
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  return row ?? null;
}

export async function listSubjects(workspaceId: string) {
  return db
    .select()
    .from(subjects)
    .where(eq(subjects.workspaceId, workspaceId))
    .orderBy(asc(subjects.name));
}

export async function getSubject(subjectId: string) {
  const [row] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);
  return row ?? null;
}

export async function readStageFile(stageId: string, file: "Context.md" | "References.md") {
  const stage = await getStage(stageId);
  if (!stage) return null;
  const system = await getSystem(stage.systemId);
  if (!system) return null;
  const ref = await repoFor(system.workspaceId);
  if (!ref) return null;
  return readFile(ref, `${stage.repoPath}/${file}`);
}

/* -------------------------------------------------------- Reconciliation */

export async function reconcileWorkspace(
  workspaceId: string,
): Promise<ReconcileReport | { error: string }> {
  const ref = await repoFor(workspaceId);
  if (!ref) return { error: "Workspace not found." };
  try {
    const report = await reconcile(workspaceId, ref);
    revalidatePath(`/workspaces/${workspaceId}`);
    return report;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { error: `Reconciliation failed: ${reason}` };
  }
}
