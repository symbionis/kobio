import "dotenv/config";
import { writeFileSync } from "node:fs";
import { bexio } from "../src/bexio/client.js";
import { listAllArticles } from "../src/bexio/articles.js";

/**
 * Run: npm run smoke
 *
 * Three checks, in order of what they prove:
 *  1. Auth works            — company_profile returns, no 401
 *  2. Catalog exists        — articles come back
 *  3. Snapshot for dev      — write refs/catalog.json for offline work
 *
 * Nothing here writes to Bexio. Read-only.
 */

async function main() {
  console.log("→ Check 1: authenticating...");
  const profile = await bexio.get<any>("/2.0/company_profile");
  // company_profile returns an array on most accounts
  const company = Array.isArray(profile) ? profile[0] : profile;
  console.log(`  OK. Company: ${company?.name ?? "(name field not found)"}`);

  console.log("→ Check 2: pulling article catalog...");
  const articles = await listAllArticles();
  console.log(`  OK. ${articles.length} article(s) found.`);

  if (articles.length === 0) {
    console.log(
      "  ⚠ Empty catalog. He may build quotes from free-text lines rather\n" +
        "    than a structured article list. Worth confirming before extraction.",
    );
  } else {
    console.log("  First few:");
    for (const a of articles.slice(0, 5)) {
      const name = a.intern_name ?? a.intern_code ?? `#${a.id}`;
      const price = a.sale_price ?? "—";
      console.log(`    - ${name}  (${price})`);
    }
  }

  console.log("→ Check 3: writing refs/catalog.json (gitignored)...");
  writeFileSync(
    new URL("../refs/catalog.json", import.meta.url),
    JSON.stringify(articles, null, 2),
  );
  console.log("  OK. Snapshot saved for offline development.");

  console.log("\nDone. Auth is live and the catalog is in hand.");
}

main().catch((err) => {
  console.error("\n✗ Smoke test failed:");
  console.error(`  ${err.message}`);
  console.error(
    "\nIf this is a 401, the token is wrong or expired — regenerate at\n" +
      "developer.bexio.com/pat. If it's a network error, check connectivity.",
  );
  process.exit(1);
});
