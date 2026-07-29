"use client";

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createWorkspace,
  checkRepo,
  type RepoReadiness,
} from "@/lib/actions/workspace";
import type { InstallationRepo } from "@/lib/github/app";
import {
  generateWorkspaceFiles,
  type WorkspaceConfig,
} from "@/lib/generate/workspace";
import {
  EXAMPLES,
  STARTER,
  STARTER_FIELDS,
  isUntouched,
  type StarterField as StarterFieldName,
} from "@/lib/generate/starter";
import { estimateTokens } from "@/lib/tokens";
import {
  Button,
  Chip,
  ErrorNote,
  Eyebrow,
  Field,
  Input,
  Num,
  Panel,
  Steps,
  Textarea,
} from "@/components/ui";

type Draft = WorkspaceConfig & { repo: string };

const STEPS = [
  "Repository",
  "Business",
  "Standards",
  "Rules",
  "Review",
] as const;

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

/**
 * The draft survives a reload. Installing the App on another repository is a
 * trip to GitHub, and losing four steps of answers to it would be the single
 * most likely way to abandon this form.
 */
const DRAFT_KEY = "salience:new-workspace";

const FIELD_STEP: Record<string, number> = {
  name: 1,
  what: 1,
  voice: 2,
  stack: 2,
  conventions: 2,
  alwaysDo: 3,
  neverDo: 3,
};

const FIELD_LABEL: Record<string, string> = {
  voice: "Voice and standards",
  stack: "Tools and stack",
  conventions: "File and folder conventions",
  alwaysDo: "Always do",
  neverDo: "Never do",
};

export function WorkspaceForm({ repos }: { repos: InstallationRepo[] }) {
  const [state, action, pending] = useActionState(createWorkspace, undefined);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [checked, setChecked] = useState<{
    repo: string;
    result: RepoReadiness;
  } | null>(null);
  const [showError, setShowError] = useState(false);

  // A verdict belongs to the repo it was made about. Deriving both of these
  // rather than storing them means switching repos cannot leave a stale
  // "ready" behind, and there is no third state to keep in sync.
  const readiness = checked?.repo === draft.repo ? checked.result : null;
  const checking = Boolean(draft.repo) && readiness === null;

  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setShowError(false);
  }

  // Restore a draft from a previous visit. This cannot be a lazy useState
  // initializer: sessionStorage does not exist during the server render, and
  // reading it only on the client would make the two renders disagree. Syncing
  // React state from an external store on mount is what an effect is for.
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({ ...BLANK, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  // Validate the repository on selection and on restore — the same check
  // either way, so a restored draft never carries an unverified repo forward.
  useEffect(() => {
    const repo = draft.repo;
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
  }, [draft.repo]);

  // Move focus to the new step's heading, but never on first paint.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    else mounted.current = true;
  }, [step]);

  // A rejected commit must not take the answers with it.
  useEffect(() => {
    if (state?.error) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const blocker = stepBlocker(step, draft, readiness, checking);
  const last = step === STEPS.length - 1;

  function next() {
    if (blocker) {
      setShowError(true);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || last) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
    e.preventDefault();
    next();
  }

  // The .gitkeep entries are real commits but have nothing to preview.
  const allFiles = generateWorkspaceFiles(draft);
  const files = allFiles.filter((f) => f.content);
  const untouched = STARTER_FIELDS.filter((f) => isUntouched(f, draft[f]));

  return (
    <div onKeyDown={onKeyDown} className="flex flex-col gap-[var(--s-5)]">
      <div className="flex flex-col gap-[var(--s-2)]">
        <Steps steps={STEPS} current={step} onSelect={setStep} />
        <span className="eyebrow sm:hidden">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </span>
      </div>

      <section key={step} className="step-in flex flex-col gap-[var(--s-4)]">
        <header className="flex flex-col gap-[var(--s-1)]">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="heading-sm text-xl font-semibold focus:outline-none"
          >
            {HEADINGS[step].title}
          </h2>
          <p className="text-sm text-[var(--text-dim)]">
            {HEADINGS[step].sub}
          </p>
        </header>

        {step === 0 && (
          <RepoStep
            repos={repos}
            value={draft.repo}
            onChange={(v) => set("repo", v)}
            readiness={readiness}
            checking={checking}
          />
        )}

        {step === 1 && (
          <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
            <Field
              label="Workspace name"
              hint="Titles both files, and names the workspace in Salience."
            >
              <Input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={EXAMPLES.name}
                autoFocus
              />
            </Field>
            <Field
              label="What this business does"
              hint="One line. Opens Context.md."
            >
              <Input
                value={draft.what}
                onChange={(e) => set("what", e.target.value)}
              />
              <Example>{EXAMPLES.what}</Example>
            </Field>
          </Panel>
        )}

        {step === 2 && (
          <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
            <StarterField
              name="voice"
              hint="How work should read, and what quality means here."
              draft={draft}
              set={set}
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
            <StarterField
              name="conventions"
              hint="Naming and file rules an agent should follow unasked."
              draft={draft}
              set={set}
              rows={4}
            />
          </Panel>
        )}

        {step === 3 && (
          <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
            <StarterField
              name="alwaysDo"
              hint="One per line. Becomes the Do list in Context.md."
              draft={draft}
              set={set}
              rows={5}
            />
            <StarterField
              name="neverDo"
              hint="One per line. Becomes the Avoid list in Context.md."
              draft={draft}
              set={set}
              rows={5}
            />
          </Panel>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-[var(--s-4)]">
            {untouched.length > 0 && (
              <Panel className="flex flex-col gap-[var(--s-2)] border-[var(--border-strong)] p-[var(--s-4)]">
                <Eyebrow>Unedited</Eyebrow>
                <p className="text-sm text-[var(--text-dim)]">
                  These arrived as a starter draft and were not changed. They
                  commit as written.
                </p>
                <div className="flex flex-wrap gap-[var(--s-2)]">
                  {untouched.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStep(FIELD_STEP[f])}
                      className="text-sm text-[var(--accent)]"
                    >
                      {FIELD_LABEL[f]}
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {files.map((file) => (
              <Panel key={file.path} className="overflow-hidden">
                <header className="flex items-center justify-between border-b border-[var(--border)] px-[var(--s-4)] py-[var(--s-3)]">
                  <Num className="text-sm">{file.path}</Num>
                  <span className="eyebrow">
                    ~{estimateTokens(file.content).toLocaleString()} tokens est.
                  </span>
                </header>
                <pre className="overflow-x-auto p-[var(--s-4)] font-mono text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-dim)]">
                  {file.content}
                </pre>
              </Panel>
            ))}

            <p className="text-sm text-[var(--text-muted)]">
              <Num>Systems/</Num> and <Num>Subjects/</Num> are created empty.
              Token counts are an estimate, not a provider count.
            </p>
          </div>
        )}

        {showError && blocker && <ErrorNote>{blocker}</ErrorNote>}
        {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      </section>

      <div className="flex flex-wrap items-center gap-[var(--s-3)]">
        {step > 0 && (
          <Button type="button" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}

        {last ? (
          <form
            action={action}
            onSubmit={() => sessionStorage.removeItem(DRAFT_KEY)}
          >
            {Object.entries(draft).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Scaffolding…" : "Create workspace"}
            </Button>
          </form>
        ) : (
          <Button variant="primary" type="button" onClick={next}>
            Continue
          </Button>
        )}

        <span className="text-sm text-[var(--text-muted)]">
          {last
            ? `Commits ${allFiles.length} files to ${draft.repo.split(":")[1]}.`
            : "Answers are kept if you leave and come back."}
        </span>
      </div>
    </div>
  );
}

const HEADINGS = [
  {
    title: "Pick the repository",
    sub: "Salience writes your structure here. Use an empty private repo.",
  },
  {
    title: "Name the business",
    sub: "The workspace title, and the first line of both files.",
  },
  {
    title: "Set the standards",
    sub: "How work should read, and what you build with.",
  },
  {
    title: "Write the rules",
    sub: "One per line. These become Do and Avoid.",
  },
  {
    title: "Review the files",
    sub: "Exactly what gets committed. Nothing is written until you confirm.",
  },
];

/** What stops this step advancing, stated as the fix. */
function stepBlocker(
  step: number,
  draft: Draft,
  readiness: RepoReadiness | null,
  checking: boolean,
): string | null {
  if (step === 0) {
    if (!draft.repo) return "Pick a repository.";
    if (checking) return "Still checking that repository.";
    if (!readiness) return "That repository has not been checked yet.";
    if (!readiness.ok) return readiness.reason;
  }
  if (step === 1) {
    if (!draft.name.trim()) return "Give the workspace a name.";
    if (!draft.what.trim()) return "Add one line on what this business does.";
  }
  return null;
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm text-[var(--text-muted)]">
      Example: {children}
    </span>
  );
}

/** A prefilled field, badged until the user edits it. */
function StarterField({
  name,
  hint,
  rows,
  draft,
  set,
}: {
  name: StarterFieldName;
  hint: string;
  rows: number;
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const untouched = isUntouched(name, draft[name]);
  return (
    <div className="flex flex-col gap-[var(--s-2)]">
      <div className="flex items-center gap-[var(--s-2)]">
        <span className="text-sm font-medium">{FIELD_LABEL[name]}</span>
        {untouched && <Chip>starter</Chip>}
      </div>
      <span className="text-sm text-[var(--text-muted)]">{hint}</span>
      <Textarea
        aria-label={FIELD_LABEL[name]}
        value={draft[name]}
        onChange={(e) => set(name, e.target.value)}
        rows={rows}
      />
    </div>
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
  const selected = repos.find((r) => `${r.installationId}:${r.fullName}` === value);

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
