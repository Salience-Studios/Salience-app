import type { FileWrite } from "@/lib/github/repo";
import { writeFrontMatter } from "./frontmatter";
import { folderName, subjectPath } from "./paths";

export type SubjectConfig = {
  id: string;
  name: string;
  slug: string;
  /** One line. What this subject is. */
  what: string;
  /** Facts every stage should know — one per line. */
  facts: string;
  /** Constraints and blockers — one per line. */
  constraints: string;
};

export function subjectSlug(name: string): string {
  return folderName(name);
}

function bullets(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
}

function section(title: string, body: string): string {
  const trimmed = body.trim();
  return trimmed ? `## ${title}\n${trimmed}\n\n` : "";
}

/**
 * A subject's context is available to any stage that declares it, and is never
 * loaded automatically. The same rule applies to it as to everything else —
 * which is why the file says so out loud, rather than leaving the reader to
 * assume it is ambient.
 */
export function generateSubjectFiles(config: SubjectConfig): FileWrite[] {
  const dir = subjectPath(config.slug);

  const context =
    writeFrontMatter({
      salience: "subject",
      id: config.id,
      name: config.name,
      slug: config.slug,
    }) +
    `# ${config.name}\n\n` +
    section("What this is", config.what) +
    section("Facts", bullets(config.facts)) +
    section("Constraints", bullets(config.constraints)) +
    "Read by a stage only when that stage declares this subject's context as an input.\n";

  return [{ path: `${dir}/Context.md`, content: context }];
}
