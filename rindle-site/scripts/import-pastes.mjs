// One-shot, idempotent migration of the legacy Cloudflare D1 `paste` table into Rindle.
//
// By default this asks the sibling Worker project for its remote D1 rows using Wrangler, then writes
// them to the Rindle connection injected by `rindle exec`:
//
//   pnpm import:pastes
//
// For an offline/exported run, point PASTE_IMPORT_FILE at either Wrangler's JSON output or a plain
// JSON array of rows. Legacy rows predate account subjects, so they receive the explicit provenance
// `legacy:tantaman` unless PASTE_AUTHOR_ID is provided. The server still admin-gates every write.

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createSqlClient } from "@rindle/sql-client";

const execFileAsync = promisify(execFile);
const LEGACY_WORKER = fileURLToPath(new URL("../../worker/", import.meta.url));
const BATCH_SIZE = 10;
const SELECT_PASTES = `SELECT id, body, language, title, created_at, parent_id, shared, shared_at
  FROM paste ORDER BY created_at ASC, id ASC`;
const UPSERT_PASTE = `INSERT INTO paste
  (id, authorId, body, language, title, createdAt, parentId, shared, sharedAt, excerpt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    authorId = excluded.authorId,
    body = excluded.body,
    language = excluded.language,
    title = excluded.title,
    createdAt = excluded.createdAt,
    parentId = excluded.parentId,
    shared = excluded.shared,
    sharedAt = excluded.sharedAt,
    excerpt = excluded.excerpt`;

function excerpt(body, maxLength = 300) {
  const plain = String(body)
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`~\[\]()>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
}

function unwrapRows(value) {
  if (!Array.isArray(value)) throw new Error("The paste import must be a JSON array.");
  if (value.length === 0) return [];
  if (value.every((row) => row && typeof row === "object" && "id" in row)) return value;
  const rows = value.flatMap((result) => Array.isArray(result?.results) ? result.results : []);
  if (rows.length === 0) throw new Error("Wrangler JSON contained no result rows.");
  return rows;
}

async function legacyRows() {
  const importFile = process.env.PASTE_IMPORT_FILE?.trim();
  if (importFile) return unwrapRows(JSON.parse(await readFile(importFile, "utf8")));

  const { stdout } = await execFileAsync(
    "pnpm",
    ["--dir", LEGACY_WORKER, "exec", "wrangler", "d1", "execute", "thought", "--remote", "--command", SELECT_PASTES, "--json"],
    { maxBuffer: 100 * 1024 * 1024 },
  );
  return unwrapRows(JSON.parse(stdout));
}

function normalize(row, authorId) {
  if (!row || typeof row !== "object") throw new Error("Paste import row is not an object.");
  if (typeof row.id !== "string" || typeof row.body !== "string") {
    throw new Error("Paste import row is missing its text id/body.");
  }
  return [
    row.id,
    authorId,
    row.body,
    typeof row.language === "string" ? row.language : "markdown",
    typeof row.title === "string" ? row.title : null,
    Number(row.created_at),
    typeof row.parent_id === "string" ? row.parent_id : null,
    Number(row.shared) === 1 ? 1 : 0,
    Number(row.shared) === 1 && Number.isFinite(Number(row.shared_at)) ? Number(row.shared_at) : null,
    excerpt(row.body),
  ];
}

async function main() {
  const url = process.env.RINDLE_URL;
  const authToken = process.env.RINDLE_DATABASE_TOKEN;
  if (!url || !authToken) {
    throw new Error("RINDLE_URL + RINDLE_DATABASE_TOKEN are required — run with `pnpm import:pastes`.");
  }
  const authorId = process.env.PASTE_AUTHOR_ID?.trim() || "legacy:tantaman";
  const rows = (await legacyRows()).map((row) => normalize(row, authorId));
  const sql = createSqlClient({ url, authToken });

  let written = 0;
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    await sql.withTransaction((tx) => tx.batch(batch.map((args) => ({ sql: UPSERT_PASTE, args }))));
    written += batch.length;
    process.stdout.write(`\r  upserted ${written}/${rows.length}`);
  }
  if (rows.length > 0) process.stdout.write("\n");
  console.log(`Done — ${written} legacy pastes moved from D1 to Rindle (${authorId}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
