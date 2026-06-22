/**
 * One-time seed script to load existing JSON report files into the DHA API.
 *
 * Usage:
 *   DHA_ADMIN_SECRET=xxx npx tsx worker/scripts/seed-dha.ts [base_url]
 *
 * Uploads require the admin secret (writes are admin-only).
 * base_url defaults to https://tantaman.com
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const secret = process.env.DHA_ADMIN_SECRET;
if (!secret) {
  console.error("DHA_ADMIN_SECRET env var is required");
  process.exit(1);
}

const baseUrl = process.argv[2] || "https://tantaman.com";
const dataDir = join(import.meta.dirname, "../../packages/dha-report-app/data");

const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const date = file.replace(".json", "");
  const data = JSON.parse(readFileSync(join(dataDir, file), "utf-8"));

  console.log(`Upserting ${date}...`);
  const res = await fetch(`${baseUrl}/api/dha/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ report_date: date, data }),
  });

  if (!res.ok) {
    console.error(`  FAILED ${res.status}: ${await res.text()}`);
  } else {
    console.log(`  OK`);
  }
}

console.log("Done.");
