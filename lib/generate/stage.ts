import type { FileWrite } from "@/lib/github/repo";
import {
  TOOL_SUMMARY,
  encodeGrant,
  type StageType,
  type ToolGrant,
} from "@/lib/tools";
import { writeFrontMatter } from "./frontmatter";
import { stagePath } from "./paths";

/**
 * What a stage may load. The workspace prefix — CLAUDE.md and Context.md — is
 * always present and is never declared, because it is the fixed cached prefix
 * every run shares. Everything else is opt-in, which is the whole mechanism:
 * nothing outside this list enters the context.
 */
export const SUBJECT_CONTEXT = "subject_context";
export const ATTACHMENTS = "attachments";
export const STAGE_PREFIX = "stage:";

export function stageInput(stageFolder: string): string {
  return `${STAGE_PREFIX}${stageFolder}`;
}

export function describeInput(token: string): string {
  if (token === SUBJECT_CONTEXT) return "This subject's `Context.md`";
  if (token === ATTACHMENTS) return "Files uploaded to this subject or run";
  if (token.startsWith(STAGE_PREFIX)) {
    return `The approved output of \`${token.slice(STAGE_PREFIX.length)}\` for this subject`;
  }
  return token;
}

export type StageConfig = {
  id: string;
  workflowName: string;
  position: number;
  name: string;
  type: StageType;
  /** One sentence. */
  goal: string;
  declaredInputs: string[];
  tools: ToolGrant[];
  toolCeilingTokens: number;
  defaultModel: string | null;
  /** What this stage does — one per line. */
  does: string;
  /** What this stage must not do — one per line. */
  doesNot: string;
  /** Output sections — one per line. */
  outputSections: string;
  /** The stage's final line. */
  closingRule: string;
  /** Rules for References.md. */
  referenceRules: string;
};

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

function toolLines(tools: ToolGrant[]): string {
  return tools
    .map(
      (tool) =>
        `- \`${tool.name}\` — ${TOOL_SUMMARY[tool.name]}${tool.gated ? " **Asks every time.**" : ""}`,
    )
    .join("\n");
}

function inputLines(tokens: string[]): string {
  return tokens.map((token) => `- ${describeInput(token)}`).join("\n");
}

export function generateStageFiles(config: StageConfig): FileWrite[] {
  const dir = stagePath(config.workflowName, config.position, config.name);

  const frontMatter = writeFrontMatter({
    salience: "stage",
    id: config.id,
    name: config.name,
    type: config.type,
    position: config.position,
    goal: config.goal,
    declared_inputs: config.declaredInputs,
    allowed_tools: config.tools.map(encodeGrant),
    tool_ceiling_tokens: config.toolCeilingTokens,
    default_model: config.defaultModel ?? "",
  });

  const ceiling = config.toolCeilingTokens.toLocaleString("en-US");

  const context =
    frontMatter +
    `# ${config.workflowName} — ${String(config.position).padStart(2, "0")}_${config.name}\n\n` +
    (config.goal.trim() ? `Goal: ${config.goal.trim()}\n\n` : "") +
    `Type: ${config.type}. ${
      config.type === "build"
        ? "Runs as a sandboxed agent session with the repo mounted, and produces code changes on a branch alongside its output."
        : "Runs as one request plus a Salience-side tool loop, and produces one markdown output."
    }\n\n` +
    section(
      "Inputs",
      config.declaredInputs.length
        ? `${inputLines(config.declaredInputs)}\n\nNothing outside this list is loaded. \`CLAUDE.md\` and this workspace's \`Context.md\` are always read first and are not declared here.`
        : "Nothing beyond `CLAUDE.md` and the workspace `Context.md`.",
    ) +
    section(
      "Tools",
      config.tools.length
        ? `${toolLines(config.tools)}\n\nCeiling: ${ceiling} tokens of tool results per run. A result that would exceed it pauses the run and asks. Nothing outside this list is callable.`
        : "None. This stage calls no tools.",
    ) +
    section("Do", bullets(config.does)) +
    section("Do not", bullets(config.doesNot)) +
    section(
      "Output",
      `One file: \`outputs/<Subject>.md\`.${
        config.outputSections.trim()
          ? `\nSections: ${config.outputSections
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
              .join(" · ")}`
          : ""
      }`,
    ) +
    (config.closingRule.trim() ? `${config.closingRule.trim()}\n` : "");

  const references =
    writeFrontMatter({
      salience: "references",
      stage_id: config.id,
      name: config.name,
    }) +
    `# References — ${config.name}\n\n` +
    "Links and assets this stage may use.\n\n" +
    "Format:\n`- [name](url) — what it solves, one line.`\n\n" +
    section(
      "Rules",
      bullets(config.referenceRules) ||
        "- A reference earns its place once it is used. Delete it when it is not.\n- Nothing here overrides this stage's Context.md.",
    );

  return [
    { path: `${dir}/Context.md`, content: context },
    { path: `${dir}/References.md`, content: references },
    { path: `${dir}/outputs/.gitkeep`, content: "" },
  ];
}
