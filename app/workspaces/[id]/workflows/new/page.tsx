import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/actions/workspace";
import { Eyebrow } from "@/components/ui";
import { WorkflowForm } from "./form";

export default async function NewWorkflow({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getWorkspace(id);
  if (!ws) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-6)]">
        <Eyebrow>{ws.name}</Eyebrow>
        <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
          New workflow
        </h1>
      </header>

      <WorkflowForm workspaceId={id} />

      <p className="mt-[var(--s-5)] text-sm">
        <Link href={`/workspaces/${id}`}>Back to workspace</Link>
      </p>
    </main>
  );
}
