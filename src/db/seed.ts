import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCatalog } from "../catalog";

/**
 * Seed a target owner's catalog from the refs/catalog.json snapshot. Idempotent
 * on (owner_id, bexio_article_id) — re-running updates rather than duplicates.
 * Takes an admin (service-role) client so it can write across the RLS boundary;
 * used by the claim flow and the seed CLI. Returns the number of articles seeded
 * (0 when the snapshot is absent — new owners simply start empty).
 */
export async function seedArticlesFromSnapshot(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const catalog = await loadCatalog();
  if (catalog.length === 0) return 0;

  const rows = catalog.map((e) => ({
    owner_id: ownerId,
    bexio_article_id: e.id,
    code: e.code || null,
    name: e.name || "Sans nom",
    price: e.price,
    unit: null,
    trade: null,
  }));

  const { error } = await supabase
    .from("articles")
    .upsert(rows, { onConflict: "owner_id,bexio_article_id" });
  if (error) throw new Error(`seedArticlesFromSnapshot failed: ${error.message}`);
  return rows.length;
}
