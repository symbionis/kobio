/**
 * Production entrypoint (`npm start`). Loads the server secrets from the
 * 1Password Environment, then runs `next start` with them in its environment.
 *
 *   OP_SERVICE_ACCOUNT_TOKEN=… OP_ENVIRONMENT_ID=… npm start
 *
 * Fails fast: a missing token or id, an unreachable 1Password, or an Environment
 * missing a required secret exits non-zero before Next ever starts. Logs the
 * names of what it loaded, never a value. A name set both here and in the host
 * (Railway) takes the Environment's value.
 *
 * Plain JS on purpose: it runs in the production image, where tsx (a
 * devDependency) may not be installed.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { constants } from "node:os";
import { createClient } from "@1password/sdk";

// Server secrets the app can't run without. NEXT_PUBLIC_* stay on the host:
// Next inlines them at build time, so a start-time loader can't supply them.
const REQUIRED = [
  "OPENROUTER_API_KEY",
  "SLACK_FEEDBACK_WEBHOOK_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
];

const TIMEOUT_MS = 30_000;

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const token = process.env.OP_SERVICE_ACCOUNT_TOKEN?.trim();
const environmentId = process.env.OP_ENVIRONMENT_ID?.trim();

function fail(message) {
  console.error(`[1password] ${message} — not starting.`);
  process.exit(1);
}

// Errors come from outside our code; make sure none of them can echo the token.
function redact(err) {
  const text = String(err?.message ?? err);
  return token ? text.split(token).join("[redacted]") : text;
}

if (!token) fail("OP_SERVICE_ACCOUNT_TOKEN is not set");
if (!environmentId) fail("OP_ENVIRONMENT_ID is not set");

let variables;
try {
  const load = (async () => {
    const client = await createClient({
      auth: token,
      integrationName: "kobio",
      integrationVersion: version,
    });
    return (await client.environments.getVariables(environmentId)).variables;
  })();
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS).unref(),
  );
  variables = await Promise.race([load, timeout]);
} catch (err) {
  fail(`could not read Environment ${environmentId}: ${redact(err)}`);
}

const loaded = Object.fromEntries(variables.map((v) => [v.name, v.value]));
const missing = REQUIRED.filter((name) => !loaded[name]);
if (missing.length) fail(`Environment ${environmentId} is missing ${missing.join(", ")}`);

const names = Object.keys(loaded).sort();
const overridden = names.filter((name) => name in process.env);
console.log(`[1password] loaded ${names.length} variables: ${names.join(", ")}`);
if (overridden.length) {
  console.log(`[1password] overriding host values for: ${overridden.join(", ")}`);
}

// The app never needs the token; keep it out of Next's process.
const env = { ...process.env, ...loaded };
delete env.OP_SERVICE_ACCOUNT_TOKEN;

const next = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", ...process.argv.slice(2)],
  { env, stdio: "inherit" },
);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => next.kill(signal));
}

next.on("exit", (code, signal) => {
  process.exit(code ?? 128 + (constants.signals[signal] ?? 0));
});
