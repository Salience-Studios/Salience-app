"use client";

import { createWorkflow } from "@/lib/actions/structure";
import { generateWorkflowFiles } from "@/lib/generate/workflow";
import { workflowPath } from "@/lib/generate/paths";
import { Wizard, type WizardStep } from "@/components/wizard";
import { FilePreview } from "@/components/config";
import { Field, Input, Num, Panel } from "@/components/ui";

type Draft = { workspaceId: string; name: string; purpose: string };

export function WorkflowForm({ workspaceId }: { workspaceId: string }) {
  const steps: WizardStep<Draft, undefined>[] = [
    {
      label: "Workflow",
      title: "Name the workflow",
      sub: "A repeatable workflow. Stages go inside it.",
      blocker: ({ draft }) => {
        if (!draft.name.trim()) return "Give the workflow a name.";
        if (!draft.purpose.trim()) return "Add one line on what it is for.";
        return null;
      },
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <Field
            label="Workflow name"
            hint="Becomes the folder. Spaces become underscores."
          >
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Web Design"
            />
            {draft.name.trim() && (
              <span className="text-sm text-[var(--text-muted)]">
                Folder: <Num className="text-xs">{workflowPath(draft.name)}</Num>
              </span>
            )}
          </Field>
          <Field label="Purpose" hint="One line. What this workflow is for.">
            <Input
              value={draft.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="Design and ship a client's marketing site."
            />
          </Field>
        </Panel>
      ),
    },
    {
      label: "Review",
      title: "Review the file",
      sub: "One file. Stages are added after this.",
      render: ({ draft }) => (
        <FilePreview
          files={generateWorkflowFiles({
            id: "(assigned on save)",
            name: draft.name,
            purpose: draft.purpose,
            position: 1,
          })}
        />
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      initial={{ workspaceId, name: "", purpose: "" }}
      storageKey={`salience:new-workflow:${workspaceId}`}
      action={createWorkflow}
      context={undefined}
      submitLabel="Create workflow"
      pendingLabel="Committing…"
      footnote={() => "Commits one file. The id is assigned on save."}
    />
  );
}
