import type { OwnerScope } from "./auth";
import type { ArticleRow } from "./types";

export interface SaveArticleInput {
  id?: string;
  bexio_article_id?: number | null;
  code: string | null;
  name: string;
  price: number | null;
  unit: string | null;
  trade: string | null;
}

/**
 * List the owner's active articles, optionally scoped to a trade. When a trade
 * is given, untagged articles (trade IS NULL) are still included — a seeded
 * catalog (all NULL) stays available for any trade, and tagging only *adds*
 * specificity. The filter narrows the LLM candidate set (KTD-H); it never
 * changes the spoken-price rule. RLS also enforces the owner boundary.
 */
export async function listArticles(scope: OwnerScope, trade?: string | null): Promise<ArticleRow[]> {
  let query = scope.supabase
    .from("articles")
    .select()
    .eq("owner_id", scope.ownerId)
    .eq("archived", false);
  if (trade) query = query.or(`trade.eq.${trade},trade.is.null`);
  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw new Error(`listArticles failed: ${error.message}`);
  return (data as ArticleRow[]) ?? [];
}

export async function getArticle(scope: OwnerScope, id: string): Promise<ArticleRow | null> {
  const { data, error } = await scope.supabase
    .from("articles")
    .select()
    .eq("id", id)
    .eq("owner_id", scope.ownerId)
    .maybeSingle();
  if (error) throw new Error(`getArticle failed: ${error.message}`);
  return (data as ArticleRow) ?? null;
}

/** Create or update an article, owned by the signed-in user. */
export async function upsertArticle(scope: OwnerScope, input: SaveArticleInput): Promise<ArticleRow> {
  if (!input.name.trim()) throw new Error("Article name is required.");
  const row = {
    ...(input.id ? { id: input.id } : {}),
    owner_id: scope.ownerId,
    bexio_article_id: input.bexio_article_id ?? null,
    code: input.code,
    name: input.name.trim(),
    price: input.price,
    unit: input.unit,
    trade: input.trade,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await scope.supabase.from("articles").upsert(row).select().single();
  if (error) throw new Error(`upsertArticle failed: ${error.message}`);
  return data as ArticleRow;
}

/** Soft-delete: archived articles drop out of listings and candidate sets. */
export async function archiveArticle(scope: OwnerScope, id: string): Promise<void> {
  const { error } = await scope.supabase
    .from("articles")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", scope.ownerId);
  if (error) throw new Error(`archiveArticle failed: ${error.message}`);
}
