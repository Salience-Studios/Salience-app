"use client";

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button, ErrorNote, Steps } from "@/components/ui";

/**
 * The config-form shell.
 *
 * Every config form in Salience asks a user to author a file they have not
 * seen, so they all work the same way: short steps, prefilled where a default
 * is honest, and a final step that renders the exact bytes that will be
 * committed. Sharing the shell is what keeps that promise from drifting apart
 * across four forms.
 *
 * The draft lives here and is persisted, because these forms sit between the
 * user and a commit to their own repository — losing four steps of answers to
 * a stray reload is the most likely way to abandon one.
 */

export type DraftValue = string | string[];
export type Draft = Record<string, DraftValue>;

export type StepContext<T extends Draft, C> = {
  draft: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  context: C;
  /** Jump to another step — the review step uses it to send a user back. */
  goTo: (step: number) => void;
};

export type WizardStep<T extends Draft, C> = {
  /** Short label for the progress rail. */
  label: string;
  title: string;
  sub: string;
  render: (ctx: StepContext<T, C>) => React.ReactNode;
  /** What stops this step advancing, phrased as the fix. */
  blocker?: (ctx: StepContext<T, C>) => string | null;
};

export function Wizard<T extends Draft, C = undefined>({
  steps,
  initial,
  storageKey,
  action,
  context,
  submitLabel,
  pendingLabel,
  footnote,
  onDraftChange,
}: {
  steps: WizardStep<T, C>[];
  initial: T;
  storageKey: string;
  action: (prev: unknown, formData: FormData) => Promise<{ error: string } | undefined>;
  context: C;
  submitLabel: string;
  pendingLabel: string;
  footnote?: (draft: T) => string;
  onDraftChange?: (draft: T) => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<T>(initial);
  const [showError, setShowError] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  function set<K extends keyof T>(key: K, value: T[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setShowError(false);
  }

  // Cannot be a lazy useState initializer: sessionStorage does not exist
  // during the server render, and reading it only on the client would make the
  // two renders disagree. Syncing from an external store is what an effect is
  // for.
  useEffect(() => {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({ ...initial, ...(JSON.parse(raw) as Partial<T>) });
    } catch {
      sessionStorage.removeItem(storageKey);
    }
    // Restoring runs once per form, not on every draft change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(draft));
    onDraftChange?.(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, storageKey]);

  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    else mounted.current = true;
  }, [step]);

  // A rejected commit must not take the answers with it.
  useEffect(() => {
    if (state?.error) sessionStorage.setItem(storageKey, JSON.stringify(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const ctx: StepContext<T, C> = { draft, set, context, goTo: setStep };
  const current = steps[step];
  const blocker = current.blocker?.(ctx) ?? null;
  const last = step === steps.length - 1;

  function next() {
    if (blocker) {
      setShowError(true);
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || last) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
    e.preventDefault();
    next();
  }

  return (
    <div onKeyDown={onKeyDown} className="flex flex-col gap-[var(--s-5)]">
      <div className="flex flex-col gap-[var(--s-2)]">
        <Steps steps={steps.map((s) => s.label)} current={step} onSelect={setStep} />
        <span className="eyebrow sm:hidden">
          Step {step + 1} of {steps.length} — {current.label}
        </span>
      </div>

      <section key={step} className="step-in flex flex-col gap-[var(--s-4)]">
        <header className="flex flex-col gap-[var(--s-1)]">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="heading-sm text-xl font-semibold focus:outline-none"
          >
            {current.title}
          </h2>
          <p className="text-sm text-[var(--text-dim)]">{current.sub}</p>
        </header>

        {current.render(ctx)}

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
            action={formAction}
            onSubmit={() => sessionStorage.removeItem(storageKey)}
          >
            {hiddenInputs(draft)}
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </form>
        ) : (
          <Button variant="primary" type="button" onClick={next}>
            Continue
          </Button>
        )}

        <span className="text-sm text-[var(--text-muted)]">
          {last
            ? (footnote?.(draft) ?? "")
            : "Answers are kept if you leave and come back."}
        </span>
      </div>
    </div>
  );
}

/** A repeated field name is how FormData carries a list. */
function hiddenInputs(draft: Draft) {
  return Object.entries(draft).flatMap(([key, value]) =>
    Array.isArray(value)
      ? value.map((v, i) => (
          <input key={`${key}:${i}`} type="hidden" name={key} value={v} />
        ))
      : [<input key={key} type="hidden" name={key} value={value} />],
  );
}
