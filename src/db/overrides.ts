import { overridesFromLines } from "../quote/overrides";
import type { Line } from "../quote/types";
import { db } from "./client";
import type { OverrideRow } from "./types";

/**
 * Persist a quote's rate overrides. Idempotent — clears the quote's prior
 * overrides then writes the current set, so re-saving never duplicates rows.
 */
export async function logOverrides(quoteId: string, lines: Line[]): Promise<void> {
  const del = await db().from("override_log").delete().eq("quote_id", quoteId);
  if (del.error) throw new Error(`logOverrides (clear) failed: ${del.error.message}`);

  const entries = overridesFromLines(lines);
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({ quote_id: quoteId, ...e }));
  const { error } = await db().from("override_log").insert(rows);
  if (error) throw new Error(`logOverrides (insert) failed: ${error.message}`);
}

export async function listOverrides(quoteId: string): Promise<OverrideRow[]> {
  const { data, error } = await db().from("override_log").select().eq("quote_id", quoteId);
  if (error) throw new Error(`listOverrides failed: ${error.message}`);
  return (data as OverrideRow[]) ?? [];
}
