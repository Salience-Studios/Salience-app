/**
 * The tool roster, and what a stage is allowed to call.
 *
 * A stage declares its tools exactly the way it declares its inputs: the
 * allowlist is written into the stage's Context.md, so it is documentation and
 * enforcement at once. Nothing outside it is callable. Execution lands at M4;
 * declaring it is M2's job, because the declaration is what the runtime reads.
 */

export const TEXT_TOOLS = ["web_search", "web_fetch", "read_file"] as const;
export const BUILD_TOOLS = ["bash", "write", "edit", "glob", "grep"] as const;

export type ToolName = (typeof TEXT_TOOLS)[number] | (typeof BUILD_TOOLS)[number];

export type StageType = "text" | "build";

/** A text stage cannot reach the build tools — different runtime entirely. */
export function toolsFor(type: StageType): readonly ToolName[] {
  return type === "build" ? [...TEXT_TOOLS, ...BUILD_TOOLS] : TEXT_TOOLS;
}

/**
 * A granted tool, and whether it pauses for approval every time.
 *
 * Encoded as `name:ask` or `name:free` so it survives as a plain string list —
 * the exact shape 03 gives `stages.allowed_tools`, and the exact shape that
 * fits a YAML flow sequence in front-matter. One representation in the repo,
 * in Postgres, and in the run's tool registry, so there is nothing to keep in
 * sync and no second parser to disagree.
 */
export type ToolGrant = { name: ToolName; gated: boolean };

export function encodeGrant(grant: ToolGrant): string {
  return `${grant.name}:${grant.gated ? "ask" : "free"}`;
}

function decodeGrant(encoded: string, known: ReadonlySet<string>): ToolGrant | null {
  const [name, permission] = encoded.split(":");
  if (!known.has(name)) return null;
  // A bare name predates the permission suffix — fall back to the default
  // rather than dropping the tool.
  const gated =
    permission === "ask"
      ? true
      : permission === "free"
        ? false
        : defaultGate(name as ToolName);
  return { name: name as ToolName, gated };
}

/** Writes and shell commands ask by default. Reads do not. */
const GATED_BY_DEFAULT: ReadonlySet<string> = new Set(["bash", "write", "edit"]);

export function defaultGate(name: ToolName): boolean {
  return GATED_BY_DEFAULT.has(name);
}

export const TOOL_SUMMARY: Record<ToolName, string> = {
  web_search: "Search the web. Billed per query.",
  web_fetch: "Fetch one URL.",
  read_file: "Read a repo file or an attachment.",
  bash: "Run a shell command in the sandbox.",
  write: "Create a file in the workspace repo.",
  edit: "Change a file in the workspace repo.",
  glob: "Find files by path pattern.",
  grep: "Search file contents.",
};

/**
 * Narrows a persisted or hand-edited list back to grants. Unknown tool names
 * are dropped rather than carried: an allowlist that grants something the
 * runtime cannot police is worse than one that grants nothing.
 */
export function parseGrants(value: unknown): ToolGrant[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<string>([...TEXT_TOOLS, ...BUILD_TOOLS]);

  const grants: ToolGrant[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const grant = decodeGrant(entry, known);
    if (grant) grants.push(grant);
  }
  return grants;
}

/** Drops anything the stage's type does not make available. */
export function grantsFor(type: StageType, grants: ToolGrant[]): ToolGrant[] {
  const available = new Set<string>(toolsFor(type));
  return grants.filter((g) => available.has(g.name));
}
