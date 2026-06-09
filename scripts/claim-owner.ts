/**
 * Claim the single-owner sentinel data onto a real account, then seed its
 * catalog. Reassigns owner_id from OWNER_ID → <target-uuid> across the
 * owner-scoped tables and seeds articles from refs/catalog.json. Idempotent
 * (re-run is a no-op once nothing is sentinel-owned). Service-role admin client.
 *
 *   npx tsx scripts/claim-owner.ts <target-uuid> [--dry-run]
 *
 * Find the uuid in Supabase → Authentication → Users (or auth.users.id).
 * Always --dry-run first; back up the affected rows before the real run.
 */

import "dotenv/config";
import { adminClient } from "../src/db/client";
import { OWNER_ID } from "../src/db/owner";
import { seedArticlesFromSnapshot } from "../src/db/seed";

const TABLES = ["company_profile", "clients", "quotes", "override_log"] as const;

const target = process.argv[2]?.trim();
const dryRun = process.argv.includes("--dry-run");
if (!target || target.startsWith("--")) {
  console.error("Usage: tsx scripts/claim-owner.ts <target-uuid> [--dry-run]");
  process.exit(1);
}

const db = adminClient();

// Pre-flight: the target must be a real auth user (guards against a mistyped uuid).
const { data: userData, error: userErr } = await db.auth.admin.getUserById(target);
if (userErr || !userData?.user) {
  console.error(`Target user ${target} not found in auth.users — aborting.`);
  process.exit(1);
}
console.log(`Target: ${userData.user.email ?? "(no email)"} (${target})`);

for (const t of TABLES) {
  const { count } = await db.from(t).select("*", { count: "exact", head: true }).eq("owner_id", OWNER_ID);
  console.log(`  ${t}: ${count ?? 0} sentinel row(s)`);
}

if (dryRun) {
  console.log("Dry run — no changes made.");
  process.exit(0);
}

for (const t of TABLES) {
  const { error } = await db.from(t).update({ owner_id: target }).eq("owner_id", OWNER_ID);
  if (error) {
    console.error(`claim ${t} failed: ${error.message}`);
    process.exit(1);
  }
}

const seeded = await seedArticlesFromSnapshot(db, target);
console.log(`Claimed sentinel rows → ${target}; seeded ${seeded} article(s).`);
