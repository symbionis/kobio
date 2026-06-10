import type { OwnerScope } from "./auth";
import type { UserRow } from "./types";

export interface SaveUserInput {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

/** The signed-in person's profile row (auto-created at signup by a trigger). */
export async function getUser(scope: OwnerScope): Promise<UserRow | null> {
  const { data, error } = await scope.supabase
    .from("users")
    .select()
    .eq("id", scope.ownerId)
    .maybeSingle();
  if (error) throw new Error(`getUser failed: ${error.message}`);
  return (data as UserRow) ?? null;
}

/**
 * Update the person's editable fields. The row already exists (trigger), so this
 * is an update on the own row (RLS-scoped). Email is owned by auth and synced by
 * a trigger — it is never written here.
 */
export async function saveUser(scope: OwnerScope, input: SaveUserInput): Promise<UserRow> {
  const { data, error } = await scope.supabase
    .from("users")
    .update({
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scope.ownerId)
    .select()
    .single();
  if (error) throw new Error(`saveUser failed: ${error.message}`);
  return data as UserRow;
}
