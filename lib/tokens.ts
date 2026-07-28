/**
 * Local token estimate for the file editor's live count.
 *
 * This is an APPROXIMATION and every surface that shows it must label it as
 * one. Real counts come from the provider's own token-counting endpoint at
 * M3, where the run composer needs a number precise enough to price against.
 * A per-keystroke network call is not worth it for a warning threshold.
 *
 * Deliberately not tiktoken: that is OpenAI's tokenizer and undercounts
 * Claude by a wide margin on prose and much more on code.
 *
 * The heuristic is characters ÷ 3.6, which sits close to observed ratios for
 * English markdown across current models. It is not accurate for code or
 * non-Latin scripts, and is not used for anything that costs money.
 */
const CHARS_PER_TOKEN = 3.6;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export type ThresholdState = "ok" | "warn" | "over";

/**
 * Short files are the premise of the product, so the editor warns as one
 * grows. Threshold is per workspace; the defaults are 2,000 and 4,000.
 */
export function thresholdState(
  tokens: number,
  threshold: number,
): ThresholdState {
  if (tokens >= threshold * 2) return "over";
  if (tokens >= threshold) return "warn";
  return "ok";
}
