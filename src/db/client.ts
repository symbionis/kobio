import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role Supabase client. It bypasses RLS, so it is reserved for
 * admin-only operations that must read/write across tenants: the one-time data
 * claim/backfill and the catalog seed (KTD-E). Owner-facing reads and writes go
 * through the request-scoped user client in `./supabase/server.ts` instead.
 *
 * `app/**` must never import this module — only `scripts/**` (e.g.
 * `scripts/claim-owner.ts`, `scripts/seed-articles.ts`) and `src/db/seed.ts`.
 * The key lives in .env (gitignored) and is never sent to the browser.
 *
 * Created per call (no module-global cache) so it cannot leak request-scoped
 * state across Fluid Compute invocations.
 */
export function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env (see .env.example).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    // Bound every DB call so a hung Supabase request can't hang the route.
    global: {
      fetch: (input, init) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        return fetch(input, { ...init, signal: controller.signal }).finally(() =>
          clearTimeout(timer),
        );
      },
    },
  });
}

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
