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

Every value set by hand lives in the 1Password Environment `apps-kobio-prod`.
`npm run build` and `npm start` both go through one wrapper,
`scripts/with-1password.mjs`. It reads the Environment with the 1Password JS SDK
(`@1password/sdk`, pinned), then runs the command with those variables added to
its environment:

```bash
node scripts/with-1password.mjs --public-only next build   # npm run build
node scripts/with-1password.mjs next start                 # npm start
```

The host must provide two variables, at build and at runtime (Railway passes
service variables to the build):

- `OP_SERVICE_ACCOUNT_TOKEN`: read-only service account that can read only `apps-kobio-prod`
- `OP_ENVIRONMENT_ID`: the Environment's id

`--public-only` (build) passes only the `NEXT_PUBLIC_*` names, which Next inlines
into the bundle: `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`. Server
secrets are kept out of `next build` entirely, so nothing can bake them into
`.next`. If the host still holds a copy of one, the wrapper removes it from the
build's environment too.

Without the flag (start), every name in the Environment is passed. The server
needs `OPENROUTER_API_KEY`, `SLACK_FEEDBACK_WEBHOOK_URL`,
`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`.

The required names for each mode sit in one `REQUIRED` list at the top of the
wrapper; it's the only per-service part, so the file can be copied to the next
Node service as is. If a name is set in both the host and the Environment, the
Environment's value is used. The token itself is not passed on to the command.

It fails fast. If the token or id is missing, 1Password can't be reached
(30 s timeout), or a required name is missing from the Environment, it exits 1
and the command never runs. It logs the names it passed, never the values; the
build log lists the four public names only.

A change in 1Password takes effect on the next deploy. A server secret also
changes on a restart; a public name needs a rebuild.

Local dev is unchanged: `npm run dev` with `.env`, or read the same Environment
through the desktop app:

```bash
op run --environment <id> -- npm run dev
```

A local `npm run build` / `npm start` needs `OP_SERVICE_ACCOUNT_TOKEN` and
`OP_ENVIRONMENT_ID` like production. To build against `.env` instead, run
`npx next build` directly.

## Build order

See `CLAUDE.md`. Short version: read side first (smoke test, then read-only
MCP tools), extraction next, draft-only writes last.

## Safety

- `.env` and `refs/` are gitignored. Never commit the token or his catalog.
- All offer writes are DRAFT only. See `CLAUDE.md` for the full rules.
