// One-shot, idempotent migration of legacy public post comments into Rindle.
//
// Only public comment content and display names cross the boundary. Legacy email addresses, OTPs,
// sessions, notification rows, and anonymous like identifiers remain in the retired D1 database.
// Imported authors use synthetic subjects because the old OTP identities cannot be authenticated by
// Better Auth; their comments remain readable and replyable but cannot impersonate a current user.

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createSqlClient } from "@rindle/sql-client";

const execFileAsync = promisify(execFile);
const LEGACY_WORKER = fileURLToPath(new URL("../../worker/", import.meta.url));
const BATCH_SIZE = 20;
const SELECT_COMMENTS = `SELECT comment.id, comment.slug, comment.commenter_id, comment.parent_id,
    comment.body, comment.created_at, comment.deleted_at, commenter.display_name
  FROM comment
  JOIN commenter ON commenter.id = comment.commenter_id
  ORDER BY comment.created_at ASC, comment.id ASC`;
const UPSERT_COMMENT = `INSERT INTO postComment
  (id, postId, authorId, authorName, parentId, body, createdAt, deletedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    postId = excluded.postId,
    authorId = excluded.authorId,
    authorName = excluded.authorName,
    parentId = excluded.parentId,
    body = excluded.body,
    createdAt = excluded.createdAt,
    deletedAt = excluded.deletedAt`;

function unwrapRows(value) {
  if (!Array.isArray(value)) throw new Error("The comment import must be a JSON array.");
  if (value.length === 0) return [];
  if (value.every((row) => row && typeof row === "object" && "id" in row)) return value;
  const rows = value.flatMap((result) => (Array.isArray(result?.results) ? result.results : []));
  if (rows.length === 0) throw new Error("Wrangler JSON contained no comment rows.");
  return rows;
}

async function legacyRows() {
  const importFile = process.env.COMMENT_IMPORT_FILE?.trim();
  if (importFile) return unwrapRows(JSON.parse(await readFile(importFile, "utf8")));

  const { stdout } = await execFileAsync(
    "pnpm",
    [
      "--dir",
      LEGACY_WORKER,
      "exec",
      "wrangler",
      "d1",
      "execute",
      "thought",
      "--remote",
      "--command",
      SELECT_COMMENTS,
      "--json",
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  );
  return unwrapRows(JSON.parse(stdout));
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
  return number;
}

function optionalNumber(value, label) {
  return value === null || value === undefined ? null : finiteNumber(value, label);
}

function normalize(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Legacy comment row is not an object.");
  }
  const id = finiteNumber(row.id, "comment id");
  const commenterId = finiteNumber(row.commenter_id, `comment ${id} commenter id`);
  if (typeof row.slug !== "string" || !row.slug.trim()) {
    throw new Error(`Comment ${id} is missing its post slug.`);
  }
  if (typeof row.body !== "string") throw new Error(`Comment ${id} is missing its body.`);
  const authorName = typeof row.display_name === "string" && row.display_name.trim()
    ? row.display_name.trim()
    : "Legacy reader";
  const deletedAt = optionalNumber(row.deleted_at, `comment ${id} deleted_at`);
  return {
    id: `legacy-comment:${id}`,
    postId: row.slug.trim(),
    authorId: `legacy-commenter:${commenterId}`,
    authorName,
    parentId: row.parent_id === null || row.parent_id === undefined
      ? null
      : `legacy-comment:${finiteNumber(row.parent_id, `comment ${id} parent id`)}`,
    body: deletedAt === null ? row.body : "",
    createdAt: finiteNumber(row.created_at, `comment ${id} created_at`),
    deletedAt,
  };
}

async function assertTargetPosts(sql, comments) {
  const postIds = [...new Set(comments.map((comment) => comment.postId))];
  const found = new Set();
  for (let index = 0; index < postIds.length; index += 100) {
    const batch = postIds.slice(index, index + 100);
    const placeholders = batch.map(() => "?").join(", ");
    const { results } = await sql.batch(
      [{ sql: `SELECT id FROM post WHERE id IN (${placeholders})`, args: batch, wantRows: true }],
      { consistency: "strong" },
    );
    for (const row of results[0].rows) found.add(String(row[0]));
  }
  const missing = postIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(`Comments reference posts that are absent from Rindle: ${missing.join(", ")}`);
  }
}

async function main() {
  const url = process.env.RINDLE_URL;
  const authToken = process.env.RINDLE_DATABASE_TOKEN;
  if (!url || !authToken) {
    throw new Error("RINDLE_URL + RINDLE_DATABASE_TOKEN are required — run with `pnpm import:comments`.");
  }

  const comments = (await legacyRows()).map(normalize);
  const sql = createSqlClient({ url, authToken });
  await assertTargetPosts(sql, comments);
  if (process.env.COMMENT_DRY_RUN === "1") {
    console.log(`Validated ${comments.length} legacy comments and all referenced Rindle posts.`);
    return;
  }

  let written = 0;
  for (let index = 0; index < comments.length; index += BATCH_SIZE) {
    const batch = comments.slice(index, index + BATCH_SIZE);
    await sql.withTransaction((tx) =>
      tx.batch(
        batch.map((comment) => ({
          sql: UPSERT_COMMENT,
          args: [
            comment.id,
            comment.postId,
            comment.authorId,
            comment.authorName,
            comment.parentId,
            comment.body,
            comment.createdAt,
            comment.deletedAt,
          ],
        })),
      ),
    );
    written += batch.length;
    process.stdout.write(`\r  upserted ${written}/${comments.length}`);
  }
  if (comments.length > 0) process.stdout.write("\n");
  console.log(`Done — ${written} legacy comments moved from D1 to Rindle.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
