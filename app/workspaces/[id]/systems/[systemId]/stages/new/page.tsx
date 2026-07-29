import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/actions/workspace";
import { getSystem, listStages } from "@/lib/actions/structure";
import { stageFolder } from "@/lib/generate/paths";
import { Eyebrow } from "@/components/ui";
import { StageForm } from "./form";

export default async function NewStage({
  params,
}: {
  params: Promise<{ id: string; systemId: string }>;
}) {
  const { id, systemId } = await params;
  const [ws, system] = await Promise.all([getWorkspace(id), getSystem(systemId)]);
  if (!ws || !system || system.workspaceId !== id) notFound();

  const stages = await listStages(systemId);

  // Only earlier stages can be declared as inputs — a stage cannot depend on
  // one that has not run for this subject yet.
  const priorStages = stages.map((stage) => ({
    folder: stageFolder(stage.position, stage.name),
    name: stage.name,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-[var(--s-4)] py-[var(--s-6)]">
      <header className="mb-[var(--s-6)]">
        <Eyebrow>{system.name}</Eyebrow>
        <h1 className="heading-lg mt-[var(--s-1)] text-2xl font-semibold">
          New stage
        </h1>
      </header>

      <StageForm
        systemId={systemId}
        systemName={system.name}
        position={stages.length + 1}
        priorStages={priorStages}
      />

      <p className="mt-[var(--s-5)] text-sm">
        <Link href={`/workspaces/${id}/systems/${systemId}`}>
          Back to {system.name}
        </Link>
      </p>
    </main>
  );
}
