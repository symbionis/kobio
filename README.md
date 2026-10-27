# bexio-devis

Voice note → draft quote in Bexio.

## Setup

```bash
npm install
cp .env.example .env
# paste the Bexio token into .env (BEXIO_TOKEN=...)
```

## First run — the smoke test

```bash
npm run smoke
```

This authenticates, prints the company name, lists the first few articles,
and writes the full catalog to `refs/catalog.json` for offline development.
It does not write anything to Bexio.

If it fails with a 401, the token is wrong or expired — regenerate at
https://developer.bexio.com/pat.

## Production secrets (1Password)

`npm start` runs `scripts/start.mjs`. It reads the server secrets from the
1Password Environment `apps-kobio-prod` using the 1Password JS SDK
(`@1password/sdk`, pinned), then starts `next start` with them in its
environment. The host must provide two variables:

- `OP_SERVICE_ACCOUNT_TOKEN`: read-only service account that can read only `apps-kobio-prod`
- `OP_ENVIRONMENT_ID`: the Environment's id

The Environment holds `OPENROUTER_API_KEY`, `SLACK_FEEDBACK_WEBHOOK_URL`,
`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`. If a name is set in both the
host and the Environment, the Environment's value is used. The token itself is
not passed on to Next.

It fails fast. If the token or id is missing, 1Password can't be reached
(30 s timeout), or one of those four is missing from the Environment, it exits 1
and Next never starts. It logs the names it loaded, never the values.

`NEXT_PUBLIC_*` variables stay on Railway. Next inlines them at `next build`, so
loading them at start time would be too late.

A change in 1Password takes effect on the next deploy or restart.

Local dev: either keep using `.env`, or read the same Environment through the
desktop app:

```bash
op run --environment <id> -- npm run dev
```

## Build order

See `CLAUDE.md`. Short version: read side first (smoke test, then read-only
MCP tools), extraction next, draft-only writes last.

## Safety

- `.env` and `refs/` are gitignored. Never commit the token or his catalog.
- All offer writes are DRAFT only. See `CLAUDE.md` for the full rules.
