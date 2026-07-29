import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace, checkDrift } from "@/lib/actions/workspace";
import { listWorkflows, listStages, listSubjects } from "@/lib/actions/structure";
import {
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  Num,
  Panel,
  StatTile,
} from "@/components/ui";
import { Reconcile } from "./reconcile";

export default async function WorkspaceOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getWorkspace(id);
  if (!ws) notFound();

  const [workflows, subjects, drifted] = await Promise.all([
    listWorkflows(id),
    listSubjects(id),
    checkDrift(id),
  ]);

  const stageCounts = await Promise.all(
    workflows.map(async (workflow) => (await listStages(workflow.id)).length),
  );
  const totalStages = stageCounts.reduce((a, b) => a + b, 0);
  const repoUrl = `https://github.com/${ws.repoOwner}/${ws.repoName}`;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-5)] flex flex-wrap items-start justify-between gap-[var(--s-3)]">
        <div>
          <Eyebrow>Workspace</Eyebrow>
          <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
            {ws.name}
          </h1>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="num mt-[var(--s-1)] inline-block text-xs"
          >
            {ws.repoOwner}/{ws.repoName}
          </a>
        </div>
        <div className="flex flex-wrap gap-[var(--s-2)]">
          <Link href={`/workspaces/${id}/subjects`}>
            <Button>Subjects</Button>
          </Link>
          <Link href={`/workspaces/${id}/files`}>
            <Button variant="ghost">Files</Button>
          </Link>
        </div>
      </header>

      <div className="mb-[var(--s-5)]">
        <Reconcile workspaceId={id} drifted={drifted} />
      </div>

      <section className="mb-[var(--s-5)] grid grid-cols-2 gap-[var(--s-3)] md:grid-cols-4">
        <StatTile
          label="Workflows"
          value={workflows.length}
          tone={workflows.length ? "default" : "dim"}
        />
        <StatTile
          label="Stages"
          value={totalStages}
          tone={totalStages ? "default" : "dim"}
        />
        <StatTile
          label="Subjects"
          value={subjects.length}
          tone={subjects.length ? "default" : "dim"}
        />
        <StatTile label="Spend 7d" value="$0.00" tone="dim" />
      </section>

      <section>
        <div className="mb-[var(--s-3)] flex flex-wrap items-center justify-between gap-[var(--s-2)]">
          <div className="flex items-center gap-[var(--s-2)]">
            <h2 className="heading-sm text-lg font-medium">Workflows</h2>
            <Chip>{workflows.length}</Chip>
          </div>
          <Link href={`/workspaces/${id}/workflows/new`}>
            <Button variant="primary">New workflow</Button>
          </Link>
        </div>

        {workflows.length === 0 ? (
          <EmptyState
            title="No workflows yet"
            body="A workflow is one repeatable process — the ordered stages a piece of work moves through. Create the first one to start adding stages."
            action={
              <Link href={`/workspaces/${id}/workflows/new`}>
                <Button variant="primary">Create the first workflow</Button>
              </Link>
            }
          />
        ) : (
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="eyebrow p-[var(--s-3)] font-normal">Workflow</th>
                  <th className="eyebrow p-[var(--s-3)] font-normal">Purpose</th>
                  <th className="eyebrow p-[var(--s-3)] text-right font-normal">
                    Stages
                  </th>
                  <th className="eyebrow p-[var(--s-3)] text-right font-normal">
                    Runs 7d
                  </th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow, i) => (
                  <tr
                    key={workflow.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="p-[var(--s-3)]">
                      <Link href={`/workspaces/${id}/workflows/${workflow.id}`}>
                        {workflow.name}
                      </Link>
                    </td>
                    <td className="p-[var(--s-3)] text-[var(--text-dim)]">
                      {workflow.purpose || "—"}
                    </td>
                    <td className="p-[var(--s-3)] text-right">
                      <Num tone={stageCounts[i] ? "default" : "dim"}>
                        {stageCounts[i]}
                      </Num>
                    </td>
                    <td className="p-[var(--s-3)] text-right">
                      <Num tone="dim">0</Num>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        <p className="mt-[var(--s-2)] text-xs text-[var(--text-muted)]">
          Runs and spend stay at zero until stages can execute at M3.
        </p>
      </section>
    </main>
  );
}
