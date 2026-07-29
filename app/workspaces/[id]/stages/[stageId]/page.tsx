import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/actions/workspace";
import { getStage, getSystem, readStageFile } from "@/lib/actions/structure";
import { estimateTokens } from "@/lib/tokens";
import { modelLabel } from "@/lib/models";
import { parseGrants } from "@/lib/tools";
import {
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  Num,
  Panel,
} from "@/components/ui";

export default async function StageDetail({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  const { id, stageId } = await params;
  const stage = await getStage(stageId);
  if (!stage) notFound();

  const [ws, system] = await Promise.all([
    getWorkspace(id),
    getSystem(stage.systemId),
  ]);
  if (!ws || !system || system.workspaceId !== id) notFound();

  const [context, references] = await Promise.all([
    readStageFile(stageId, "Context.md"),
    readStageFile(stageId, "References.md"),
  ]);

  const grants = parseGrants(stage.allowedTools);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-5)]">
        <Eyebrow>{system.name}</Eyebrow>
        <h1 className="heading-lg mt-[var(--s-1)] flex flex-wrap items-center gap-[var(--s-3)] text-2xl font-semibold">
          <Num tone="dim" className="text-xl">
            {String(stage.position).padStart(2, "0")}
          </Num>
          {stage.name}
          <Chip tone={stage.type === "build" ? "mint" : "default"}>
            {stage.type}
          </Chip>
        </h1>
        {stage.goal && (
          <p className="mt-[var(--s-2)] text-sm text-[var(--text-dim)]">
            {stage.goal}
          </p>
        )}
      </header>

      <section className="mb-[var(--s-5)] grid grid-cols-2 gap-[var(--s-3)] md:grid-cols-4">
        <Panel className="p-[var(--s-4)]">
          <Eyebrow>Model</Eyebrow>
          <div className="mt-[var(--s-2)] text-sm">
            {modelLabel(stage.defaultModel)}
          </div>
        </Panel>
        <Panel className="p-[var(--s-4)]">
          <Eyebrow>Tool ceiling</Eyebrow>
          <div className="mt-[var(--s-2)] text-2xl">
            <Num>{stage.toolCeilingTokens.toLocaleString()}</Num>
          </div>
        </Panel>
        <Panel className="p-[var(--s-4)]">
          <Eyebrow>Inputs</Eyebrow>
          <div className="mt-[var(--s-2)] text-2xl">
            <Num tone={stage.declaredInputs.length ? "default" : "dim"}>
              {stage.declaredInputs.length}
            </Num>
          </div>
        </Panel>
        <Panel className="p-[var(--s-4)]">
          <Eyebrow>Tools</Eyebrow>
          <div className="mt-[var(--s-2)] text-2xl">
            <Num tone={grants.length ? "default" : "dim"}>{grants.length}</Num>
          </div>
        </Panel>
      </section>

      <div className="flex flex-col gap-[var(--s-4)]">
        <FilePane
          workspaceId={id}
          path={`${stage.repoPath}/Context.md`}
          content={context}
        />
        <FilePane
          workspaceId={id}
          path={`${stage.repoPath}/References.md`}
          content={references}
        />

        <section>
          <h2 className="heading-sm mb-[var(--s-3)] text-lg font-medium">
            Runs
          </h2>
          <EmptyState
            title="No runs yet"
            body="A run is one execution of this stage for one subject. Running stages arrives at M3, with the composer that prices the run before it is sent."
          />
        </section>

        <section>
          <h2 className="heading-sm mb-[var(--s-3)] text-lg font-medium">
            Outputs
          </h2>
          <EmptyState
            title="No outputs yet"
            body="An approved run result is committed here and mirrored to the subject's folder. Nothing is written until a run is approved."
          />
        </section>
      </div>

      <p className="mt-[var(--s-5)] text-sm">
        <Link href={`/workspaces/${id}/systems/${system.id}`}>
          Back to {system.name}
        </Link>
      </p>
    </main>
  );
}

function FilePane({
  workspaceId,
  path,
  content,
}: {
  workspaceId: string;
  path: string;
  content: string | null;
}) {
  return (
    <Panel className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-[var(--s-2)] border-b border-[var(--border)] px-[var(--s-4)] py-[var(--s-3)]">
        <Num className="text-sm">{path}</Num>
        <div className="flex items-center gap-[var(--s-3)]">
          {content && (
            <span className="eyebrow">
              ~{estimateTokens(content).toLocaleString()} tokens est.
            </span>
          )}
          <Link
            href={`/workspaces/${workspaceId}/files?path=${encodeURIComponent(path)}`}
          >
            <Button variant="ghost">Edit</Button>
          </Link>
        </div>
      </header>

      {content === null ? (
        <p className="p-[var(--s-4)] text-sm text-[var(--danger)]">
          This file is missing from the repository. Re-read the repository from
          the workspace overview, or recreate the stage.
        </p>
      ) : (
        <pre className="overflow-x-auto p-[var(--s-4)] font-mono text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-dim)]">
          {content}
        </pre>
      )}
    </Panel>
  );
}
