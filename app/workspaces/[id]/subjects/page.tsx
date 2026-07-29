import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/actions/workspace";
import { listSubjects } from "@/lib/actions/structure";
import {
  Button,
  Chip,
  EmptyState,
  Eyebrow,
  Num,
  Panel,
} from "@/components/ui";

export default async function Subjects({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getWorkspace(id);
  if (!ws) notFound();

  const subjects = await listSubjects(id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-5)] flex flex-wrap items-start justify-between gap-[var(--s-3)]">
        <div>
          <Eyebrow>{ws.name}</Eyebrow>
          <h1 className="heading-lg mt-[var(--s-1)] flex items-center gap-[var(--s-3)] text-2xl font-semibold">
            Subjects
            <Chip>{subjects.length}</Chip>
          </h1>
        </div>
        <Link href={`/workspaces/${id}/subjects/new`}>
          <Button variant="primary">New subject</Button>
        </Link>
      </header>

      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          body="A subject stores all of the outputs of a single project. It collects every approved output from each stage of a workflow and organizes it in one place."
          action={
            <Link href={`/workspaces/${id}/subjects/new`}>
              <Button variant="primary">Create the first subject</Button>
            </Link>
          }
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="eyebrow p-[var(--s-3)] font-normal">Subject</th>
                <th className="eyebrow p-[var(--s-3)] font-normal">Folder</th>
                <th className="eyebrow p-[var(--s-3)] text-right font-normal">
                  Stages done
                </th>
                <th className="eyebrow p-[var(--s-3)] text-right font-normal">
                  Spend
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr
                  key={subject.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="p-[var(--s-3)]">
                    <Link href={`/workspaces/${id}/subjects/${subject.id}`}>
                      {subject.name}
                    </Link>
                  </td>
                  <td className="p-[var(--s-3)]">
                    <Num tone="dim" className="text-xs">
                      Subjects/{subject.slug}
                    </Num>
                  </td>
                  <td className="p-[var(--s-3)] text-right">
                    <Num tone="dim">0</Num>
                  </td>
                  <td className="p-[var(--s-3)] text-right">
                    <Num tone="dim">$0.00</Num>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <p className="mt-[var(--s-5)] text-sm">
        <Link href={`/workspaces/${id}`}>Back to workspace</Link>
      </p>
    </main>
  );
}
