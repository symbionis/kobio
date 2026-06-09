import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The server-side Supabase client — the ONLY module that imports the SDK.
 * Routes and the rest of the data layer go through the typed CRUD modules, never
 * the client directly.
 *
 * Uses the service-role key (KTD1/KTD3): it bypasses RLS, so the single-owner
 * server-side access works while the anon/publishable keys stay denied. The key
 * lives in .env (gitignored) and is never sent to the browser.
 */
let cached: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env (see .env.example).",
    );
  }
  cached = createClient(url, key, {
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
  return cached;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
