import { installationOctokit } from "./app";

export type RepoRef = {
  installationId: number;
  owner: string;
  name: string;
};

export type TreeEntry = { path: string; sha: string; size?: number };

/** Files to write in one commit. */
export type FileWrite = { path: string; content: string };

async function defaultBranch(ref: RepoRef): Promise<string | null> {
  const gh = installationOctokit(ref.installationId);
  try {
    const { data } = await gh.repos.get({ owner: ref.owner, repo: ref.name });
    return data.default_branch;
  } catch {
    return null;
  }
}

/** Head commit sha of the default branch, or null for an empty repo. */
export async function headSha(ref: RepoRef): Promise<string | null> {
  const gh = installationOctokit(ref.installationId);
  const branch = await defaultBranch(ref);
  if (!branch) return null;
  try {
    const { data } = await gh.git.getRef({
      owner: ref.owner,
      repo: ref.name,
      ref: `heads/${branch}`,
    });
    return data.object.sha;
  } catch {
    // Repo exists but has no commits yet.
    return null;
  }
}

/** Every blob path in the repo. The input to drift reconciliation. */
export async function listTree(ref: RepoRef): Promise<TreeEntry[]> {
  const sha = await headSha(ref);
  if (!sha) return [];
  const gh = installationOctokit(ref.installationId);
  const { data } = await gh.git.getTree({
    owner: ref.owner,
    repo: ref.name,
    tree_sha: sha,
    recursive: "1",
  });
  return (data.tree ?? [])
    .filter((e) => e.type === "blob" && e.path && e.sha)
    .map((e) => ({ path: e.path!, sha: e.sha!, size: e.size }));
}

export async function readFile(
  ref: RepoRef,
  path: string,
): Promise<string | null> {
  const gh = installationOctokit(ref.installationId);
  try {
    const { data } = await gh.repos.getContent({
      owner: ref.owner,
      repo: ref.name,
      path,
    });
    if (Array.isArray(data) || data.type !== "file") return null;
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Write many files as a single commit.
 *
 * Uses the git data API rather than the contents API so that a scaffold
 * lands as one atomic commit instead of one commit per file. Creates the
 * initial branch when the repo is empty.
 *
 * Callers must hold the per-workspace advisory lock: two approvals racing
 * on one repo would otherwise lose a commit.
 */
export async function commitFiles(
  ref: RepoRef,
  files: FileWrite[],
  message: string,
  deletePaths: string[] = [],
): Promise<string> {
  const gh = installationOctokit(ref.installationId);
  const branch = (await defaultBranch(ref)) ?? "main";
  let parent = await headSha(ref);

  // The git data API cannot write to a repo with no commits — createBlob
  // returns 409 "Git Repository is empty". The contents API can, and it
  // creates the initial branch as a side effect. So bootstrap the first file
  // through it, then fall through to the normal path for the rest.
  //
  // Net effect: an empty repo takes two commits, a populated one takes one.
  if (!parent) {
    const [first, ...rest] = files;
    const { data: bootstrap } = await gh.repos.createOrUpdateFileContents({
      owner: ref.owner,
      repo: ref.name,
      path: first.path,
      message,
      content: Buffer.from(first.content, "utf8").toString("base64"),
      branch,
    });
    parent = bootstrap.commit.sha!;
    if (rest.length === 0) return parent;
    files = rest;
  }

  const blobs = await Promise.all(
    files.map(async (f) => {
      const { data } = await gh.git.createBlob({
        owner: ref.owner,
        repo: ref.name,
        content: Buffer.from(f.content, "utf8").toString("base64"),
        encoding: "base64",
      });
      return { path: f.path, sha: data.sha };
    }),
  );

  // `parent` is guaranteed by the bootstrap above, so the branch always exists.
  const { data: parentCommit } = await gh.git.getCommit({
    owner: ref.owner,
    repo: ref.name,
    commit_sha: parent,
  });

  // A null sha removes the path from the new tree. Renaming a stage folder is
  // a write plus a delete, and both belong in the same commit — a repo that is
  // briefly missing a stage is a repo whose index cannot be rebuilt from it.
  const removals = deletePaths.map((path) => ({
    path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: null,
  }));

  const { data: tree } = await gh.git.createTree({
    owner: ref.owner,
    repo: ref.name,
    base_tree: parentCommit.tree.sha,
    tree: [
      ...blobs.map((b) => ({
        path: b.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: b.sha,
      })),
      ...removals,
    ],
  });

  const { data: commit } = await gh.git.createCommit({
    owner: ref.owner,
    repo: ref.name,
    message,
    tree: tree.sha,
    parents: [parent],
  });

  await gh.git.updateRef({
    owner: ref.owner,
    repo: ref.name,
    ref: `heads/${branch}`,
    sha: commit.sha,
  });

  return commit.sha;
}
