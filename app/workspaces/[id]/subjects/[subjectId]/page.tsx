import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace, readWorkspaceFile } from "@/lib/actions/workspace";
import { getSubject, listWorkflows, listStages } from "@/lib/actions/structure";
import { subjectPath } from "@/lib/generate/paths";
import {
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  Num,
  Panel,
} from "@/components/ui";

export default async function SubjectDetail({
  params,
}: {
  params: Promise<{ id: string; subjectId: string }>;
}) {
  const { id, subjectId } = await params;
  const [ws, subject] = await Promise.all([
    getWorkspace(id),
    getSubject(subjectId),
  ]);
  if (!ws || !subject || subject.workspaceId !== id) notFound();

  const contextPath = `${subjectPath(subject.slug)}/Context.md`;
  const [workflows, context] = await Promise.all([
    listWorkflows(id),
    readWorkspaceFile(id, contextPath),
  ]);

  const boards = await Promise.all(
    workflows.map(async (workflow) => ({
      workflow,
      stages: await listStages(workflow.id),
    })),
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-5)]">
        <Eyebrow>Subject</Eyebrow>
        <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
          {subject.name}
        </h1>
        <Num className="mt-[var(--s-2)] inline-block text-xs opacity-70">
          {subjectPath(subject.slug)}
        </Num>
      </header>

      <Panel className="mb-[var(--s-5)] overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-[var(--s-2)] border-b border-[var(--border)] px-[var(--s-4)] py-[var(--s-3)]">
          <Num className="text-sm">{contextPath}</Num>
          <Link href={`/workspaces/${id}/files?path=${encodeURIComponent(contextPath)}`}>
            <Button variant="ghost">Edit</Button>
          </Link>
        </header>
        {context === null ? (
          <p className="p-[var(--s-4)] text-sm text-[var(--danger)]">
            This file is missing from the repository. Re-read the repository from
            the workspace overview.
          </p>
        ) : (
          <pre className="overflow-x-auto p-[var(--s-4)] font-mono text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-dim)]">
            {context}
          </pre>
        )}
      </Panel>

      <h2 className="heading-sm mb-[var(--s-3)] text-lg font-medium">
        Workflows
      </h2>

      {boards.length === 0 ? (
        <EmptyState
          title="No workflows to run"
          body="This workspace has no workflows yet. A subject moves through a workflow's stages — create one to give this subject somewhere to go."
          action={
            <Link href={`/workspaces/${id}/workflows/new`}>
              <Button variant="primary">Create a workflow</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-[var(--s-3)] md:grid-cols-2">
          {boards.map(({ workflow, stages }) => (
            <Panel key={workflow.id} className="flex flex-col gap-[var(--s-3)] p-[var(--s-4)]">
              <div className="flex flex-wrap items-center justify-between gap-[var(--s-2)]">
                <Link
                  href={`/workspaces/${id}/workflows/${workflow.id}`}
                  className="text-base font-medium"
                >
                  {workflow.name}
                </Link>
                <Chip>{stages.length} stages</Chip>
              </div>

              {stages.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No stages yet.
                </p>
              ) : (
                <ol className="flex flex-col gap-[var(--s-2)]">
                  {stages.map((stage) => (
                    <li
                      key={stage.id}
                      className="flex items-center justify-between gap-[var(--s-3)] text-sm"
                    >
                      <span className="flex items-center gap-[var(--s-2)]">
                        <Num tone="dim" className="text-xs">
                          {String(stage.position).padStart(2, "0")}
                        </Num>
                        <Link href={`/workspaces/${id}/stages/${stage.id}`}>
                          {stage.name}
                        </Link>
                      </span>
                      <span className="eyebrow">not started</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          ))}
        </div>
      )}

      <p className="mt-[var(--s-4)] text-xs text-[var(--text-muted)]">
        Every stage reads as not started until runs exist at M3.
      </p>

      <p className="mt-[var(--s-5)] text-sm">
        <Link href={`/workspaces/${id}/subjects`}>Back to subjects</Link>
      </p>
    </main>
  );
}
