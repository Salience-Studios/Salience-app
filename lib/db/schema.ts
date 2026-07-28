import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ------------------------------------------------------------------ *
 * Auth.js tables.
 * `users` is 03's `accounts` object — the signed-in person.
 * `authAccounts` is Auth.js's own OAuth-link table and holds the GitHub
 * user id in `providerAccountId`. Two different meanings of "account",
 * so the names are kept apart deliberately.
 * ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const authAccounts = pgTable(
  "auth_accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ *
 * Domain tables.
 *
 * Content lives in git. These tables are the index and the ledger —
 * a derived cache whose rebuild is a deterministic function of the repo
 * tree, because every generated file carries its own front-matter.
 * Git wins every conflict.
 * ------------------------------------------------------------------ */

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    repoOwner: text("repo_owner").notNull(),
    repoName: text("repo_name").notNull(),
    installationId: integer("installation_id").notNull(),
    defaultModel: text("default_model").notNull().default("claude-opus-5"),
    spendCeilingCents: integer("spend_ceiling_cents"),
    tokenThreshold: integer("token_threshold").notNull().default(2000),
    buildMinutesQuota: integer("build_minutes_quota"),
    // Last repo state this index was reconciled against. Drift is detected
    // by comparing the live tree sha to this value on workspace open.
    headSha: text("head_sha"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("workspaces_repo_idx").on(t.repoOwner, t.repoName)],
);

export const systems = pgTable("systems", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  purpose: text("purpose"),
  position: integer("position").notNull(),
  repoPath: text("repo_path").notNull(),
});

export const stages = pgTable("stages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  systemId: text("system_id")
    .notNull()
    .references(() => systems.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  // 'text' | 'build' — different runtime, tools, and model availability.
  type: text("type").notNull().default("text"),
  goal: text("goal"),
  // Read by the run assembler. Not decorative metadata mirroring the
  // markdown — the executable form of it.
  declaredInputs: jsonb("declared_inputs").$type<string[]>().notNull().default([]),
  allowedTools: jsonb("allowed_tools").$type<string[]>().notNull().default([]),
  toolCeilingTokens: integer("tool_ceiling_tokens").notNull().default(20000),
  defaultModel: text("default_model"),
  repoPath: text("repo_path").notNull(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subjects_slug_idx").on(t.workspaceId, t.slug)],
);

export type Workspace = typeof workspaces.$inferSelect;
export type System = typeof systems.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
