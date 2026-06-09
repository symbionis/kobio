import { overridesFromLines } from "../quote/overrides";
import type { Line } from "../quote/types";
import type { OwnerScope } from "./auth";
import type { OverrideRow } from "./types";

/**
 * Persist a quote's rate overrides. Idempotent — clears the quote's prior
 * overrides then writes the current set, so re-saving never duplicates rows.
 * Runs through the owner's user client (RLS); each row's owner_id is the parent
 * quote's owner (= scope.ownerId), so an override can never outlive its tenant.
 */
export async function logOverrides(
  scope: OwnerScope,
  quoteId: string,
  lines: Line[],
): Promise<void> {
  const del = await scope.supabase.from("override_log").delete().eq("quote_id", quoteId);
  if (del.error) throw new Error(`logOverrides (clear) failed: ${del.error.message}`);

  const entries = overridesFromLines(lines);
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({ quote_id: quoteId, owner_id: scope.ownerId, ...e }));
  const { error } = await scope.supabase.from("override_log").insert(rows);
  if (error) throw new Error(`logOverrides (insert) failed: ${error.message}`);
}

export async function listOverrides(scope: OwnerScope, quoteId: string): Promise<OverrideRow[]> {
  const { data, error } = await scope.supabase
    .from("override_log")
    .select()
    .eq("quote_id", quoteId);
  if (error) throw new Error(`listOverrides failed: ${error.message}`);
  return (data as OverrideRow[]) ?? [];
}
