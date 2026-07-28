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

export const db = drizzle(neon(url), { schema });
export * from "./schema";
