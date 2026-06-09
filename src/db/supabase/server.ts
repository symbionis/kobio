import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The request-scoped, session-authenticated Supabase client. RLS applies, so
 * `auth.uid()` resolves to the signed-in user and queries are tenant-isolated.
 * This is what the data layer uses for all owner-facing reads and writes.
 *
 * Created per request (never cached in a module global) — it reads the session
 * from the request cookies via `next/headers`, which is only valid within a
 * request scope.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when the browser-safe auth env is configured. */
export function hasBrowserAuthConfig(): boolean {
  return Boolean(URL && KEY);
}

export async function userClient(): Promise<SupabaseClient> {
  if (!URL || !KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set (see .env.example).",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component (read-only cookies). Safe to ignore —
          // the proxy (proxy.ts) refreshes the session on every request.
        }
      },
    },
  });
}
