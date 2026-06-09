import type { OwnerScope } from "./auth";
import type { ClientRow } from "./types";

export interface SaveClientInput {
  id?: string;
  name: string;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
}

/** Create or update a client, owned by the signed-in user (RLS-scoped). */
export async function saveClient(scope: OwnerScope, input: SaveClientInput): Promise<ClientRow> {
  if (!input.name.trim()) throw new Error("Client name is required.");
  const row = {
    ...(input.id ? { id: input.id } : {}),
    owner_id: scope.ownerId,
    name: input.name.trim(),
    address: input.address,
    postcode: input.postcode,
    city: input.city,
    country: input.country,
    email: input.email,
    phone: input.phone,
  };
  const { data, error } = await scope.supabase.from("clients").upsert(row).select().single();
  if (error) throw new Error(`saveClient failed: ${error.message}`);
  return data as ClientRow;
}

export async function listClients(scope: OwnerScope): Promise<ClientRow[]> {
  const { data, error } = await scope.supabase
    .from("clients")
    .select()
    .eq("owner_id", scope.ownerId)
    .order("name", { ascending: true });
  if (error) throw new Error(`listClients failed: ${error.message}`);
  return (data as ClientRow[]) ?? [];
}

export async function getClient(scope: OwnerScope, id: string): Promise<ClientRow | null> {
  const { data, error } = await scope.supabase
    .from("clients")
    .select()
    .eq("id", id)
    .eq("owner_id", scope.ownerId)
    .maybeSingle();
  if (error) throw new Error(`getClient failed: ${error.message}`);
  return (data as ClientRow) ?? null;
}
