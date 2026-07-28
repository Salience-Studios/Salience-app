import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, users, authAccounts, sessions, verificationTokens } from "@/lib/db";

// A GitHub App authenticates users through the same OAuth endpoints as an
// OAuth App, so the standard provider works — it just carries the App's
// client id and secret. One registration, two token types: this flow mints
// the user-to-server token for identity; installation tokens for repo writes
// are minted separately from the private key (see lib/github/app.ts).
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authAccounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_APP_CLIENT_ID,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/signin" },
});
