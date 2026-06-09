import "dotenv/config";
import { listAllArticles } from "../src/bexio/articles.js";
import { unitNameById } from "../src/bexio/units.js";

/**
 * Run: npm run catalog
 *
 * Joins each article to its unit name and prints:  name | price | unit
 *
 * Why: the unit is what lets a voice-note quantity ("30 mètres carrés de
 * plafond") map to the right catalog line and its per-unit price. This script
 * is how we eyeball whether prices are per m², per hour, per roll, etc.
 *
 * Read-only. Articles and units are both fetched live via GET.
 */

async function main() {
  const [articles, units] = await Promise.all([
    listAllArticles(),
    unitNameById(),
  ]);

  // Column widths sized to the data so the table stays readable.
  const rows = articles.map((a) => {
    const name = a.intern_name ?? a.intern_code ?? `#${a.id}`;
    const price =
      a.sale_price != null ? Number(a.sale_price).toFixed(2) : "—";
    const unit =
      a.unit_id != null ? units.get(a.unit_id) ?? `unit#${a.unit_id}` : "—";
    return { name, price, unit };
  });

  const nameW = Math.max(...rows.map((r) => r.name.length), "name".length);
  const priceW = Math.max(...rows.map((r) => r.price.length), "price".length);

  const line = (n: string, p: string, u: string) =>
    `${n.padEnd(nameW)}  |  ${p.padStart(priceW)}  |  ${u}`;

  console.log(line("name", "price", "unit"));
  console.log("-".repeat(nameW + priceW + 12));
  for (const r of rows) console.log(line(r.name, r.price, r.unit));

  // Surface the gap rather than letting it hide: most lines have no unit.
  const withUnit = rows.filter((r) => r.unit !== "—").length;
  const withPrice = rows.filter((r) => r.price !== "—").length;
  console.log(
    `\n${articles.length} articles · ${withPrice} priced · ${withUnit} with a unit`,
  );
  if (withUnit < articles.length) {
    console.log(
      "Most lines carry no unit (forfait pricing). For those, a voice-note\n" +
        "quantity has no unit to map onto — flag for the extraction step.",
    );
  }
}

main().catch((err) => {
  console.error("\n✗ Catalog print failed:");
  console.error(`  ${err.message}`);
  process.exit(1);
});
