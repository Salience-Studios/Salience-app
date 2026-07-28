import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace, readWorkspaceFile } from "@/lib/actions/workspace";
import { Eyebrow, EmptyState, Button } from "@/components/ui";
import { FileEditor } from "./editor";

export default async function FilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { id } = await params;
  const { path } = await searchParams;

  const ws = await getWorkspace(id);
  if (!ws) notFound();

  if (!path) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
        <EmptyState
          title="No file selected"
          body="Pick a file from the workspace overview to edit it."
          action={
            <Link href={`/workspaces/${id}`}>
              <Button>Back to workspace</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const content = await readWorkspaceFile(id, path);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-4)]">
        <Eyebrow>{ws.name}</Eyebrow>
        <h1 className="num mt-[var(--s-1)] text-lg">{path}</h1>
      </header>

      {content === null ? (
        <EmptyState
          title="File not found"
          body={`${path} is not in this repository. It may have been renamed or deleted outside Salience.`}
          action={
            <Link href={`/workspaces/${id}`}>
              <Button>Back to workspace</Button>
            </Link>
          }
        />
      ) : (
        <FileEditor
          workspaceId={id}
          path={path}
          initial={content}
          threshold={ws.tokenThreshold}
        />
      )}

      <p className="mt-[var(--s-5)] text-sm">
        <Link href={`/workspaces/${id}`}>Back to workspace</Link>
      </p>
    </main>
  );
}
