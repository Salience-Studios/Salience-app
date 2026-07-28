"use client";

import { useActionState } from "react";
import { createWorkspace } from "@/lib/actions/workspace";
import type { InstallationRepo } from "@/lib/github/app";
import {
  Button,
  ErrorNote,
  Field,
  Input,
  Panel,
  Textarea,
} from "@/components/ui";

const selectClass =
  "w-full rounded-[var(--r-control)] border border-[var(--border-strong)] bg-[var(--bg-base)] px-[var(--s-3)] py-[var(--s-2)] text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none";

export function WorkspaceForm({ repos }: { repos: InstallationRepo[] }) {
  const [state, action, pending] = useActionState(createWorkspace, undefined);

  return (
    <form action={action} className="flex flex-col gap-[var(--s-5)]">
      <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
        <Field
          label="Repository"
          hint="Where the structure gets written. Use an empty private repository."
        >
          <select name="repo" required className={selectClass}>
            {repos.map((r) => (
              <option
                key={`${r.installationId}:${r.fullName}`}
                value={`${r.installationId}:${r.fullName}`}
              >
                {r.fullName}
                {r.private ? "" : "  (public)"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Workspace name">
          <Input name="name" required placeholder="Northbeam Studio" />
        </Field>

        <Field
          label="What this business does"
          hint="One line. Becomes the opening of Context.md."
        >
          <Input name="what" placeholder="We build and run e-commerce brand sites." />
        </Field>
      </Panel>

      <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
        <Field
          label="Voice and standards"
          hint="How work should read and what quality means here."
        >
          <Textarea name="voice" rows={3} />
        </Field>

        <Field label="Tools and stack" hint="What you build with.">
          <Textarea name="stack" rows={3} />
        </Field>

        <Field
          label="File and folder conventions"
          hint="Naming rules an agent should follow without being asked."
        >
          <Textarea name="conventions" rows={3} />
        </Field>
      </Panel>

      <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
        <Field label="Always do" hint="One per line.">
          <Textarea name="alwaysDo" rows={4} />
        </Field>
        <Field label="Never do" hint="One per line.">
          <Textarea name="neverDo" rows={4} />
        </Field>
      </Panel>

      {state?.error && <ErrorNote>{state.error}</ErrorNote>}

      <div className="flex items-center gap-[var(--s-3)]">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? "Scaffolding…" : "Create workspace"}
        </Button>
        <span className="text-sm text-[var(--text-muted)]">
          Writes four files in one commit.
        </span>
      </div>
    </form>
  );
}
