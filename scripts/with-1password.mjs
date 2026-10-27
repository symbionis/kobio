/**
 * Runs a command with the variables of the service's 1Password Environment
 * added to its environment. Used by `npm run build` and `npm start`:
 *
 *   node scripts/with-1password.mjs --public-only next build
 *   node scripts/with-1password.mjs next start
 *
 * The host provides OP_SERVICE_ACCOUNT_TOKEN and OP_ENVIRONMENT_ID.
 *
 * --public-only passes only NEXT_PUBLIC_* names to the command, and also drops
 * any host copy of the Environment's other names. Next inlines NEXT_PUBLIC_* at
 * build time, and server secrets must not be in the build's environment, so
 * nothing can bake them into `.next`.
 *
 * Fails fast: a missing token or id, an unreachable 1Password (30 s timeout), or
 * an Environment missing a required name exits non-zero before the command ever
 * runs. Logs names, never a value. A name set both here and in the host takes
 * the Environment's value. The token is not passed on to the command.
 *
 * Plain JS on purpose: it runs in the production image, where tsx (a
 * devDependency) may not be installed.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { constants } from "node:os";
import { createClient } from "@1password/sdk";

// The only per-service part of this file: the names each mode must find in
// the Environment before the command runs.
const SERVICE = "kobio";
const REQUIRED = {
  // --public-only (`npm run build`): what Next inlines into the client bundle.
  public: [
    "NEXT_PUBLIC_POSTHOG_HOST",
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
  ],
  // Default (`npm start`): server secrets the app can't run without.
  server: [
    "OPENROUTER_API_KEY",
    "SLACK_FEEDBACK_WEBHOOK_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
  ],
};

const PUBLIC_PREFIX = "NEXT_PUBLIC_";
const TIMEOUT_MS = 30_000;

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const args = process.argv.slice(2);
const publicOnly = args[0] === "--public-only";
if (publicOnly) args.shift();
const [command, ...commandArgs] = args;

const token = process.env.OP_SERVICE_ACCOUNT_TOKEN?.trim();
const environmentId = process.env.OP_ENVIRONMENT_ID?.trim();

function fail(message) {
  const what = command ? [command, ...commandArgs].join(" ") : "anything";
  console.error(`[1password] ${message} — not running ${what}.`);
  process.exit(1);
}

// Errors come from outside our code; make sure none of them can echo the token.
function redact(err) {
  const text = String(err?.message ?? err);
  return token ? text.split(token).join("[redacted]") : text;
}

if (!command) fail("usage: with-1password.mjs [--public-only] <command...>");
if (!token) fail("OP_SERVICE_ACCOUNT_TOKEN is not set");
if (!environmentId) fail("OP_ENVIRONMENT_ID is not set");

let variables;
try {
  const load = (async () => {
    const client = await createClient({
      auth: token,
      integrationName: SERVICE,
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

const all = Object.fromEntries(variables.map((v) => [v.name, v.value]));
const loaded = publicOnly
  ? Object.fromEntries(Object.entries(all).filter(([name]) => name.startsWith(PUBLIC_PREFIX)))
  : all;

const required = publicOnly ? REQUIRED.public : REQUIRED.server;
const missing = required.filter((name) => !loaded[name]);
if (missing.length) fail(`Environment ${environmentId} is missing ${missing.join(", ")}`);

const names = Object.keys(loaded).sort();
const overridden = names.filter((name) => name in process.env);
console.log(`[1password] loaded ${names.length} variables: ${names.join(", ")}`);
if (overridden.length) {
  console.log(`[1password] overriding host values for: ${overridden.join(", ")}`);
}

// The command never needs the token; keep it out of its process.
const env = { ...process.env, ...loaded };
delete env.OP_SERVICE_ACCOUNT_TOKEN;

if (publicOnly) {
  // The host may still hold copies of the Environment's secrets (Railway passes
  // service variables to the build). Drop them too. Count only: the build log
  // should name nothing but the public variables.
  const withheld = Object.keys(all).filter((name) => !(name in loaded));
  const dropped = withheld.filter((name) => name in env);
  for (const name of dropped) delete env[name];
  console.log(
    `[1password] public only: withheld ${withheld.length} other variables` +
      (dropped.length ? `, removed ${dropped.length} host copies of them` : ""),
  );
}

const child = spawn(command, commandArgs, { env, stdio: "inherit" });

child.on("error", (err) => fail(`could not run ${command}: ${redact(err)}`));

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  process.exit(code ?? 128 + (constants.signals[signal] ?? 0));
});
