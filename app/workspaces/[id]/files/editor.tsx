"use client";

import { useActionState, useMemo, useState } from "react";
import { saveWorkspaceFile } from "@/lib/actions/workspace";
import { estimateTokens, thresholdState } from "@/lib/tokens";
import { Button, Chip, ErrorNote, Num, Panel } from "@/components/ui";

export function FileEditor({
  workspaceId,
  path,
  initial,
  threshold,
}: {
  workspaceId: string;
  path: string;
  initial: string;
  threshold: number;
}) {
  const [content, setContent] = useState(initial);
  const [state, action, pending] = useActionState(saveWorkspaceFile, undefined);

  const tokens = useMemo(() => estimateTokens(content), [content]);
  const lines = useMemo(() => content.split("\n").length, [content]);
  const level = thresholdState(tokens, threshold);
  const dirty = content !== initial;

  return (
    <form action={action} className="flex flex-col gap-[var(--s-3)]">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="path" value={path} />

      <Panel className="p-[var(--s-1)]">
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          rows={24}
          className="w-full resize-y rounded-[var(--r-card)] bg-[var(--bg-base)] p-[var(--s-4)] font-mono text-sm leading-relaxed text-[var(--text)] focus:outline-none"
        />
      </Panel>

      <div className="flex flex-wrap items-center gap-[var(--s-3)]">
        <span className="text-sm text-[var(--text-muted)]">
          ≈<Num tone={level === "ok" ? "dim" : "amber"}> {tokens}</Num> tokens
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          <Num tone="dim">{lines}</Num> lines
        </span>
        {level === "warn" && (
          <Chip tone="amber">Over {threshold} tokens</Chip>
        )}
        {level === "over" && (
          <Chip tone="clay">Over {threshold * 2} tokens</Chip>
        )}
      </div>

      {level !== "ok" && (
        <p className="text-sm text-[var(--text-dim)]">
          Short files are the point. A long instruction file is loaded on every
          run of this stage, so it costs on every run. Consider splitting it.
        </p>
      )}

      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      {state?.ok && !dirty && (
        <p className="text-sm text-[var(--accent)]">Committed.</p>
      )}

      <div className="flex items-center gap-[var(--s-3)]">
        <Button variant="primary" type="submit" disabled={pending || !dirty}>
          {pending ? "Committing…" : "Save and commit"}
        </Button>
        {dirty && (
          <span className="text-sm text-[var(--text-muted)]">
            Unsaved changes
          </span>
        )}
      </div>
    </form>
  );
}
