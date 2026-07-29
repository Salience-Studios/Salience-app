/**
 * The starter draft for the workspace config form.
 *
 * A blank textarea asks a new user to invent the contents of a CLAUDE.md,
 * which is the expertise this product is supposed to supply. So the fields
 * arrive filled and the user edits rather than authors.
 *
 * Prefill only exists where a generic default is genuinely correct — how work
 * should read, and the rules any staged workflow wants. Workspace name, what
 * the business does, and the stack are business-specific: a generic answer
 * there would be worse than an empty box, so those carry a worked example
 * instead.
 *
 * Every prefilled value is compared against its starter on the review step, so
 * a field the user never touched gets flagged rather than committed unnoticed.
 */

export const STARTER = {
  voice: `Direct and plain. No hype, no filler.
Every claim specific enough to check.
Short sentences. Cut anything that reads as padding.`,

  conventions: `One file per completed stage, named for the subject it is about.
Markdown only. Keep every file short enough to load cheaply.
Never edit a prior stage's output — flag the conflict instead.`,

  alwaysDo: `Read the stage's Context.md before producing anything.
Use the prior stage's output as the input. Cite it when you deviate.
Ask when a required input is missing.
Write plain, scannable markdown.`,

  // Gerunds: these render as bullets under "## Avoid", where imperatives
  // read as instructions to do the thing.
  neverDo: `Inventing facts, metrics, or figures. Cite a source or ask.
Skipping a stage, or merging two stages into one file.
Preamble, recap, and filler.
Loading files the current stage does not name.`,
} as const;

export type StarterField = keyof typeof STARTER;

export const STARTER_FIELDS = Object.keys(STARTER) as StarterField[];

/** True when the user has left a prefilled field exactly as it arrived. */
export function isUntouched(field: StarterField, value: string): boolean {
  return value.trim() === STARTER[field].trim();
}

/** Worked examples for the fields no generic default can honestly fill. */
export const EXAMPLES = {
  name: "Northbeam Studio",
  what: "We build and run e-commerce brand sites for DTC companies.",
  stack: `Next.js · TypeScript · Tailwind · Vercel
Klaviyo for email and SMS
Figma for design`,
} as const;
