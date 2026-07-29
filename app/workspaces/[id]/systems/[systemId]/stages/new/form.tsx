"use client";

import { createStage } from "@/lib/actions/structure";
import {
  generateStageFiles,
  SUBJECT_CONTEXT,
  ATTACHMENTS,
  stageInput,
} from "@/lib/generate/stage";
import { stageFolder, stagePath } from "@/lib/generate/paths";
import {
  TOOL_SUMMARY,
  defaultGate,
  encodeGrant,
  parseGrants,
  toolsFor,
  type StageType,
  type ToolName,
} from "@/lib/tools";
import { MODELS, priceMultiple } from "@/lib/models";
import { Wizard, type WizardStep } from "@/components/wizard";
import { CheckList, Choice, FilePreview } from "@/components/config";
import { Chip, Field, Input, Num, Panel, Textarea } from "@/components/ui";

type Draft = {
  systemId: string;
  name: string;
  type: string;
  goal: string;
  inputs: string[];
  tools: string[];
  toolCeiling: string;
  defaultModel: string;
  does: string;
  doesNot: string;
  outputSections: string;
  closingRule: string;
  referenceRules: string;
};

export type PriorStage = { folder: string; name: string };

export function StageForm({
  systemId,
  systemName,
  position,
  priorStages,
}: {
  systemId: string;
  systemName: string;
  position: number;
  priorStages: PriorStage[];
}) {
  const steps: WizardStep<Draft, undefined>[] = [
    {
      label: "Stage",
      title: `Stage ${String(position).padStart(2, "0")}`,
      sub: "One step with one job. Type decides the runtime.",
      blocker: ({ draft }) => {
        if (!draft.name.trim()) return "Give the stage a name.";
        if (!draft.goal.trim()) return "State the goal in one sentence.";
        return null;
      },
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-5)] p-[var(--s-5)]">
          <Field label="Stage name" hint="Numbered by position in the system.">
            <Input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Research"
            />
            {draft.name.trim() && (
              <span className="text-sm text-[var(--text-muted)]">
                Folder:{" "}
                <Num className="text-xs">
                  {stagePath(systemName, position, draft.name)}
                </Num>
              </span>
            )}
          </Field>

          <Field label="Goal" hint="One sentence. What this stage is for.">
            <Input
              value={draft.goal}
              onChange={(e) => set("goal", e.target.value)}
              placeholder="Establish what the market already does, and where the gap is."
            />
          </Field>

          <Choice
            name="stage-type"
            label="Stage type"
            value={draft.type}
            onChange={(value) => {
              // Switching to text revokes the build-only tools rather than
              // leaving an allowlist the runtime would silently ignore.
              const allowed = new Set<string>(toolsFor(value as StageType));
              set("tools", draft.tools.filter((t) => allowed.has(t.split(":")[0])));
              set("type", value);
            }}
            options={[
              {
                value: "text",
                label: "Text",
                hint: "Research, plan, write, audit. One request plus a tool loop. Produces one markdown output.",
              },
              {
                value: "build",
                label: "Build",
                hint: "Writes and changes code. Sandboxed session with the repo mounted. Produces an output and a branch.",
              },
            ]}
          />
        </Panel>
      ),
    },
    {
      label: "Inputs",
      title: "Declare the inputs",
      sub: "Nothing outside this list enters the context.",
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <CheckList
            label="Declared inputs"
            selected={draft.inputs}
            onToggle={(value, checked) =>
              set(
                "inputs",
                checked
                  ? [...draft.inputs, value]
                  : draft.inputs.filter((v) => v !== value),
              )
            }
            options={[
              {
                value: SUBJECT_CONTEXT,
                label: "subject_context",
                hint: "The Context.md of the subject this run is about.",
              },
              {
                value: ATTACHMENTS,
                label: "attachments",
                hint: "Files uploaded to the subject or run. Read through a tool, never inlined.",
              },
              ...priorStages.map((stage) => ({
                value: stageInput(stage.folder),
                label: stage.folder,
                hint: `The approved output of ${stage.name} for this subject.`,
                note: "prior stage",
              })),
            ]}
          />
          <p className="text-sm text-[var(--text-muted)]">
            <Num className="text-xs">CLAUDE.md</Num> and the workspace{" "}
            <Num className="text-xs">Context.md</Num> are always read first and
            are not declared here.
          </p>
        </Panel>
      ),
    },
    {
      label: "Tools",
      title: "Grant the tools",
      sub: "The allowlist is the documentation and the enforcement.",
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-5)] p-[var(--s-5)]">
          <ToolGrants
            type={draft.type as StageType}
            value={draft.tools}
            onChange={(tools) => set("tools", tools)}
          />
          <Field
            label="Tool token ceiling"
            hint="Tool results count against this. A result that would exceed it pauses the run and asks."
          >
            <Input
              value={draft.toolCeiling}
              onChange={(e) => set("toolCeiling", e.target.value)}
              inputMode="numeric"
              className="num"
            />
          </Field>
        </Panel>
      ),
    },
    {
      label: "Rules",
      title: "Write the rules",
      sub: "One per line. These become Do, Do not, and Output.",
      render: ({ draft, set }) => (
        <Panel className="flex flex-col gap-[var(--s-4)] p-[var(--s-5)]">
          <Field label="What this stage does" hint="One per line.">
            <Textarea
              value={draft.does}
              onChange={(e) => set("does", e.target.value)}
              rows={5}
            />
          </Field>
          <Field label="What it must not do" hint="One per line.">
            <Textarea
              value={draft.doesNot}
              onChange={(e) => set("doesNot", e.target.value)}
              rows={4}
            />
          </Field>
          <Field label="Output sections" hint="One per line.">
            <Textarea
              value={draft.outputSections}
              onChange={(e) => set("outputSections", e.target.value)}
              rows={4}
            />
          </Field>
          <Field
            label="Closing rule"
            hint="The stage's final line. One sentence."
          >
            <Input
              value={draft.closingRule}
              onChange={(e) => set("closingRule", e.target.value)}
              placeholder="Cite the source or ask. Never a remembered figure."
            />
          </Field>
          <Field label="Reference rules" hint="One per line. Becomes References.md.">
            <Textarea
              value={draft.referenceRules}
              onChange={(e) => set("referenceRules", e.target.value)}
              rows={3}
            />
          </Field>
          <ModelPicker
            type={draft.type as StageType}
            value={draft.defaultModel}
            onChange={(value) => set("defaultModel", value)}
          />
        </Panel>
      ),
    },
    {
      label: "Review",
      title: "Review the files",
      sub: "The Inputs and Tools sections are what the runtime reads.",
      render: ({ draft }) => (
        <FilePreview
          files={generateStageFiles({
            id: "(assigned on save)",
            systemName,
            position,
            name: draft.name,
            type: draft.type as StageType,
            goal: draft.goal,
            declaredInputs: draft.inputs,
            tools: parseGrants(draft.tools),
            toolCeilingTokens: Number(draft.toolCeiling) || 20000,
            defaultModel: draft.defaultModel || null,
            does: draft.does,
            doesNot: draft.doesNot,
            outputSections: draft.outputSections,
            closingRule: draft.closingRule,
            referenceRules: draft.referenceRules,
          })}
        />
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      initial={{
        systemId,
        name: "",
        type: "text",
        goal: "",
        inputs: [],
        tools: [],
        toolCeiling: "20000",
        defaultModel: "",
        does: "",
        doesNot: "",
        outputSections: "",
        closingRule: "",
        referenceRules: "",
      }}
      storageKey={`salience:new-stage:${systemId}`}
      action={createStage}
      context={undefined}
      submitLabel="Create stage"
      pendingLabel="Committing…"
      footnote={(draft) =>
        `Commits three files to ${systemName}/${stageFolder(position, draft.name)}.`
      }
    />
  );
}

/**
 * Grant, then decide the permission. Two separate questions, because "this
 * stage may write" and "this stage may write without asking" are different
 * decisions and collapsing them is how a stage quietly gets a free hand.
 */
function ToolGrants({
  type,
  value,
  onChange,
}: {
  type: StageType;
  value: string[];
  onChange: (tools: string[]) => void;
}) {
  const grants = parseGrants(value);
  const granted = new Map(grants.map((g) => [g.name, g.gated]));

  function toggle(name: ToolName, on: boolean) {
    const next = grants.filter((g) => g.name !== name);
    if (on) next.push({ name, gated: defaultGate(name) });
    onChange(next.map(encodeGrant));
  }

  function setGate(name: ToolName, gated: boolean) {
    onChange(
      grants.map((g) => encodeGrant(g.name === name ? { ...g, gated } : g)),
    );
  }

  return (
    <fieldset className="flex flex-col gap-[var(--s-2)]">
      <legend className="mb-[var(--s-2)] text-sm font-medium">
        Allowed tools
      </legend>
      {toolsFor(type).map((name) => {
        const on = granted.has(name);
        return (
          <div
            key={name}
            className={
              "flex flex-col gap-[var(--s-2)] rounded-[var(--r-card)] border px-[var(--s-4)] py-[var(--s-3)] transition-colors " +
              (on
                ? "border-[var(--accent)] bg-[var(--bg-raised)]"
                : "border-[var(--border)] bg-[var(--bg-panel)]")
            }
            style={{ transitionDuration: "var(--d-micro)" }}
          >
            <label className="flex cursor-pointer items-start gap-[var(--s-3)]">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => toggle(name, e.target.checked)}
                className="mt-[3px] accent-[var(--accent)]"
              />
              <span className="flex flex-col gap-[var(--s-1)]">
                <Num className="text-sm">{name}</Num>
                <span className="text-sm text-[var(--text-muted)]">
                  {TOOL_SUMMARY[name]}
                </span>
              </span>
            </label>
            {on && (
              <label className="ml-[var(--s-6)] flex cursor-pointer items-center gap-[var(--s-2)]">
                <input
                  type="checkbox"
                  checked={granted.get(name)}
                  onChange={(e) => setGate(name, e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text-dim)]">
                  Ask every time
                </span>
              </label>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

/**
 * The picker is an economic control, not a gallery — the price ladder is the
 * point, so the multiple against the cheapest model is shown rather than left
 * for the reader to compute. Real per-run costing arrives with the composer at
 * M3; this only sets the stage default.
 */
function ModelPicker({
  type,
  value,
  onChange,
}: {
  type: StageType;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-[var(--s-2)]">
      <legend className="mb-[var(--s-1)] text-sm font-medium">
        Default model
      </legend>
      <span className="mb-[var(--s-2)] text-sm text-[var(--text-muted)]">
        Overridable per run.
        {type === "build" && " Build stages run on Anthropic models in v1."}
      </span>

      <label className="flex cursor-pointer items-center gap-[var(--s-3)] rounded-[var(--r-card)] border border-[var(--border)] px-[var(--s-4)] py-[var(--s-3)]">
        <input
          type="radio"
          name="default-model"
          checked={value === ""}
          onChange={() => onChange("")}
          className="accent-[var(--accent)]"
        />
        <span className="text-sm">Workspace default</span>
      </label>

      {MODELS.map((model) => (
        <label
          key={model.id}
          className={
            "flex cursor-pointer items-start gap-[var(--s-3)] rounded-[var(--r-card)] border px-[var(--s-4)] py-[var(--s-3)] transition-colors " +
            (value === model.id
              ? "border-[var(--accent)] bg-[var(--bg-raised)]"
              : "border-[var(--border)] bg-[var(--bg-panel)]")
          }
          style={{ transitionDuration: "var(--d-micro)" }}
        >
          <input
            type="radio"
            name="default-model"
            checked={value === model.id}
            onChange={() => onChange(model.id)}
            className="mt-[3px] accent-[var(--accent)]"
          />
          <span className="flex flex-1 flex-col gap-[var(--s-1)]">
            <span className="flex flex-wrap items-center gap-[var(--s-2)]">
              <Num className="text-sm">{model.id}</Num>
              <Chip>{priceMultiple(model)}× floor</Chip>
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {model.note}
            </span>
            <span className="eyebrow">
              ${model.input}/M in · ${model.output}/M out
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
