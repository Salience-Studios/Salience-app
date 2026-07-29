/**
 * The model roster.
 *
 * A seed list only. 03 puts LiteLLM in front of every provider, and from M3 the
 * gateway's own model list — with live prices and the other providers' models —
 * replaces this. Until the gateway exists, a stage still has to name a default
 * model, so the roster is hardcoded and labelled rather than left empty.
 *
 * Prices are per million tokens, Anthropic first-party rates, current as of
 * 2026-07-28. They are shown in the stage form to make the price ladder visible
 * at the moment a default is chosen — which is the entire thesis of the product.
 * Nothing here is billed against; M3 prices from the gateway.
 */

export type Model = {
  id: string;
  label: string;
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
  note?: string;
};

export const MODELS: Model[] = [
  {
    id: "claude-fable-5",
    label: "Claude Fable 5",
    input: 10,
    output: 50,
    note: "Hardest reasoning and long-horizon work.",
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    input: 5,
    output: 25,
    note: "Complex agentic and coding work.",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    input: 3,
    output: 15,
    note: "Near-Opus quality on coding and agentic work.",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    input: 1,
    output: 5,
    note: "Fastest and cheapest. The floor of the ladder.",
  },
];

export const DEFAULT_MODEL = "claude-opus-5";

export function modelLabel(id: string | null): string {
  if (!id) return "Workspace default";
  return MODELS.find((m) => m.id === id)?.label ?? id;
}

/** Input price relative to the cheapest model — the ladder, stated plainly. */
export function priceMultiple(model: Model): number {
  const floor = Math.min(...MODELS.map((m) => m.input));
  return model.input / floor;
}
