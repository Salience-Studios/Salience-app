/**
 * Repo paths. The folder names follow the structure this workspace's own
 * pipeline already proves — `Web_Design/01_Research` — because the export tier
 * depends on the tree staying legible to a person and to their own agents.
 *
 * A stage's position is in its folder name, so the build order is visible in
 * the tree without opening anything. Reordering therefore moves folders, which
 * is why commits support deletions.
 */

export function folderName(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned || "Untitled";
}

/** Zero-padded so folders sort in build order in any file browser. */
export function stageFolder(position: number, name: string): string {
  return `${String(position).padStart(2, "0")}_${folderName(name)}`;
}

export function systemPath(systemName: string): string {
  return `Systems/${folderName(systemName)}`;
}

export function stagePath(
  systemName: string,
  position: number,
  stageName: string,
): string {
  return `${systemPath(systemName)}/${stageFolder(position, stageName)}`;
}

export function subjectPath(slug: string): string {
  return `Subjects/${slug}`;
}

/** Where an approved output lands, and where it is mirrored for the subject. */
export function outputPaths(
  stageDir: string,
  systemName: string,
  stageName: string,
  subjectSlug: string,
) {
  return {
    path: `${stageDir}/outputs/${subjectSlug}.md`,
    mirrorPath: `${subjectPath(subjectSlug)}/${folderName(systemName)}_${folderName(stageName)}.md`,
  };
}
