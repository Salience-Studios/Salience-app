import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getWorkspace,
  listWorkspaceFiles,
  checkDrift,
} from "@/lib/actions/workspace";
import { estimateTokens } from "@/lib/tokens";
import {
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  Num,
  Panel,
  StatTile,
} from "@/components/ui";

export default async function WorkspaceOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getWorkspace(id);
  if (!ws) notFound();

  const [files, drifted] = await Promise.all([
    listWorkspaceFiles(id),
    checkDrift(id),
  ]);

  const structureFiles = files.filter((f) => f.path.endsWith(".md"));
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
        <Link href="/workspaces">
          <Button variant="ghost">All workspaces</Button>
        </Link>
      </header>

      {drifted && (
        <Panel className="mb-[var(--s-4)] border-[var(--warn)] p-[var(--s-4)]">
          <Eyebrow>Repository changed</Eyebrow>
          <p className="mt-[var(--s-2)] text-sm text-[var(--text-dim)]">
            This repository has commits Salience has not seen. The repository is
            the source of truth — files below are read live from it.
          </p>
        </Panel>
      )}

      <section className="mb-[var(--s-5)] grid grid-cols-2 gap-[var(--s-3)] md:grid-cols-4">
        <StatTile label="Systems" value="0" tone="dim" />
        <StatTile label="Subjects" value="0" tone="dim" />
        <StatTile label="Runs 7d" value="0" tone="dim" />
        <StatTile label="Spend 7d" value="$0.00" tone="dim" />
      </section>

      <section>
        <div className="mb-[var(--s-3)] flex items-center gap-[var(--s-2)]">
          <h2 className="heading-sm text-lg font-medium">Structure</h2>
          <Chip>{structureFiles.length} files</Chip>
        </div>

        {structureFiles.length === 0 ? (
          <EmptyState
            title="Nothing scaffolded yet"
            body="This workspace has no markdown files. That usually means the scaffold commit did not land — check the repository."
          />
        ) : (
          <Panel className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="eyebrow p-[var(--s-3)] font-normal">File</th>
                  <th className="eyebrow p-[var(--s-3)] text-right font-normal">
                    Bytes
                  </th>
                  <th className="eyebrow p-[var(--s-3)] text-right font-normal">
                    ≈ Tokens
                  </th>
                </tr>
              </thead>
              <tbody>
                {structureFiles.map((f) => (
                  <tr
                    key={f.path}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="p-[var(--s-3)]">
                      <Link
                        href={`/workspaces/${id}/files?path=${encodeURIComponent(f.path)}`}
                        className="num text-xs"
                      >
                        {f.path}
                      </Link>
                    </td>
                    <td className="p-[var(--s-3)] text-right">
                      <Num tone="dim">{f.size ?? 0}</Num>
                    </td>
                    <td className="p-[var(--s-3)] text-right">
                      <Num tone="dim">
                        {estimateTokens("x".repeat(f.size ?? 0))}
                      </Num>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
        <p className="mt-[var(--s-2)] text-xs text-[var(--text-muted)]">
          Token counts are estimates. Exact counts come from the provider when a
          stage runs.
        </p>
      </section>
    </main>
  );
}
