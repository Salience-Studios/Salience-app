import * as React from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* Buttons. Mint is primary action only — never decoration. */
export function Button({
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--r-control)] border px-[var(--s-3)] py-[var(--s-2)] text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";
  const variants = {
    default:
      "border-[var(--border-strong)] bg-[var(--bg-raised)] text-[var(--text)] hover:bg-[var(--border)]",
    primary:
      "border-transparent bg-[var(--accent)] text-[var(--bg-base)] hover:brightness-110",
    danger:
      "border-[var(--border-strong)] bg-transparent text-[var(--danger)] hover:bg-[var(--bg-raised)]",
    ghost:
      "border-transparent bg-transparent text-[var(--text-dim)] hover:text-[var(--text)]",
  };
  return (
    <button
      {...props}
      style={{ transitionDuration: "var(--d-micro)" }}
      className={cx(base, variants[variant], className)}
    />
  );
}

export function Panel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-[var(--r-panel)] border border-[var(--border)] bg-[var(--bg-panel)]",
        className,
      )}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

/* Numerals are mono and tabular everywhere, so columns line up. */
export function Num({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "mint" | "amber" | "dim";
  className?: string;
}) {
  const tones = {
    default: "text-[var(--text)]",
    mint: "text-[var(--accent)]",
    amber: "text-[var(--warn)]",
    dim: "text-[var(--text-muted)]",
  };
  return <span className={cx("num", tones[tone], className)}>{children}</span>;
}

export function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "mint" | "amber" | "dim";
}) {
  return (
    <Panel className="p-[var(--s-4)]">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-[var(--s-2)] text-2xl">
        <Num tone={tone}>{value}</Num>
      </div>
    </Panel>
  );
}

/**
 * Wizard progress. Completed steps are clickable so a user can go back and
 * change an answer without losing the ones after it; steps ahead of the
 * current one are disabled, because they have not been validated yet.
 */
export function Steps({
  steps,
  current,
  onSelect,
}: {
  steps: readonly string[];
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Progress">
      <ol className="flex flex-wrap items-center gap-y-[var(--s-2)]">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className="mx-[var(--s-2)] h-px w-[var(--s-4)] bg-[var(--border-strong)]"
                />
              )}
              <button
                type="button"
                disabled={i > current}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className={cx(
                  "flex items-center gap-[var(--s-2)] rounded-[var(--r-chip)] transition-colors disabled:cursor-default",
                  active
                    ? "text-[var(--text)]"
                    : done
                      ? "text-[var(--text-dim)] hover:text-[var(--text)]"
                      : "text-[var(--text-muted)]",
                )}
                style={{ transitionDuration: "var(--d-micro)" }}
              >
                <span
                  aria-hidden
                  className={cx(
                    "size-2 rounded-full border",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : done
                        ? "border-[var(--accent-dim)] bg-[var(--accent-dim)]"
                        : "border-[var(--border-strong)]",
                  )}
                />
                <span className="eyebrow eyebrow-tinted hidden sm:inline">
                  {label}
                </span>
                <span className="sr-only sm:hidden">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[var(--s-2)]">
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      {hint && (
        <span className="text-sm text-[var(--text-muted)]">{hint}</span>
      )}
      {children}
    </label>
  );
}

const controlClass =
  "w-full rounded-[var(--r-control)] border border-[var(--border-strong)] bg-[var(--bg-base)] px-[var(--s-3)] py-[var(--s-2)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlClass, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cx(controlClass, "resize-y font-mono", props.className)}
    />
  );
}

export function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "mint" | "amber" | "clay";
}) {
  const tones = {
    default: "bg-[var(--border)] text-[var(--text-dim)]",
    mint: "bg-[var(--accent)] text-[var(--bg-base)]",
    amber: "bg-[var(--warn)] text-[var(--bg-base)]",
    clay: "bg-[var(--danger)] text-[var(--bg-base)]",
  };
  return (
    <span
      className={cx(
        "eyebrow inline-block rounded-[var(--r-chip)] px-[var(--s-2)] py-[2px]",
        tones[tone],
      )}
      style={{ color: tone === "default" ? undefined : "var(--bg-base)" }}
    >
      {children}
    </span>
  );
}

/* Empty states carry a line saying what the thing is — never a bare prompt. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel className="flex flex-col items-center gap-[var(--s-3)] px-[var(--s-5)] py-[var(--s-7)] text-center">
      <h2 className="heading-sm text-lg font-medium">{title}</h2>
      <p className="max-w-[46ch] text-sm text-[var(--text-dim)]">{body}</p>
      {action}
    </Panel>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--r-control)] border border-[var(--danger)] bg-[var(--bg-raised)] px-[var(--s-3)] py-[var(--s-2)] text-sm text-[var(--danger)]">
      {children}
    </p>
  );
}
