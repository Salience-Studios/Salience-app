import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// The Auth.js Drizzle adapter inspects this object to detect the dialect, so
// it must be a real Drizzle instance at module load — not a lazy proxy.
//
// neon() builds a fetch-based client without opening a connection, so a
// placeholder URL lets `next build` collect page data on a machine with no
// DATABASE_URL. Any actual query then fails loudly rather than silently
// reading from somewhere unexpected.
const url =
  process.env.DATABASE_URL ??
  "postgresql://unset:unset@unset.invalid/unset?sslmode=require";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  console.warn(
    "DATABASE_URL is not set — database calls will fail. Copy .env.local.example to .env.local.",
  );
}

/**
 * Neon suspends an idle compute and the first request back fails with a bare
 * `fetch failed` while it wakes. That is a cold start, not an outage, and it
 * hits any low-traffic deployment — not just local development. Retry the
 * connection-level failures briefly so a user's first page load after a quiet
 * period does not error.
 *
 * Only transport failures are retried. A query that reaches Postgres and is
 * rejected carries a Postgres error and is surfaced immediately, because
 * retrying a real error just delays the report.
 */
function isColdStart(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`;
  return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(text);
}

const RETRY_DELAYS_MS = [250, 750, 1500];

const sql = neon(url);

const resilientSql: typeof sql = new Proxy(sql, {
  apply(target, thisArg, args: Parameters<typeof sql>) {
    const run = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          return await Reflect.apply(target, thisArg, args);
        } catch (error) {
          lastError = error;
          if (!isColdStart(error) || attempt === RETRY_DELAYS_MS.length) break;
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
      }
      throw lastError;
    };
    return run();
  },
});

export const db = drizzle(resilientSql, { schema });
export * from "./schema";
