import Link from "next/link";
import { getInstallableRepos } from "@/lib/actions/workspace";
import { installUrl } from "@/lib/github/app";
import { EmptyState, Button, Eyebrow } from "@/components/ui";
import { WorkspaceForm } from "./form";
import { Retry } from "./retry";

export default async function NewWorkspace() {
  const result = await getInstallableRepos();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-6)]">
        <Eyebrow>New workspace</Eyebrow>
        <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
          Five steps to a workspace
        </h1>
      </header>

      {!result.ok ? (
        <EmptyState
          title="GitHub could not be reached"
          body={result.reason}
          action={<Retry />}
        />
      ) : result.repos.length === 0 ? (
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
        <WorkspaceForm repos={result.repos} />
      )}

      <p className="mt-[var(--s-5)] text-sm">
        <Link href="/workspaces">Back to workspaces</Link>
      </p>
    </main>
  );
}
