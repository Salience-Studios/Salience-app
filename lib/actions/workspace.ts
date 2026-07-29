"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, workspaces, authAccounts } from "@/lib/db";
import { listInstallationRepos, type InstallationRepo } from "@/lib/github/app";
import { commitFiles, headSha, readFile, listTree } from "@/lib/github/repo";
import {
  generateWorkspaceFiles,
  type WorkspaceConfig,
} from "@/lib/generate/workspace";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session.user.id;
}

/** The user-to-server token, used only to enumerate their installations. */
async function userAccessToken(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ token: authAccounts.access_token })
    .from(authAccounts)
    .where(
      and(eq(authAccounts.userId, userId), eq(authAccounts.provider, "github")),
    )
    .limit(1);
  return row?.token ?? null;
}

/**
 * "No repositories" and "GitHub is unreachable" are different problems with
 * different fixes, so they are never collapsed into one empty state.
 */
export type ReposResult =
  | { ok: true; repos: InstallationRepo[] }
  | { ok: false; reason: string };

export async function getInstallableRepos(): Promise<ReposResult> {
  const userId = await requireUserId();
  const token = await userAccessToken(userId);
  if (!token) {
    return {
      ok: false,
      reason: "Your GitHub sign-in has no access token. Sign out and back in.",
    };
  }
  try {
    return { ok: true, repos: await listInstallationRepos(token) };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { ok: false, reason: `GitHub could not be reached: ${reason}` };
  }
}

export type RepoReadiness =
  | { ok: true; empty: boolean }
  | { ok: false; reason: string };

/**
 * Validate a repository the moment it is picked, not after the whole form is
 * filled. Both failures here are terminal for that repo, and the end of a
 * multi-step form is the worst possible place to learn it.
 *
 * `createWorkspace` repeats these checks — this one is for the user, that one
 * is the guard. Check-then-commit is racy by nature and the commit path is
 * what has to be right.
 */
export async function checkRepo(
  installationId: number,
  owner: string,
  name: string,
): Promise<RepoReadiness> {
  await requireUserId();
  if (!installationId || !owner || !name) {
    return { ok: false, reason: "That repository selection could not be read." };
  }

  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.repoOwner, owner), eq(workspaces.repoName, name)))
    .limit(1);
  if (existing.length) {
    return {
      ok: false,
      reason: `${owner}/${name} is already connected to a workspace.`,
    };
  }

  let tree;
  try {
    tree = await listTree({ installationId, owner, name });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { ok: false, reason: `GitHub could not read ${owner}/${name}: ${reason}` };
  }

  if (tree.some((entry) => entry.path === "CLAUDE.md")) {
    return {
      ok: false,
      reason: `${owner}/${name} already contains a CLAUDE.md. Pick an empty repository.`,
    };
  }

  return { ok: true, empty: tree.length === 0 };
}

export async function createWorkspace(
  _prev: unknown,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const userId = await requireUserId();

  const repoValue = String(formData.get("repo") ?? "");
  if (!repoValue) return { error: "Pick a repository." };

  // Encoded as "installationId:owner/name"
  const [installationRaw, fullName] = repoValue.split(":");
  const installationId = Number(installationRaw);
  const [owner, name] = (fullName ?? "").split("/");
  if (!installationId || !owner || !name) {
    return { error: "That repository selection could not be read. Try again." };
  }

  const config: WorkspaceConfig = {
    name: String(formData.get("name") ?? "").trim(),
    what: String(formData.get("what") ?? "").trim(),
    voice: String(formData.get("voice") ?? "").trim(),
    stack: String(formData.get("stack") ?? "").trim(),
    conventions: String(formData.get("conventions") ?? "").trim(),
    alwaysDo: String(formData.get("alwaysDo") ?? "").trim(),
    neverDo: String(formData.get("neverDo") ?? "").trim(),
  };
  if (!config.name) return { error: "Give the workspace a name." };

  const existing = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.repoOwner, owner), eq(workspaces.repoName, name)))
    .limit(1);
  if (existing.length) {
    return { error: `${owner}/${name} is already connected to a workspace.` };
  }

  const ref = { installationId, owner, name };

  // Refuse to scaffold over an existing structure rather than overwrite it.
  const tree = await listTree(ref);
  if (tree.some((e) => e.path === "CLAUDE.md")) {
    return {
      error: `${owner}/${name} already contains a CLAUDE.md. Use an empty repository.`,
    };
  }

  let sha: string;
  try {
    sha = await commitFiles(
      ref,
      generateWorkspaceFiles(config),
      `Salience: scaffold workspace "${config.name}"`,
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { error: `GitHub rejected the commit: ${reason}` };
  }

  const [created] = await db
    .insert(workspaces)
    .values({
      userId,
      name: config.name,
      repoOwner: owner,
      repoName: name,
      installationId,
      headSha: sha,
    })
    .returning({ id: workspaces.id });

  revalidatePath("/workspaces");
  redirect(`/workspaces/${created.id}`);
}

export async function getWorkspace(id: string) {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function listWorkspaces() {
  const userId = await requireUserId();
  return db.select().from(workspaces).where(eq(workspaces.userId, userId));
}

export async function readWorkspaceFile(workspaceId: string, path: string) {
  const ws = await getWorkspace(workspaceId);
  if (!ws) return null;
  return readFile(
    { installationId: ws.installationId, owner: ws.repoOwner, name: ws.repoName },
    path,
  );
}

export async function listWorkspaceFiles(workspaceId: string) {
  const ws = await getWorkspace(workspaceId);
  if (!ws) return [];
  return listTree({
    installationId: ws.installationId,
    owner: ws.repoOwner,
    name: ws.repoName,
  });
}

export async function saveWorkspaceFile(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const path = String(formData.get("path") ?? "");
  const content = String(formData.get("content") ?? "");

  const ws = await getWorkspace(workspaceId);
  if (!ws) return { error: "Workspace not found." };

  const ref = {
    installationId: ws.installationId,
    owner: ws.repoOwner,
    name: ws.repoName,
  };

  try {
    const sha = await commitFiles(
      ref,
      [{ path, content }],
      `Salience: edit ${path}`,
    );
    await db
      .update(workspaces)
      .set({ headSha: sha })
      .where(eq(workspaces.id, workspaceId));
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    return { error: `GitHub rejected the commit: ${reason}` };
  }

  revalidatePath(`/workspaces/${workspaceId}`);
  return { ok: true };
}

/**
 * Drift check. The repo is the schema and the index is a derived cache, so a
 * mismatch is surfaced rather than silently resolved.
 */
export async function checkDrift(workspaceId: string): Promise<boolean> {
  const ws = await getWorkspace(workspaceId);
  if (!ws) return false;
  const live = await headSha({
    installationId: ws.installationId,
    owner: ws.repoOwner,
    name: ws.repoName,
  });
  return Boolean(live && ws.headSha && live !== ws.headSha);
}
