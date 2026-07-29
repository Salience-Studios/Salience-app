"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reconcileWorkspace } from "@/lib/actions/structure";
import type { ReconcileReport } from "@/lib/github/reconcile";
import { Button, Eyebrow, Num, Panel } from "@/components/ui";

/**
 * Drift is a real state, not an edge case — the user can edit files directly on
 * GitHub, which is a feature of putting content in git. Reconciliation is
 * re-read and replace: git wins, and anything that no longer parses as
 * structure is surfaced rather than silently dropped.
 */
export function Reconcile({
  workspaceId,
  drifted,
}: {
  workspaceId: string;
  drifted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<ReconcileReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await reconcileWorkspace(workspaceId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setReport(result);
      router.refresh();
    });
  }

  if (!drifted && !report && !error) {
    return (
      <div className="flex flex-wrap items-center gap-[var(--s-3)]">
        <Button type="button" onClick={run} disabled={pending}>
          {pending ? "Re-reading…" : "Re-read repository"}
        </Button>
        <span className="text-sm text-[var(--text-muted)]">
          The repository is the source of truth. This rebuilds the index from it.
        </span>
      </div>
    );
  }

  return (
    <Panel
      className={`flex flex-col gap-[var(--s-3)] p-[var(--s-4)] ${
        drifted ? "border-[var(--accent-dim)]" : ""
      }`}
    >
      <Eyebrow>{drifted ? "Repository changed" : "Reconciliation"}</Eyebrow>

      {drifted && !report && (
        <p className="text-sm text-[var(--text-dim)]">
          This repository has commits Salience has not read. Re-read it to
          rebuild the index — the repository wins every conflict.
        </p>
      )}

      {report && (
        <div className="flex flex-col gap-[var(--s-2)]">
          <p className="text-sm text-[var(--text-dim)]">
            Index rebuilt from the repository:{" "}
            <Num>{report.systems}</Num> systems, <Num>{report.stages}</Num>{" "}
            stages, <Num>{report.subjects}</Num> subjects.
          </p>
          {report.issues.length > 0 && (
            <div className="flex flex-col gap-[var(--s-1)]">
              <span className="eyebrow">Not read as structure</span>
              {report.issues.map((issue) => (
                <span key={issue} className="text-sm text-[var(--danger)]">
                  {issue}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div>
        <Button type="button" onClick={run} disabled={pending}>
          {pending ? "Re-reading…" : "Re-read repository"}
        </Button>
      </div>
    </Panel>
  );
}
