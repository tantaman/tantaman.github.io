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
import { pathToFileURL, fileURLToPath } from "node:url";
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
  ON CONFLICT(id) DO NOTHING`;

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

const SELECT_ATTACHMENTS = `SELECT id, paste_id, attachment_key, attachment_type, attachment_name, size, created_at
  FROM paste_attachment ORDER BY id ASC`;

async function legacyAttachmentRows() {
  const importFile = process.env.PASTE_ATTACHMENT_IMPORT_FILE?.trim();
  if (importFile) return unwrapRows(JSON.parse(await readFile(importFile, "utf8")));
  if (process.env.PASTE_IMPORT_FILE?.trim()) return [];
  const { stdout } = await execFileAsync("pnpm", [
    "--dir", LEGACY_WORKER, "exec", "wrangler", "d1", "execute", "thought", "--remote",
    "--command", SELECT_ATTACHMENTS, "--json",
  ], { maxBuffer: 100 * 1024 * 1024 });
  return unwrapRows(JSON.parse(stdout));
}

export function normalizeAttachments(rows) {
  const newest = new Map();
  for (const row of rows) {
    if (typeof row.paste_id !== "string" || typeof row.attachment_key !== "string" ||
        typeof row.attachment_name !== "string" || !Number.isFinite(Number(row.id)) ||
        !Number.isFinite(Number(row.size)) || Number(row.size) < 0) throw new Error("Invalid legacy attachment row.");
    const nameKey = JSON.stringify([row.paste_id, row.attachment_name]);
    const prior = newest.get(nameKey);
    if (!prior || Number(row.id) > Number(prior.id)) newest.set(nameKey, row);
  }
  const positions = new Map();
  return [...newest.values()].sort((a, b) => Number(a.id) - Number(b.id)).map((row) => {
    const position = positions.get(row.paste_id) ?? 0;
    positions.set(row.paste_id, position + 1);
    return {
      id: `legacy:paste-attachment:${row.id}`, pasteId: row.paste_id, storageKey: row.attachment_key,
      mediaType: row.attachment_type || "application/octet-stream", fileName: row.attachment_name,
      size: Number(row.size), createdAt: Number(row.created_at), position,
    };
  });
}

export function attachmentImportStatements(row) {
  return [{
    sql: `INSERT INTO pasteFile (id, fileName, mediaType, size, createdAt, state)
          VALUES (?, ?, ?, ?, ?, 'active') ON CONFLICT(id) DO NOTHING`,
    args: [row.storageKey, row.fileName, row.mediaType, row.size, row.createdAt],
  }, {
    sql: `INSERT INTO pasteAttachment (id, pasteId, storageKey, mediaType, fileName, size, createdAt, position)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?
          WHERE EXISTS (SELECT 1 FROM paste WHERE id = ?)
            AND EXISTS (SELECT 1 FROM pasteFile WHERE id = ? AND state = 'active')
            AND NOT EXISTS (SELECT 1 FROM pasteAttachment WHERE pasteId = ? AND fileName = ?)
          ON CONFLICT(id) DO NOTHING`,
    args: [row.id, row.pasteId, row.storageKey, row.mediaType, row.fileName, row.size, row.createdAt,
      row.position, row.pasteId, row.storageKey, row.pasteId, row.fileName],
  }];
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
  const attachments = normalizeAttachments(await legacyAttachmentRows());
  for (let index = 0; index < attachments.length; index += BATCH_SIZE) {
    const statements = attachments.slice(index, index + BATCH_SIZE).flatMap(attachmentImportStatements);
    await sql.withTransaction((tx) => tx.batch(statements));
  }
  console.log(`Done — ${written} pastes and ${attachments.length} attachment references imported (${authorId}). R2 keys preserved.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
