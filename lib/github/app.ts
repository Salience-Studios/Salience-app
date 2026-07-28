import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

/**
 * Installation tokens are minted on demand from the App private key and
 * expire in an hour. Nothing long-lived is ever persisted — that is the
 * entire security argument for using a GitHub App over an OAuth App.
 *
 * Server-only. The private key must never reach the client bundle.
 */

function privateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not set.");
  }
  // Accept both a literal PEM and one with escaped newlines, since .env
  // files cannot hold real line breaks.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

/** Octokit authenticated as the App itself — used to list installations. */
export function appOctokit(): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: privateKey(),
    },
  });
}

/** Octokit scoped to one installation — used for all repo reads and writes. */
export function installationOctokit(installationId: number): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: privateKey(),
      installationId,
    },
  });
}

export type InstallationRepo = {
  installationId: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
};

/**
 * Every repo this App can reach, across all installations the signed-in
 * user can see. The App is installed per-account, so a user with the app on
 * both a personal account and an org has two installations.
 */
export async function listInstallationRepos(
  userAccessToken: string,
): Promise<InstallationRepo[]> {
  const asUser = new Octokit({ auth: userAccessToken });
  const { data } = await asUser.request("GET /user/installations");

  const repos: InstallationRepo[] = [];
  for (const installation of data.installations) {
    const { data: repoData } = await asUser.request(
      "GET /user/installations/{installation_id}/repositories",
      { installation_id: installation.id, per_page: 100 },
    );
    for (const repo of repoData.repositories) {
      repos.push({
        installationId: installation.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
      });
    }
  }
  return repos;
}

/** URL where a user installs or reconfigures the App. */
export function installUrl(): string {
  const slug = process.env.GITHUB_APP_SLUG;
  return slug
    ? `https://github.com/apps/${slug}/installations/new`
    : "https://github.com/settings/installations";
}
