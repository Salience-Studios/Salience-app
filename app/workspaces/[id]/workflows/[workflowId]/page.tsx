import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/actions/workspace";
import { getWorkflow, listStages } from "@/lib/actions/structure";
import { parseGrants } from "@/lib/tools";
import { modelLabel } from "@/lib/models";
import {
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  Num,
  Panel,
} from "@/components/ui";
import { Reorder } from "./reorder";

export default async function WorkflowDetail({
  params,
}: {
  params: Promise<{ id: string; workflowId: string }>;
}) {
  const { id, workflowId } = await params;
  const [ws, workflow] = await Promise.all([getWorkspace(id), getWorkflow(workflowId)]);
  if (!ws || !workflow || workflow.workspaceId !== id) notFound();

  const stages = await listStages(workflowId);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-5)] flex flex-wrap items-start justify-between gap-[var(--s-3)]">
        <div>
          <Eyebrow>Workflow</Eyebrow>
          <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
            {workflow.name}
          </h1>
          {workflow.purpose && (
            <p className="mt-[var(--s-2)] text-sm text-[var(--text-dim)]">
              {workflow.purpose}
            </p>
          )}
          <Num className="mt-[var(--s-2)] inline-block text-xs opacity-70">
            {workflow.repoPath}
          </Num>
        </div>
        <Link href={`/workspaces/${id}/workflows/${workflowId}/stages/new`}>
          <Button variant="primary">New stage</Button>
        </Link>
      </header>

      {stages.length === 0 ? (
        <EmptyState
          title="No stages yet"
          body="A stage is one step with one job: a goal, the inputs it may load, and the tools it may call. Nothing outside those lists reaches the model."
          action={
            <Link href={`/workspaces/${id}/workflows/${workflowId}/stages/new`}>
              <Button variant="primary">Create stage 01</Button>
            </Link>
          }
        />
      ) : (
        <ol className="flex flex-col gap-[var(--s-3)]">
          {stages.map((stage, index) => {
            const grants = parseGrants(stage.allowedTools);
            return (
              <li key={stage.id}>
                <Panel className="flex flex-wrap items-start gap-[var(--s-4)] p-[var(--s-4)]">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-[var(--s-2)]">
                      <Num tone="dim" className="text-sm">
                        {String(stage.position).padStart(2, "0")}
                      </Num>
                      <Link
                        href={`/workspaces/${id}/stages/${stage.id}`}
                        className="text-base font-medium"
                      >
                        {stage.name}
                      </Link>
                      <Chip tone={stage.type === "build" ? "mint" : "default"}>
                        {stage.type}
                      </Chip>
                    </div>

                    {stage.goal && (
                      <p className="mt-[var(--s-2)] text-sm text-[var(--text-dim)]">
                        {stage.goal}
                      </p>
                    )}

                    <dl className="mt-[var(--s-3)] flex flex-col gap-[var(--s-2)] text-sm">
                      <div className="flex flex-wrap items-center gap-[var(--s-2)]">
                        <dt className="eyebrow">Inputs</dt>
                        <dd className="flex flex-wrap gap-[var(--s-2)]">
                          {stage.declaredInputs.length ? (
                            stage.declaredInputs.map((input) => (
                              <Chip key={input}>{input}</Chip>
                            ))
                          ) : (
                            <span className="text-[var(--text-muted)]">
                              Workspace prefix only
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="flex flex-wrap items-center gap-[var(--s-2)]">
                        <dt className="eyebrow">Tools</dt>
                        <dd className="flex flex-wrap gap-[var(--s-2)]">
                          {grants.length ? (
                            grants.map((grant) => (
                              <Chip key={grant.name}>
                                {grant.name}
                                {grant.gated ? " · asks" : ""}
                              </Chip>
                            ))
                          ) : (
                            <span className="text-[var(--text-muted)]">None</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex flex-wrap items-center gap-[var(--s-2)]">
                        <dt className="eyebrow">Model</dt>
                        <dd className="text-[var(--text-dim)]">
                          {modelLabel(stage.defaultModel)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <Reorder
                    stageId={stage.id}
                    canMoveUp={index > 0}
                    canMoveDown={index < stages.length - 1}
                  />
                </Panel>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-[var(--s-4)] text-xs text-[var(--text-muted)]">
        A tool marked <span className="num">asks</span> pauses the run for
        approval every time it is called.
      </p>

      <p className="mt-[var(--s-5)] text-sm">
        <Link href={`/workspaces/${id}`}>Back to workspace</Link>
      </p>
    </main>
  );
}
