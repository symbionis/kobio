/**
 * Seed a builder's catalog from refs/catalog.json into the articles table.
 * Idempotent — safe to re-run. Uses the service-role admin client.
 *
 *   npx tsx scripts/seed-articles.ts <owner-uuid>
 */

import "dotenv/config";
import { adminClient } from "../src/db/client";
import { seedArticlesFromSnapshot } from "../src/db/seed";

const ownerId = process.argv[2]?.trim();
if (!ownerId) {
  console.error("Usage: tsx scripts/seed-articles.ts <owner-uuid>");
  process.exit(1);
}

const n = await seedArticlesFromSnapshot(adminClient(), ownerId);
console.log(`Seeded ${n} article(s) for ${ownerId}.`);
