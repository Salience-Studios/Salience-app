import type { FileWrite } from "@/lib/github/repo";
import { writeFrontMatter } from "./frontmatter";

export type WorkspaceConfig = {
  name: string;
  /** What this business does, one line. */
  what: string;
  /** Voice and standards. */
  voice: string;
  /** Tools and stack. */
  stack: string;
  /** File and folder conventions. */
  conventions: string;
  /** Always do — one per line. */
  alwaysDo: string;
  /** Never do — one per line. */
  neverDo: string;
};

/** Free text, one item per line, rendered as a markdown list. */
function bullets(raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
  return lines.map((l) => `- ${l}`).join("\n");
}

/**
 * An empty section is omitted, not filled with a placeholder. These files are
 * read at the top of every session, so a heading over "_Not recorded._" costs
 * tokens to say nothing. A missing section is honest; a filled one is noise.
 */
function section(title: string, body: string): string {
  const trimmed = body.trim();
  return trimmed ? `## ${title}\n${trimmed}\n\n` : "";
}

/**
 * The reading-order rule is generated, never user-authored. It is what turns
 * the folder structure from a convention into something enforceable: every
 * session reads a fixed, short prefix and then only what the current stage
 * declares. Editing it by hand is how a workspace stops being scoped.
 */
const READING_ORDER = `## Reading order
1. Read \`CLAUDE.md\` — this file.
2. Read \`Context.md\`.
3. Read the \`Context.md\` of the stage you are working in.
4. Read only what that stage lists under Inputs. Nothing beyond that unless the stage names it.

One stage at a time. Never skip ahead. Every completed stage produces one file in that stage's \`outputs/\`, named for the subject. Never edit a prior stage's output — flag the conflict instead.`;

export function generateWorkspaceFiles(config: WorkspaceConfig): FileWrite[] {
  const claude =
    writeFrontMatter({ salience: "workspace", kind: "claude", name: config.name }) +
    `# CLAUDE.md — ${config.name}\n\n` +
    "Read this first. Then read `Context.md`. Both, every session.\n\n" +
    section("What this is", config.what) +
    section("Voice and standards", config.voice) +
    section("Stack", config.stack) +
    section("Conventions", config.conventions) +
    `${READING_ORDER}\n\n` +
    `## Structure
\`\`\`
${config.name}/
├── CLAUDE.md       ← read first
├── Context.md      ← read second
├── Workflows/      ← one folder per repeatable workflow
│   └── <Workflow>/<NN_Stage>/{Context.md, References.md, outputs/}
└── Subjects/       ← one folder per client, project, or period
\`\`\`

Keep every file short. No preamble, no recap of what you just did.
`;

  const context =
    writeFrontMatter({ salience: "workspace", kind: "context", name: config.name }) +
    "# Context\n\n" +
    section("What this is", config.what) +
    section(
      "Purpose",
      "Make quality repeatable so it does not depend on memory. Each stage has a fixed input, a fixed job, and one file as output.",
    ) +
    section("Do", bullets(config.alwaysDo)) +
    section("Avoid", bullets(config.neverDo));

  return [
    { path: "CLAUDE.md", content: claude },
    { path: "Context.md", content: context },
    { path: "Workflows/.gitkeep", content: "" },
    { path: "Subjects/.gitkeep", content: "" },
  ];
}
