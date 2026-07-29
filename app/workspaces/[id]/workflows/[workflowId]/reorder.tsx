"use client";

import { useTransition } from "react";
import { moveStage } from "@/lib/actions/structure";
import { Button } from "@/components/ui";

/**
 * Reorder with buttons rather than drag.
 *
 * 02 specifies "reorder by drag". Buttons are a deviation, taken deliberately:
 * a stage move rewrites folder paths in the repository, so the operation is a
 * commit rather than a cosmetic sort — and it has to be reachable by keyboard
 * and on touch, which native HTML drag is not. Drag can be added on top of this
 * later; the commit is the part that has to be right.
 */
export function Reorder({
  stageId,
  canMoveUp,
  canMoveDown,
}: {
  stageId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-[var(--s-1)]">
      <Button
        type="button"
        variant="ghost"
        aria-label="Move stage earlier"
        disabled={!canMoveUp || pending}
        onClick={() => startTransition(() => moveStage(stageId, -1))}
      >
        ↑
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label="Move stage later"
        disabled={!canMoveDown || pending}
        onClick={() => startTransition(() => moveStage(stageId, 1))}
      >
        ↓
      </Button>
    </div>
  );
}
