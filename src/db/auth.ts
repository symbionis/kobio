import type { SupabaseClient } from "@supabase/supabase-js";
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

/** Optional session — for public surfaces (e.g. the parse endpoint). null when anonymous. */
export async function getOptionalOwner(): Promise<OwnerScope | null> {
  const supabase = await userClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, ownerId: data.user.id } : null;
}

/** Require a session. Returns the user client + owner id, or throws UnauthorizedError. */
export async function requireOwner(): Promise<OwnerScope> {
  const scope = await getOptionalOwner();
  if (!scope) throw new UnauthorizedError();
  return scope;
}
