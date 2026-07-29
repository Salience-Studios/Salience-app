import type { FileWrite } from "@/lib/github/repo";
import { writeFrontMatter } from "./frontmatter";
import { workflowPath } from "./paths";

export type WorkflowConfig = {
  id: string;
  name: string;
  /** One line. What this workflow is for. */
  purpose: string;
  position: number;
};

/**
 * A workflow's file carries its identity and nothing else that a folder
 * already says. It deliberately does not list its stages: that would have to
 * be rewritten on every stage added, renamed, or reordered, and a duplicated
 * list is a drift source rather than a convenience. The numbered folders
 * beside it are the list.
 */
export function generateWorkflowFiles(config: WorkflowConfig): FileWrite[] {
  const dir = workflowPath(config.name);

  const context =
    writeFrontMatter({
      salience: "workflow",
      id: config.id,
      name: config.name,
      purpose: config.purpose,
      position: config.position,
    }) +
    `# ${config.name}\n\n` +
    (config.purpose.trim() ? `## Purpose\n${config.purpose.trim()}\n\n` : "") +
    `Stages are the numbered folders beside this file. One job each, one output each, in order.\n`;

  return [{ path: `${dir}/Context.md`, content: context }];
}
