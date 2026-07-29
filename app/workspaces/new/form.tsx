"use client";

import { useEffect, useState } from "react";
import {
  createWorkspace,
  checkRepo,
  type RepoReadiness,
} from "@/lib/actions/workspace";
import type { InstallationRepo } from "@/lib/github/app";
import { generateWorkspaceFiles } from "@/lib/generate/workspace";
import {
  EXAMPLES,
  STARTER,
  STARTER_FIELDS,
  isUntouched,
  type StarterField,
} from "@/lib/generate/starter";
import { Wizard, type WizardStep } from "@/components/wizard";
import { FilePreview } from "@/components/config";
import {
  Chip,
  ErrorNote,
  Eyebrow,
  Field,
  Input,
  Num,
  Panel,
  Textarea,
} from "@/components/ui";

type Draft = {
  repo: string;
  name: string;
  what: string;
  voice: string;
  stack: string;
  conventions: string;
  alwaysDo: string;
  neverDo: string;
};

type Ctx = {
  repos: InstallationRepo[];
  readiness: RepoReadiness | null;
  checking: boolean;
};

const BLANK: Draft = {
  repo: "",
  name: "",
  what: "",
  voice: STARTER.voice,
  stack: "",
  conventions: STARTER.conventions,
  alwaysDo: STARTER.alwaysDo,
  neverDo: STARTER.neverDo,
};

const DRAFT_KEY = "salience:new-workspace";

const FIELD_STEP: Record<StarterField, number> = {
  voice: 2,
  conventions: 2,
  alwaysDo: 3,
  neverDo: 3,
};

const FIELD_LABEL: Record<StarterField, string> = {
  voice: "Voice and standards",
  conventions: "File and folder conventions",
  alwaysDo: "Always do",
  neverDo: "Never do",
};

export function WorkspaceForm({ repos }: { repos: InstallationRepo[] }) {
  const [repo, setRepo] = useState("");
  const [checked, setChecked] = useState<{
    repo: string;
    result: RepoReadiness;
  } | null>(null);

  // A verdict belongs to the repo it was made about, so switching repos cannot
  // leave a stale "ready" behind and there is no third state to keep in sync.
  const readiness = checked?.repo === repo ? checked.result : null;
  const checking = Boolean(repo) && readiness === null;

  useEffect(() => {
    if (!repo) return;
    const [installation, fullName] = repo.split(":");
    const [owner, name] = (fullName ?? "").split("/");

    let cancelled = false;
    checkRepo(Number(installation), owner, name)
      .then((result) => {
        if (!cancelled) setChecked({ repo, result });
      })
      .catch(() => {
        if (!cancelled) {
          setChecked({
            repo,
            result: { ok: false, reason: "GitHub could not be reached." },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo]);

  const steps: WizardStep<Draft, Ctx>[] = [
    {
      label: "Repository",
      title: "Pick the repository",
      sub: "Salience writes your structure here. Use an empty private repo.",
      blocker: ({ draft, context }) => {
        if (!draft.repo) return "Pick a repository.";
        if (context.checking) return "Still checking that repository.";
        if (!context.readiness) return "That repository has not been checked yet.";
        if (!context.readiness.ok) return context.readiness.reason;
        return null;
      },
      render: ({ draft, set, context }) => (
        <RepoStep
          repos={context.repos}
          value={draft.repo}
          onChange={(v) => set("repo", v)}
          readiness={context.readiness}
          checking={context.checking}
        />
      ),
    },
    {
      label: "Business",
      title: "Name the business",
      sub: "The workspace title, and the first line of both files.",
      blocker: ({ draft }) => {
        if (!draft.name.trim()) return "Give the workspace a name.";
        if (!draft.what.trim()) return "Add one line on what this business does.";
        return null;
      },
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <Field
            label="Workspace name"
            hint="Titles both files, and names the workspace in Salience."
          >
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={EXAMPLES.name}
            />
          </Field>
          <Field label="What this business does" hint="One line. Opens Context.md.">
            <Input
              value={draft.what}
              onChange={(e) => set("what", e.target.value)}
            />
            <span className="text-sm text-[var(--text-muted)]">
              Example: {EXAMPLES.what}
            </span>
          </Field>
        </Panel>
      ),
    },
    {
      label: "Standards",
      title: "Set the standards",
      sub: "How work should read, and what you build with.",
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <Starter
            name="voice"
            hint="How work should read, and what quality means here."
            value={draft.voice}
            onChange={(v) => set("voice", v)}
            rows={4}
          />
          <Field
            label="Tools and stack"
            hint="What you build with. Left blank, the section is omitted."
          >
            <Textarea
              value={draft.stack}
              onChange={(e) => set("stack", e.target.value)}
              rows={4}
              placeholder={EXAMPLES.stack}
            />
          </Field>
          <Starter
            name="conventions"
            hint="Naming and file rules an agent should follow unasked."
            value={draft.conventions}
            onChange={(v) => set("conventions", v)}
            rows={4}
          />
        </Panel>
      ),
    },
    {
      label: "Rules",
      title: "Write the rules",
      sub: "One per line. These become Do and Avoid.",
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <Starter
            name="alwaysDo"
            hint="One per line. Becomes the Do list in Context.md."
            value={draft.alwaysDo}
            onChange={(v) => set("alwaysDo", v)}
            rows={5}
          />
          <Starter
            name="neverDo"
            hint="One per line. Becomes the Avoid list in Context.md."
            value={draft.neverDo}
            onChange={(v) => set("neverDo", v)}
            rows={5}
          />
        </Panel>
      ),
    },
    {
      label: "Review",
      title: "Review the files",
      sub: "Exactly what gets committed. Nothing is written until you confirm.",
      render: ({ draft, goTo }) => {
        const untouched = STARTER_FIELDS.filter((f) => isUntouched(f, draft[f]));
        return (
          <div className="flex flex-col gap-[var(--s-4)]">
            {untouched.length > 0 && (
              <UneditedNote fields={untouched} onJump={goTo} />
            )}
            <FilePreview files={generateWorkspaceFiles(draft)} />
            <p className="text-sm text-[var(--text-muted)]">
              Token counts are an estimate, not a provider count.
            </p>
          </div>
        );
      },
    },
  ];

  return (
    <Wizard
      steps={steps}
      initial={BLANK}
      storageKey={DRAFT_KEY}
      action={createWorkspace}
      context={{ repos, readiness, checking }}
      submitLabel="Create workspace"
      pendingLabel="Scaffolding…"
      footnote={(draft) =>
        `Commits ${generateWorkspaceFiles(draft).length} files to ${draft.repo.split(":")[1] ?? "the repository"}.`
      }
      onDraftChange={(draft) => setRepo(draft.repo)}
    />
  );
}

/**
 * Starter fields are badged until edited, and the badge is repeated on review.
 * A generic default that ships unread is the failure mode of prefilling, so it
 * is made visible rather than assumed away.
 */
function Starter({
  name,
  hint,
  rows,
  value,
  onChange,
}: {
  name: StarterField;
  hint: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const untouched = isUntouched(name, value);
  return (
    <div className="flex flex-col gap-[var(--s-2)]">
      <div className="flex items-center gap-[var(--s-2)]">
        <span className="text-sm font-medium">{FIELD_LABEL[name]}</span>
        {untouched && <Chip>starter</Chip>}
      </div>
      <span className="text-sm text-[var(--text-muted)]">{hint}</span>
      <Textarea
        aria-label={FIELD_LABEL[name]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
    </div>
  );
}

function UneditedNote({
  fields,
  onJump,
}: {
  fields: StarterField[];
  onJump: (step: number) => void;
}) {
  return (
    <Panel className="flex flex-col gap-[var(--s-2)] border-[var(--border-strong)] p-[var(--s-4)]">
      <Eyebrow>Unedited</Eyebrow>
      <p className="text-sm text-[var(--text-dim)]">
        These arrived as a starter draft and were not changed. They commit as
        written.
      </p>
      <div className="flex flex-wrap gap-[var(--s-3)]">
        {fields.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onJump(FIELD_STEP[f])}
            className="text-sm text-[var(--accent)]"
          >
            {FIELD_LABEL[f]}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function RepoStep({
  repos,
  value,
  onChange,
  readiness,
  checking,
}: {
  repos: InstallationRepo[];
  value: string;
  onChange: (value: string) => void;
  readiness: RepoReadiness | null;
  checking: boolean;
}) {
  const selected = repos.find(
    (r) => `${r.installationId}:${r.fullName}` === value,
  );

  return (
    <div className="flex flex-col gap-[var(--s-3)]">
      <div
        role="radiogroup"
        aria-label="Repository"
        className="flex flex-col gap-[var(--s-2)]"
      >
        {repos.map((repo) => {
          const id = `${repo.installationId}:${repo.fullName}`;
          const active = id === value;
          return (
            <label
              key={id}
              className={
                "flex cursor-pointer items-center gap-[var(--s-3)] rounded-[var(--r-card)] border px-[var(--s-4)] py-[var(--s-3)] transition-colors " +
                (active
                  ? "border-[var(--accent)] bg-[var(--bg-raised)]"
                  : "border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--border-strong)]")
              }
              style={{ transitionDuration: "var(--d-micro)" }}
            >
              <input
                type="radio"
                name="repo-choice"
                value={id}
                checked={active}
                onChange={() => onChange(id)}
                className="accent-[var(--accent)]"
              />
              <Num className="text-sm">{repo.fullName}</Num>
              {!repo.private && <Chip>public</Chip>}
              {active && checking && (
                <span className="eyebrow ml-auto">checking…</span>
              )}
              {active && readiness?.ok && (
                <span className="ml-auto">
                  <Chip tone="mint">{readiness.empty ? "empty" : "ready"}</Chip>
                </span>
              )}
            </label>
          );
        })}
      </div>

      {readiness && !readiness.ok && <ErrorNote>{readiness.reason}</ErrorNote>}

      {readiness?.ok && !readiness.empty && (
        <p className="text-sm text-[var(--text-dim)]">
          This repository already has files. Salience adds four and changes
          nothing that is there.
        </p>
      )}

      {selected && !selected.private && (
        <p className="text-sm text-[var(--danger)]">
          {selected.fullName} is public. Everything Salience writes is public
          too.
        </p>
      )}
    </div>
  );
}
