"use client";

import * as React from "react";
import type { FileWrite } from "@/lib/github/repo";
import { estimateTokens } from "@/lib/tokens";
import { Chip, Num, Panel } from "@/components/ui";

/**
 * The review step. Every config form ends by showing the exact bytes that will
 * be committed — the product's claim is that the repo is the structure, and a
 * form that hides its output asks the user to take that on faith.
 */
export function FilePreview({ files }: { files: FileWrite[] }) {
  const written = files.filter((f) => f.content);
  const placeholders = files.filter((f) => !f.content);

  return (
    <div className="flex flex-col gap-[var(--s-4)]">
      {written.map((file) => (
        <Panel key={file.path} className="overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-[var(--s-2)] border-b border-[var(--border)] px-[var(--s-4)] py-[var(--s-3)]">
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

      {placeholders.length > 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Also created empty:{" "}
          {placeholders.map((f) => f.path).join(", ")}
        </p>
      )}
    </div>
  );
}

export function CheckList({
  options,
  selected,
  onToggle,
  label,
}: {
  options: { value: string; label: string; hint?: string; note?: string }[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  label: string;
}) {
  return (
    <fieldset className="flex flex-col gap-[var(--s-2)]">
      <legend className="mb-[var(--s-2)] text-sm font-medium">{label}</legend>
      {options.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Nothing available to declare yet.
        </p>
      )}
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={
              "flex cursor-pointer items-start gap-[var(--s-3)] rounded-[var(--r-card)] border px-[var(--s-4)] py-[var(--s-3)] transition-colors " +
              (checked
                ? "border-[var(--accent)] bg-[var(--bg-raised)]"
                : "border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--border-strong)]")
            }
            style={{ transitionDuration: "var(--d-micro)" }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onToggle(option.value, e.target.checked)}
              className="mt-[3px] accent-[var(--accent)]"
            />
            <span className="flex flex-col gap-[var(--s-1)]">
              <span className="flex flex-wrap items-center gap-[var(--s-2)] text-sm">
                <Num className="text-sm">{option.label}</Num>
                {option.note && <Chip>{option.note}</Chip>}
              </span>
              {option.hint && (
                <span className="text-sm text-[var(--text-muted)]">
                  {option.hint}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function Choice({
  options,
  value,
  onChange,
  label,
  name,
}: {
  options: { value: string; label: string; hint: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  name: string;
}) {
  return (
    <fieldset className="flex flex-col gap-[var(--s-2)]">
      <legend className="mb-[var(--s-2)] text-sm font-medium">{label}</legend>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={
              "flex cursor-pointer items-start gap-[var(--s-3)] rounded-[var(--r-card)] border px-[var(--s-4)] py-[var(--s-3)] transition-colors " +
              (active
                ? "border-[var(--accent)] bg-[var(--bg-raised)]"
                : "border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--border-strong)]")
            }
            style={{ transitionDuration: "var(--d-micro)" }}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="mt-[3px] accent-[var(--accent)]"
            />
            <span className="flex flex-col gap-[var(--s-1)]">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-sm text-[var(--text-muted)]">
                {option.hint}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
