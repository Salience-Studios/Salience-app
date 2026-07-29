"use client";

import { createSubject } from "@/lib/actions/structure";
import { generateSubjectFiles, subjectSlug } from "@/lib/generate/subject";
import { subjectPath } from "@/lib/generate/paths";
import { Wizard, type WizardStep } from "@/components/wizard";
import { FilePreview } from "@/components/config";
import { Field, Input, Num, Panel, Textarea } from "@/components/ui";

type Draft = {
  workspaceId: string;
  name: string;
  what: string;
  facts: string;
  constraints: string;
};

export function SubjectForm({ workspaceId }: { workspaceId: string }) {
  const steps: WizardStep<Draft, undefined>[] = [
    {
      label: "Subject",
      title: "Name the subject",
      sub: "The client, project, or period a pass through a workflow is about.",
      blocker: ({ draft }) => {
        if (!draft.name.trim()) return "Give the subject a name.";
        if (!draft.what.trim()) return "Add one line on what this subject is.";
        return null;
      },
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <Field label="Subject name" hint="Becomes the folder and the title.">
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Northbeam Coffee"
            />
            {draft.name.trim() && (
              <span className="text-sm text-[var(--text-muted)]">
                Folder:{" "}
                <Num className="text-xs">
                  {subjectPath(subjectSlug(draft.name))}
                </Num>
              </span>
            )}
          </Field>
          <Field label="What this subject is" hint="One line.">
            <Input
              value={draft.what}
              onChange={(e) => set("what", e.target.value)}
              placeholder="A DTC coffee brand launching a subscription."
            />
          </Field>
        </Panel>
      ),
    },
    {
      label: "Context",
      title: "What every stage should know",
      sub: "Read only by a stage that declares this subject as an input.",
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <Field label="Facts" hint="One per line. Things that do not change.">
            <Textarea
              value={draft.facts}
              onChange={(e) => set("facts", e.target.value)}
              rows={5}
              placeholder={"Shopify Plus.\nBrand palette is fixed.\nUS only."}
            />
          </Field>
          <Field
            label="Constraints and blockers"
            hint="One per line. What limits the work."
          >
            <Textarea
              value={draft.constraints}
              onChange={(e) => set("constraints", e.target.value)}
              rows={5}
              placeholder={"No access to their analytics yet.\nLegal reviews all copy."}
            />
          </Field>
        </Panel>
      ),
    },
    {
      label: "Review",
      title: "Review the file",
      sub: "Exactly what gets committed.",
      render: ({ draft }) => (
        <FilePreview
          files={generateSubjectFiles({
            id: "(assigned on save)",
            name: draft.name,
            slug: subjectSlug(draft.name),
            what: draft.what,
            facts: draft.facts,
            constraints: draft.constraints,
          })}
        />
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      initial={{
        workspaceId,
        name: "",
        what: "",
        facts: "",
        constraints: "",
      }}
      storageKey={`salience:new-subject:${workspaceId}`}
      action={createSubject}
      context={undefined}
      submitLabel="Create subject"
      pendingLabel="Committing…"
      footnote={(draft) =>
        `Commits one file to ${subjectPath(subjectSlug(draft.name))}.`
      }
    />
  );
}
