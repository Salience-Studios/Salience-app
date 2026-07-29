/**
 * Front-matter is what makes the repo the schema.
 *
 * Every generated structure file opens with a block carrying its own identity,
 * so rebuilding Postgres is a deterministic function of the repo tree rather
 * than an exercise in guessing what a file means. Values are written as JSON,
 * which is a subset of YAML for scalars and flow sequences — so the block reads
 * as YAML to a human and parses exactly here, with no dependency and no
 * ambiguity about quoting.
 *
 * Parsing is deliberately strict. A file a user has mangled by hand must fail
 * to parse and be surfaced, never silently half-read into the index.
 */

export type FrontMatterValue = string | number | boolean | string[];
export type FrontMatter = Record<string, FrontMatterValue>;

const FENCE = "---";

export function writeFrontMatter(fields: FrontMatter): string {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");
  return `${FENCE}\n${body}\n${FENCE}\n\n`;
}

export type ParsedFile = { data: FrontMatter; body: string };

/** Null when the file has no front-matter block or the block is malformed. */
export function parseFrontMatter(source: string): ParsedFile | null {
  const normalised = source.replace(/^﻿/, "");
  if (!normalised.startsWith(`${FENCE}\n`)) return null;

  const end = normalised.indexOf(`\n${FENCE}`, FENCE.length);
  if (end === -1) return null;

  const block = normalised.slice(FENCE.length + 1, end);
  const body = normalised.slice(end + FENCE.length + 1).replace(/^\n+/, "");

  const data: FrontMatter = {};
  for (const line of block.split("\n")) {
    if (!line.trim()) continue;
    const split = line.indexOf(":");
    if (split === -1) return null;

    const key = line.slice(0, split).trim();
    const raw = line.slice(split + 1).trim();
    if (!key) return null;

    try {
      const value = JSON.parse(raw) as unknown;
      if (!isFrontMatterValue(value)) return null;
      data[key] = value;
    } catch {
      return null;
    }
  }

  return { data, body };
}

function isFrontMatterValue(value: unknown): value is FrontMatterValue {
  if (typeof value === "string") return true;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/* Typed readers. A file that carries the wrong shape is not that kind of
 * file, which is the question reconciliation actually needs answered. */

export function str(data: FrontMatter, key: string): string | null {
  const value = data[key];
  return typeof value === "string" ? value : null;
}

export function num(data: FrontMatter, key: string): number | null {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function list(data: FrontMatter, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value : [];
}
