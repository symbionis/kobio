import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The catalog snapshot, compacted for use as LLM context. The catalog is
 * memory, not source of truth (CLAUDE.md) — the extractor uses it to propose
 * candidate matches, never to override a spoken price.
 */
export interface CatalogEntry {
  id: number;
  code: string;
  name: string;
  price: number | null;
}

interface RawArticle {
  id: number;
  intern_code?: string | null;
  intern_name?: string | null;
  sale_price?: string | null;
}

/**
 * Load and compact refs/catalog.json. Resilient: that file is gitignored client
 * data, so if it is absent we return [] and the extractor still runs — it just
 * proposes no catalog candidates (confidence "none"), which the schema allows.
 */
export async function loadCatalog(): Promise<CatalogEntry[]> {
  try {
    const file = path.join(process.cwd(), "refs", "catalog.json");
    const raw = await readFile(file, "utf8");
    const articles = JSON.parse(raw) as RawArticle[];
    return articles.map((a) => ({
      id: a.id,
      code: a.intern_code ?? "",
      name: a.intern_name ?? "",
      price: a.sale_price != null ? Number(a.sale_price) : null,
    }));
  } catch {
    return [];
  }
}

/** One article per line: "id | code | name | price" — compact context for the prompt. */
export function catalogToPromptText(entries: CatalogEntry[]): string {
  if (entries.length === 0) return "(catalogue indisponible)";
  return entries.map((e) => `${e.id} | ${e.code} | ${e.name} | ${e.price ?? "—"}`).join("\n");
}
