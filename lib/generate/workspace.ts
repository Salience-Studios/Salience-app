import type { FileWrite } from "@/lib/github/repo";

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

function frontMatter(fields: Record<string, string>): string {
  const body = Object.entries(fields)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return `---\n${body}\n---\n\n`;
}

/** Free text, one item per line, rendered as a markdown list. */
function bullets(raw: string): string {
  const lines = raw
    .split("\n")
    .map((l) => l.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
  return lines.length ? lines.map((l) => `- ${l}`).join("\n") : "_None recorded._";
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
    frontMatter({ salience: "workspace", kind: "claude", name: config.name }) +
    `# CLAUDE.md — ${config.name}

Read this first. Then read \`Context.md\`. Both, every session.

## What this is
${config.what || "_Not recorded._"}

## Voice and standards
${config.voice || "_Not recorded._"}

## Stack
${config.stack || "_Not recorded._"}

## Conventions
${config.conventions || "_Not recorded._"}

${READING_ORDER}

## Structure
\`\`\`
${config.name}/
├── CLAUDE.md       ← read first
├── Context.md      ← read second
├── Systems/        ← one folder per repeatable workflow
│   └── <System>/<NN_Stage>/{Context.md, References.md, outputs/}
└── Subjects/       ← one folder per client, project, or period
\`\`\`

Keep every file short. No preamble, no recap of what you just did.
`;

  const context =
    frontMatter({ salience: "workspace", kind: "context", name: config.name }) +
    `# Context

## What this is
${config.what || "_Not recorded._"}

## Purpose
Make quality repeatable so it does not depend on memory. Each stage has a fixed input, a fixed job, and one file as output.

## Do
${bullets(config.alwaysDo)}

## Avoid
${bullets(config.neverDo)}
`;

  return [
    { path: "CLAUDE.md", content: claude },
    { path: "Context.md", content: context },
    { path: "Systems/.gitkeep", content: "" },
    { path: "Subjects/.gitkeep", content: "" },
  ];
}
