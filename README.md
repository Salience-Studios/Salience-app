# Salience

Runs an agency's repeatable work as ordered stages with hand-scoped context.

Specs live in the Salience Studio workspace:
`Clients/Salience Product/` — intake, research, PRD, architecture.

## Setup

```bash
cp .env.local.example .env.local   # fill in GitHub App + Neon values
npx auth secret                    # writes AUTH_SECRET
npm install
npx drizzle-kit push               # create tables
npm run dev
```

## Milestones

- **M1** — auth, workspace create, scaffold commit, file editor ← current
- M2 — systems, stages, subjects, config forms
- M3 — text runs, run composer, approve, dual commit
- M4 — tools and attachments
- M5 — build stages
- M6 — measurement
