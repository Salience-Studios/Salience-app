import Link from "next/link";
import { getInstallableRepos } from "@/lib/actions/workspace";
import { installUrl } from "@/lib/github/app";
import { EmptyState, Button, Eyebrow } from "@/components/ui";
import { WorkspaceForm } from "./form";

export default async function NewWorkspace() {
  const repos = await getInstallableRepos();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-6)]">
        <Eyebrow>New workspace</Eyebrow>
        <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
          Describe the business
        </h1>
        <p className="mt-[var(--s-2)] text-sm text-[var(--text-dim)]">
          These answers generate <span className="num text-xs">CLAUDE.md</span>{" "}
          and <span className="num text-xs">Context.md</span>. Every session
          reads them before anything else, so keep them short and specific.
        </p>
      </header>

      {repos.length === 0 ? (
        <EmptyState
          title="No repositories available"
          body="Salience can only reach repositories you have installed it on. Install the app on an empty private repository, then come back."
          action={
            <a href={installUrl()} target="_blank" rel="noreferrer">
              <Button variant="primary">Install on a repository</Button>
            </a>
          }
        />
      ) : (
        <WorkspaceForm repos={repos} />
      )}

      <p className="mt-[var(--s-5)] text-sm">
        <Link href="/workspaces">Back to workspaces</Link>
      </p>
    </main>
  );
}
