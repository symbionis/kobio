import { bexio } from "./client.js";

/**
 * Units = the measurement units Bexio attaches to an article via `unit_id`
 * (m², hour, roll, etc.). This is the missing half of pricing: a sale_price
 * of "65.000000" only means something once you know it's per m² vs per hour.
 *
 * On Nicolas's account only 4 of 24 articles carry a unit_id — most lines are
 * priced as a lump (forfait) with no unit. So the join below will be empty for
 * the majority of the catalog; that's expected, not a bug.
 *
 * Endpoint: GET /2.0/unit. Read-only.
 */

export interface Unit {
  id: number;
  name: string; // e.g. "m²", "h", "Stk." — the label shown on a quote line
}

/** Fetch a page of units. Same pagination shape as /2.0/article. */
export function listUnits(offset = 0, limit = 500): Promise<Unit[]> {
  return bexio.get<Unit[]>("/2.0/unit", { offset, limit });
}

/** Pull every unit by walking pages until a short page comes back. */
export async function listAllUnits(): Promise<Unit[]> {
  const all: Unit[] = [];
  const limit = 500;
  let offset = 0;
  // Guard against runaway loops on a misbehaving endpoint.
  for (let i = 0; i < 50; i++) {
    const page = await listUnits(offset, limit);
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}

/** id → unit name, for joining onto an article's `unit_id`. */
export async function unitNameById(): Promise<Map<number, string>> {
  const units = await listAllUnits();
  return new Map(units.map((u) => [u.id, u.name]));
}
