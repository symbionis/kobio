import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { userClient } from "./supabase/server";

/** Thrown by requireOwner() when no session is present. Routes map it to 401. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** A request-scoped user client plus the signed-in owner id. */
export interface OwnerScope {
  supabase: SupabaseClient;
  ownerId: string;
}

/**
 * Optional session — for public surfaces (e.g. the parse endpoint). null when
 * the request is genuinely anonymous (no session). A failure of the auth backend
 * itself (network, JWT validation, quota) is NOT silently treated as anonymous —
 * it throws, so callers surface a real error instead of degrading to logged-out.
 */
export async function getOptionalOwner(): Promise<OwnerScope | null> {
  const supabase = await userClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error(`auth.getUser failed: ${error.message}`);
  }
  return data.user ? { supabase, ownerId: data.user.id } : null;
}

/** Require a session. Returns the user client + owner id, or throws
 *  UnauthorizedError (no session) / a real Error (auth backend failure). */
export async function requireOwner(): Promise<OwnerScope> {
  const scope = await getOptionalOwner();
  if (!scope) throw new UnauthorizedError();
  return scope;
}

/**
 * Page guard: returns the owner scope, or redirects to /login?next=… when there
 * is no session. Only UnauthorizedError redirects — a real auth-backend failure
 * propagates to the error boundary rather than masquerading as "logged out".
 */
export async function requireOwnerForPage(next: string): Promise<OwnerScope> {
  try {
    return await requireOwner();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    throw err;
  }
}
