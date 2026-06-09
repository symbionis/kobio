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

## Build order

See `CLAUDE.md`. Short version: read side first (smoke test, then read-only
MCP tools), extraction next, draft-only writes last.

## Safety

- `.env` and `refs/` are gitignored. Never commit the token or his catalog.
- All offer writes are DRAFT only. See `CLAUDE.md` for the full rules.
