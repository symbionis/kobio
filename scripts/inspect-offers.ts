import "dotenv/config";
import { listAllArticles } from "../src/bexio/articles.js";
import { unitNameById } from "../src/bexio/units.js";
import {
  listOffers,
  getOffer,
  isPricedPosition,
  type KbPositionPriced,
} from "../src/bexio/offers.js";

/**
 * Run: npm run offers
 *
 * Pulls the 5 most recent offers and dumps every line item:
 *   article ref (id + catalog name if linked) · qty · unit price · unit ·
 *   line total · [catalog | free-text]
 *
 * Read-only. Three GET endpoints (kb_offer, article, unit). No writes.
 */

// Catalog prices that are obviously per-m² rates (walls/ceilings/finishes).
// Used only to answer "does he enter real m² or qty 1 + adjusted price?".
const PER_SQM_ARTICLE_IDS = new Set([7, 10, 11, 14, 15, 16, 17, 26, 28]);

function clean(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const num = (s: string | null) => (s == null ? NaN : Number(s));

async function main() {
  const [articles, unitNames, allOffers] = await Promise.all([
    listAllArticles(),
    unitNameById(),
    listOffers(),
  ]);

  const articleName = new Map(articles.map((a) => [a.id, a.intern_name]));

  const recent = [...allOffers]
    .sort(
      (a, b) =>
        (b.is_valid_from ?? "").localeCompare(a.is_valid_from ?? "") ||
        b.id - a.id,
    )
    .slice(0, 5);

  // Accumulators for the summary.
  let nArticle = 0;
  let nCustom = 0;
  const articleAmounts: { id: number; amount: number; price: number }[] = [];
  const referencedArticleIds = new Set<number>();
  const customTexts: string[] = [];
  let priceOverrides = 0; // article line price != catalog sale_price

  for (const o of recent) {
    const full = await getOffer(o.id);
    console.log(
      `\n━━ ${full.document_nr}  "${full.title ?? ""}"  ${full.is_valid_from}  total ${full.total} (status ${full.kb_item_status_id})`,
    );
    const priced = full.positions.filter(isPricedPosition);
    for (const p of priced as KbPositionPriced[]) {
      const linked = p.type === "KbPositionArticle";
      const amount = num(p.amount);
      const price = num(p.unit_price);
      const unit =
        p.unit_name ??
        (p.unit_id != null ? unitNames.get(p.unit_id) ?? `#${p.unit_id}` : "—");
      const ref = linked
        ? `art#${p.article_id} ${articleName.get(p.article_id!) ?? "(unknown)"}`
        : "(free text)";
      const label = clean(p.text).slice(0, 50);

      console.log(
        `  [${linked ? "CATALOG " : "FREETEXT"}] qty ${amount}  × ${price.toFixed(2)}  ${unit.padEnd(4)}  = ${num(p.position_total).toFixed(2)}`,
      );
      console.log(`             ${ref}`);
      if (label && clean(p.text) !== "") console.log(`             “${label}”`);

      if (linked) {
        nArticle++;
        referencedArticleIds.add(p.article_id!);
        articleAmounts.push({ id: p.article_id!, amount, price });
        const cat = articles.find((a) => a.id === p.article_id);
        if (cat?.sale_price != null && Number(cat.sale_price) !== price)
          priceOverrides++;
      } else {
        nCustom++;
        customTexts.push(clean(p.text));
      }
    }
  }

  // ---- Summary ----
  console.log("\n\n══════════ SUMMARY (5 most recent offers) ══════════");
  console.log(`Priced lines: ${nArticle} catalog-linked · ${nCustom} free-text`);
  console.log(
    `Catalog-linked lines whose price ≠ catalog sale_price: ${priceOverrides}/${nArticle}`,
  );

  // Q1: quantity behaviour, focusing on per-m² articles.
  const qtyEq1 = articleAmounts.filter((a) => a.amount === 1).length;
  const qtyGt1 = articleAmounts.filter((a) => a.amount > 1).length;
  console.log(`\nArticle-line quantities: ${qtyEq1} are exactly 1, ${qtyGt1} are >1`);
  const sqm = articleAmounts.filter((a) => PER_SQM_ARTICLE_IDS.has(a.id));
  console.log(
    `Per-m² articles seen ${sqm.length}× → amounts: ${sqm.map((a) => `${a.amount}@${a.price}`).join(", ") || "(none)"}`,
  );

  // Q2: linking vs retyping.
  console.log(
    `\nDistinct catalog articles referenced: ${referencedArticleIds.size}/24  [${[...referencedArticleIds].sort((a, b) => a - b).join(", ")}]`,
  );
  const neverUsed = articles
    .map((a) => a.id)
    .filter((id) => !referencedArticleIds.has(id));
  console.log(`Catalog articles never referenced: [${neverUsed.join(", ")}]`);

  // Q3: recurring free-text lines (potential missing catalog entries).
  const freq = new Map<string, number>();
  for (const t of customTexts) {
    const key = t.slice(0, 40).toLowerCase();
    if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  const recurring = [...freq.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);
  console.log(`\nFree-text lines total: ${customTexts.length}`);
  console.log(
    recurring.length
      ? `Recurring free-text (≥2×):\n${recurring.map(([t, n]) => `  ${n}× “${t}…”`).join("\n")}`
      : "Recurring free-text (≥2×): none in this window",
  );
}

main().catch((err) => {
  console.error("\n✗ Offer inspection failed:");
  console.error(`  ${err.message}`);
  process.exit(1);
});
