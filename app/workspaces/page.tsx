import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { listWorkspaces } from "@/lib/actions/workspace";
import { Button, EmptyState, Eyebrow, Num, Panel } from "@/components/ui";

export default async function Workspaces() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const rows = await listWorkspaces();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-6)] flex flex-wrap items-center justify-between gap-[var(--s-3)]">
        <div>
          <Eyebrow>Salience</Eyebrow>
          <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
            Workspaces
          </h1>
        </div>
        <div className="flex items-center gap-[var(--s-2)]">
          <Link href="/workspaces/new">
            <Button variant="primary">New workspace</Button>
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <Button variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          body="A workspace is one business's operating structure, backed by one Git repository. Salience writes CLAUDE.md, Context.md, and the Workflows and Subjects folders into it."
          action={
            <Link href="/workspaces/new">
              <Button variant="primary">Create your first workspace</Button>
            </Link>
          }
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="eyebrow p-[var(--s-3)] font-normal">Workspace</th>
                <th className="eyebrow p-[var(--s-3)] font-normal">Repository</th>
                <th className="eyebrow p-[var(--s-3)] text-right font-normal">
                  Workflows
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="p-[var(--s-3)]">
                    <Link href={`/workspaces/${w.id}`}>{w.name}</Link>
                  </td>
                  <td className="p-[var(--s-3)] text-[var(--text-dim)]">
                    <span className="num text-xs">
                      {w.repoOwner}/{w.repoName}
                    </span>
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
    </main>
  );
}
