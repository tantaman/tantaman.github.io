// One-shot, idempotent migration of the legacy Cloudflare D1 thought domain into Rindle.
//
// The default path reads every final-schema table from the sibling Worker in one remote Wrangler
// call, then upserts the normalized rows through the Rindle SQL connection injected by `rindle
// exec`:
//
//   THOUGHT_AUTHOR_ID=<better-auth-subject> pnpm import:thoughts
//
// THOUGHT_IMPORT_FILE may instead point at a JSON object keyed by the SOURCE_QUERIES names below.
// Raw Wrangler JSON from this script's multi-statement query is accepted too. Object bytes are not
// copied: thoughtAttachment/projectAttachment keep their existing R2 storage keys while the index
// metadata moves from D1 to Rindle.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createSqlClient } from "@rindle/sql-client";

const execFileAsync = promisify(execFile);
const LEGACY_WORKER = fileURLToPath(new URL("../../worker/", import.meta.url));
const BATCH_SIZE = 20;
const LEGACY_PROJECTION = "legacy-d1-v1";

// Keep this order stable: Wrangler returns one result object per semicolon-separated SELECT.
const SOURCE_QUERIES = [
  ["thoughts", `SELECT id, body, body_hash, timestamp, updated_at, version, parent_id, color, private
    FROM thought ORDER BY timestamp ASC, id ASC`],
  ["thoughtHistory", `SELECT thought_id, version, body, body_hash, timestamp, created_at
    FROM thought_history ORDER BY thought_id ASC, version ASC`],
  ["thoughtAttachments", `SELECT id, thought_id, attachment_key, attachment_type, attachment_name
    FROM thought_attachment ORDER BY thought_id ASC, id ASC`],
  ["tags", `SELECT id, name FROM tag ORDER BY id ASC`],
  ["thoughtTags", `SELECT thought_id, tag_id FROM thought_tag ORDER BY thought_id ASC, tag_id ASC`],
  ["thoughtEdges", `SELECT source_id, target_id, kind
    FROM thought_edge ORDER BY source_id ASC, target_id ASC, kind ASC`],
  ["tasks", `SELECT id, thought_id, project_id, title, description, created_at, completed_at,
      deprioritized_at, position FROM task ORDER BY created_at ASC, id ASC`],
  ["events", `SELECT id, thought_id, title, description, date_text, date_epoch, created_at
    FROM event ORDER BY created_at ASC, id ASC`],
  ["questions", `SELECT id, thought_id, title, description, created_at, answered_at
    FROM question ORDER BY created_at ASC, id ASC`],
  ["locations", `SELECT id, thought_id, title, description, lat, lng, resolved_name, created_at
    FROM location ORDER BY created_at ASC, id ASC`],
  ["movies", `SELECT id, title, normalized_title, description, poster_url, year, tmdb_id,
      vote_average, vote_count, created_at FROM movie ORDER BY id ASC`],
  ["thoughtMovies", `SELECT thought_id, movie_id, description, created_at
    FROM thought_movie ORDER BY thought_id ASC, movie_id ASC`],
  ["books", `SELECT id, thought_id, title, description, cover_url, author, year, ol_key, created_at
    FROM book ORDER BY created_at ASC, id ASC`],
  ["albums", `SELECT id, title, normalized_title, artist, year, cover_url, itunes_id, genre, created_at
    FROM album ORDER BY id ASC`],
  ["thoughtAlbums", `SELECT thought_id, album_id, description, created_at
    FROM thought_album ORDER BY thought_id ASC, album_id ASC`],
  ["bookmarks", `SELECT id, url, title, image_url, description, site_name, created_at
    FROM bookmark ORDER BY id ASC`],
  ["thoughtBookmarks", `SELECT thought_id, bookmark_id
    FROM thought_bookmark ORDER BY thought_id ASC, bookmark_id ASC`],
  ["amplifications", `SELECT id, url, source, note, title, image_url, description, site_name, created_at
    FROM amplification ORDER BY created_at ASC, id ASC`],
  ["projects", `SELECT id, thought_id, title, description, status, created_at, archived_at
    FROM project ORDER BY created_at ASC, id ASC`],
  ["taskDependencies", `SELECT blocker_task_id, blocked_task_id
    FROM task_dependency ORDER BY blocker_task_id ASC, blocked_task_id ASC`],
  ["projectComments", `SELECT id, project_id, parent_id, body, created_at, updated_at
    FROM project_comment ORDER BY created_at ASC, id ASC`],
  ["projectActivities", `SELECT id, project_id, kind, detail, created_at
    FROM project_activity ORDER BY created_at ASC, id ASC`],
  ["projectItems", `SELECT id, project_id, item_type, item_id, role, position, added_at
    FROM project_item ORDER BY project_id ASC, position ASC, id ASC`],
  ["projectAttachments", `SELECT id, project_id, attachment_key, attachment_type, attachment_name,
      created_at FROM project_attachment ORDER BY project_id ASC, id ASC`],
  ["framings", `SELECT id, name, description, created_at, updated_at
    FROM framing ORDER BY created_at ASC, id ASC`],
  ["framingNodes", `SELECT id, framing_id, node_type, item_id, x, y, w, h
    FROM framing_node ORDER BY framing_id ASC, id ASC`],
  ["framingEdges", `SELECT id, framing_id, source_node_id, target_node_id, label, source_handle,
      target_handle, kind FROM framing_edge ORDER BY framing_id ASC, id ASC`],
  ["clusters", `SELECT id, label, size, created_at FROM cluster ORDER BY id ASC`],
  ["clusterMemberships", `SELECT item_kind, item_id, cluster_id, rank, distance, title, preview
    FROM cluster_membership ORDER BY cluster_id ASC, distance ASC, item_kind ASC, item_id ASC`],
];

function emptySource() {
  return Object.fromEntries(SOURCE_QUERIES.map(([name]) => [name, []]));
}

function rowsFromWrangler(value) {
  if (!Array.isArray(value)) throw new Error("Wrangler thought export must be a JSON array.");
  if (value.length !== SOURCE_QUERIES.length || !value.every((entry) => Array.isArray(entry?.results))) {
    throw new Error(
      `Expected ${SOURCE_QUERIES.length} Wrangler result sets, received ${value.length}. ` +
      "Use a keyed THOUGHT_IMPORT_FILE for a partial/offline import.",
    );
  }
  return Object.fromEntries(SOURCE_QUERIES.map(([name], index) => [name, value[index].results]));
}

function sourceFromFile(value) {
  if (Array.isArray(value)) {
    if (value.every((entry) => entry && typeof entry === "object" && Array.isArray(entry.results))) {
      return rowsFromWrangler(value);
    }
    // A plain array is a convenient core-thought-only offline export.
    if (value.every((entry) => entry && typeof entry === "object" && "id" in entry && "body" in entry)) {
      return { ...emptySource(), thoughts: value };
    }
    throw new Error("Unrecognized THOUGHT_IMPORT_FILE array shape.");
  }
  if (!value || typeof value !== "object") {
    throw new Error("THOUGHT_IMPORT_FILE must contain a keyed object or Wrangler JSON array.");
  }
  const source = emptySource();
  for (const [name] of SOURCE_QUERIES) {
    if (name in value && !Array.isArray(value[name])) {
      throw new Error(`THOUGHT_IMPORT_FILE.${name} must be an array.`);
    }
    if (Array.isArray(value[name])) source[name] = value[name];
  }
  return source;
}

async function loadSource() {
  const importFile = process.env.THOUGHT_IMPORT_FILE?.trim();
  if (importFile) return sourceFromFile(JSON.parse(await readFile(importFile, "utf8")));

  const command = SOURCE_QUERIES.map(([, sql]) => sql).join(";\n");
  const { stdout } = await execFileAsync(
    "pnpm",
    [
      "--dir", LEGACY_WORKER, "exec", "wrangler", "d1", "execute", "thought", "--remote",
      "--command", command, "--json",
    ],
    { maxBuffer: 200 * 1024 * 1024 },
  );
  return rowsFromWrangler(JSON.parse(stdout));
}

function rowObject(row, label) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error(`${label} row is not an object.`);
  }
  return row;
}

function id(value, label) {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).length === 0) {
    throw new Error(`${label} is missing an id.`);
  }
  return String(value);
}

function optionalId(value) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function textValue(value, label) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  return value;
}

function optionalText(value) {
  return value === null || value === undefined ? null : String(value);
}

function parsedNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  if (typeof value === "string") {
    // SQLite's type affinity is deliberately permissive. Several legacy INTEGER timestamp columns
    // contain UTC values produced by datetime('now'), e.g. "2026-02-26 12:26:29". Normalize that
    // exact SQLite form before Date.parse so the machine's local timezone cannot shift the import.
    const sqliteUtc = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/.exec(value.trim());
    const epochMs = Date.parse(sqliteUtc ? `${sqliteUtc[1]}T${sqliteUtc[2]}Z` : value);
    if (Number.isFinite(epochMs)) return epochMs / 1_000;
  }
  return null;
}

function numberValue(value, label, fallback) {
  const number = parsedNumber(value);
  if (number !== null) return number;
  if (fallback !== undefined) return fallback;
  throw new Error(`${label} must be a finite number.`);
}

function optionalNumber(value) {
  return parsedNumber(value);
}

function stableId(...parts) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

// The legacy duplicate detector hashes normalized body text. Preserve stored hashes and use the
// same rule only for the old rows that predate that column's backfill.
function legacyBodyHash(body) {
  const normalized = body.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized).digest("hex");
}

function normalizedTitle(row) {
  const title = textValue(row.title, "structured title");
  return optionalText(row.normalized_title)?.trim() || title.toLowerCase().trim();
}

function metadataState(values) {
  const ready = values.some((value) => value !== null && value !== undefined && value !== "");
  return [ready ? "ready" : "pending", ready ? LEGACY_PROJECTION : null];
}

/**
 * Collapse legacy rows sharing a natural key onto ONE canonical id, and map every legacy id to it.
 *
 * `idOf` picks the identity a NEW entity adopts. It defaults to the legacy row id, which is right for
 * the entities the app dereferences by an in-transaction lookup on their natural key (movie/album by
 * normalizedTitle, bookmark/amplification by url) — those ids stay opaque. `tag` overrides it: the
 * shared mutators require `tag.id == normalizedName` and write tags with `insertIgnore`, which
 * renders `ON CONFLICT (<primary key>) DO NOTHING` and therefore suppresses an `id` collision ONLY.
 * A legacy numeric id there does not collide on the primary key, so it raises on the
 * `tag_normalized_name` unique index instead of being ignored — see 0016_tag_identity_backfill.sql.
 */
function uniqueEntities(rows, keyOf, existingByKey = new Map(), idOf = (_row, _key, rowId) => rowId) {
  const canonicalByKey = new Map(existingByKey);
  const canonicalIdById = new Map();
  const canonicalRows = [];
  for (const input of rows) {
    const row = rowObject(input, "normalized entity");
    const rowId = id(row.id, "normalized entity");
    const key = keyOf(row);
    const canonical = canonicalByKey.get(key);
    if (canonical) {
      canonicalIdById.set(rowId, canonical);
      continue;
    }
    const canonicalId = idOf(row, key, rowId);
    canonicalByKey.set(key, canonicalId);
    canonicalIdById.set(rowId, canonicalId);
    canonicalRows.push(row);
  }
  return { rows: canonicalRows, canonicalIdById };
}

function emptyExistingEntities() {
  return {
    tags: new Map(),
    movies: new Map(),
    albums: new Map(),
    bookmarks: new Map(),
    amplifications: new Map(),
    thoughtTags: new Map(),
  };
}

function naturalIdMap(rows, keyColumn) {
  const values = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rowId = optionalId(row.id);
    const key = optionalText(row[keyColumn])?.trim();
    if (rowId && key) values.set(key, rowId);
  }
  return values;
}

function resultObjects(result) {
  const columns = result.columns.map((column) => column.name);
  return result.rows.map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index]])));
}

/** Existing surrogate ids keyed by the pair a unique index actually constrains. */
function compositeIdMap(rows, firstColumn, secondColumn) {
  const values = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rowId = optionalId(row.id);
    const first = optionalText(row[firstColumn])?.trim();
    const second = optionalText(row[secondColumn])?.trim();
    if (rowId && first && second) values.set(`${first}\0${second}`, rowId);
  }
  return values;
}

async function loadExistingEntities(sql) {
  const { results } = await sql.batch([
    { sql: `SELECT "id", "normalizedName" FROM "tag"`, wantRows: true },
    { sql: `SELECT "id", "normalizedTitle" FROM "movie"`, wantRows: true },
    { sql: `SELECT "id", "normalizedTitle" FROM "album"`, wantRows: true },
    { sql: `SELECT "id", "url" FROM "bookmark"`, wantRows: true },
    { sql: `SELECT "id", "url" FROM "amplification"`, wantRows: true },
    { sql: `SELECT "id", "thoughtId", "tagId" FROM "thoughtTag"`, wantRows: true },
  ], { consistency: "strong" });
  const [tags, movies, albums, bookmarks, amplifications, thoughtTags] = results.map(resultObjects);
  return {
    tags: naturalIdMap(tags, "normalizedName"),
    movies: naturalIdMap(movies, "normalizedTitle"),
    albums: naturalIdMap(albums, "normalizedTitle"),
    bookmarks: naturalIdMap(bookmarks, "url"),
    amplifications: naturalIdMap(amplifications, "url"),
    thoughtTags: compositeIdMap(thoughtTags, "thoughtId", "tagId"),
  };
}

function positions(rows, ownerKey) {
  const next = new Map();
  return rows.map((row) => {
    const owner = String(row[ownerKey]);
    const position = next.get(owner) ?? 0;
    next.set(owner, position + 1);
    return position;
  });
}

function buildTables(source, authorId, existing = emptyExistingEntities()) {
  const sourceThoughtById = new Map(
    source.thoughts.map((input) => {
      const row = rowObject(input, "thought");
      return [id(row.id, "thought"), row];
    }),
  );
  const thoughtHashById = new Map();
  const thoughtPrivacyById = new Map();
  for (const [thoughtId, row] of sourceThoughtById) {
    const body = textValue(row.body, `thought ${thoughtId} body`);
    thoughtHashById.set(thoughtId, optionalText(row.body_hash)?.trim() || legacyBodyHash(body));
    thoughtPrivacyById.set(thoughtId, numberValue(row.private, `thought ${thoughtId} private`, 0) === 1 ? 1 : 0);
  }

  const sourceProjectById = new Map(
    source.projects.map((input) => {
      const row = rowObject(input, "project");
      return [id(row.id, "project"), row];
    }),
  );
  const projectPrivacyById = new Map(
    [...sourceProjectById].map(([projectId, row]) => [
      projectId,
      thoughtPrivacyById.get(optionalId(row.thought_id)) ?? 0,
    ]),
  );

  const tagEntities = uniqueEntities(
    source.tags,
    (row) => textValue(row.name, "tag name").trim().toLowerCase(),
    existing.tags,
    // A tag's identity IS its normalized name — the invariant createThought/editThought enforce.
    (_row, key) => key,
  );
  const movieEntities = uniqueEntities(source.movies, normalizedTitle, existing.movies);
  const albumEntities = uniqueEntities(source.albums, normalizedTitle, existing.albums);
  const bookmarkEntities = uniqueEntities(
    source.bookmarks,
    (row) => textValue(row.url, "bookmark url").trim(),
    existing.bookmarks,
  );
  const amplificationEntities = uniqueEntities(
    source.amplifications,
    (row) => textValue(row.url, "amplification url").trim(),
    existing.amplifications,
  );
  const attachmentPositions = positions(source.thoughtAttachments, "thought_id");
  const tagPositions = positions(source.thoughtTags, "thought_id");
  const projectAttachmentPositions = positions(source.projectAttachments, "project_id");

  const historyByThought = new Map();
  for (const input of source.thoughtHistory) {
    const row = rowObject(input, "thought history");
    const thoughtId = id(row.thought_id, "thought history thought");
    const rows = historyByThought.get(thoughtId) ?? [];
    rows.push(row);
    historyByThought.set(thoughtId, rows);
  }
  for (const rows of historyByThought.values()) {
    rows.sort((left, right) => numberValue(left.version, "history version") - numberValue(right.version, "history version"));
  }

  const tables = [];
  const add = (target, columns, rows) => tables.push({ target, columns, rows });

  add("thought", [
    "id", "authorId", "body", "bodyHash", "createdAt", "updatedAt", "version", "parentId",
    "color", "private", "contentRevision", "colorRevision", "colorProjectionVersion", "colorStatus",
  ], source.thoughts.map((input) => {
    const row = rowObject(input, "thought");
    const thoughtId = id(row.id, "thought");
    const body = textValue(row.body, `thought ${thoughtId} body`);
    const bodyHash = thoughtHashById.get(thoughtId) ?? legacyBodyHash(body);
    const createdAt = numberValue(row.timestamp, `thought ${thoughtId} timestamp`);
    const color = optionalText(row.color);
    return [
      thoughtId, authorId, body, bodyHash, createdAt,
      numberValue(row.updated_at, `thought ${thoughtId} updated_at`, createdAt),
      numberValue(row.version, `thought ${thoughtId} version`, 1), optionalId(row.parent_id), color,
      thoughtPrivacyById.get(thoughtId) ?? 0, bodyHash, color ? bodyHash : null,
      color ? LEGACY_PROJECTION : null, color ? "ready" : "pending",
    ];
  }));

  add("thoughtHistory", [
    "id", "thoughtId", "version", "body", "bodyHash", "writtenAt", "replacedAt",
  ], [...historyByThought].flatMap(([thoughtId, history]) => history.map((row, index) => {
    const version = numberValue(row.version, `thought ${thoughtId} history version`);
    const body = textValue(row.body, `thought ${thoughtId} history body`);
    const writtenAt = numberValue(row.timestamp, `thought ${thoughtId} history timestamp`);
    const next = history[index + 1];
    const current = sourceThoughtById.get(thoughtId);
    const currentCreatedAt = current ? numberValue(current.timestamp, `thought ${thoughtId} timestamp`) : writtenAt;
    const replacedAt = next
      ? numberValue(next.timestamp, `thought ${thoughtId} next history timestamp`)
      : current
        ? numberValue(current.updated_at, `thought ${thoughtId} updated_at`, currentCreatedAt)
        : writtenAt;
    return [
      stableId("thoughtHistory", thoughtId, version), thoughtId, version, body,
      optionalText(row.body_hash)?.trim() || legacyBodyHash(body), writtenAt, replacedAt,
    ];
  })));

  add("thoughtAttachment", [
    "id", "thoughtId", "storageKey", "mediaType", "fileName", "createdAt", "position",
  ], source.thoughtAttachments.map((input, index) => {
    const row = rowObject(input, "thought attachment");
    const thoughtId = id(row.thought_id, "thought attachment thought");
    const createdAt = sourceThoughtById.has(thoughtId)
      ? numberValue(sourceThoughtById.get(thoughtId).timestamp, `thought ${thoughtId} timestamp`)
      : 0;
    return [
      id(row.id, "thought attachment"), thoughtId,
      textValue(row.attachment_key, "thought attachment storage key"),
      textValue(row.attachment_type, "thought attachment media type"),
      textValue(row.attachment_name, "thought attachment file name"), createdAt,
      attachmentPositions[index],
    ];
  }));

  add("tag", ["id", "name", "normalizedName"], tagEntities.rows.map((row) => [
    tagEntities.canonicalIdById.get(id(row.id, "tag")) ?? id(row.id, "tag"),
    textValue(row.name, "tag name"), textValue(row.name, "tag name").trim().toLowerCase(),
  ]));

  const seenThoughtTags = new Set();
  add("thoughtTag", ["id", "thoughtId", "tagId", "position"], source.thoughtTags.flatMap((input, index) => {
    const row = rowObject(input, "thought tag");
    const thoughtId = id(row.thought_id, "thought tag thought");
    const tagId = tagEntities.canonicalIdById.get(id(row.tag_id, "thought tag tag")) ?? id(row.tag_id, "thought tag tag");
    const key = `${thoughtId}\0${tagId}`;
    if (seenThoughtTags.has(key)) return [];
    seenThoughtTags.add(key);
    // Prefer the id already stored for this (thoughtId, tagId). The derived id is a function of
    // tagId, so re-deriving it after 0016_tag_identity_backfill.sql changed a tag's identity would
    // insert a SECOND junction row for the pair and raise on `thought_tag_unique` — the upsert
    // conflict target is the primary key only. Reusing the stored id keeps a re-run idempotent.
    const rowId = existing.thoughtTags.get(key) ?? stableId("thoughtTag", thoughtId, tagId);
    return [[rowId, thoughtId, tagId, tagPositions[index]]];
  }));

  add("thoughtEdge", ["id", "sourceId", "targetId", "kind", "createdAt"], source.thoughtEdges.map((input) => {
    const row = rowObject(input, "thought edge");
    const sourceId = id(row.source_id, "thought edge source");
    const targetId = id(row.target_id, "thought edge target");
    const kind = optionalText(row.kind) || "link";
    const sourceThought = sourceThoughtById.get(sourceId);
    const createdAt = sourceThought ? numberValue(sourceThought.timestamp, `thought ${sourceId} timestamp`) : 0;
    return [stableId("thoughtEdge", sourceId, targetId, kind), sourceId, targetId, kind, createdAt];
  }));

  add("project", [
    "id", "thoughtId", "authorId", "title", "description", "status", "createdAt", "archivedAt", "private",
  ], source.projects.map((input) => {
    const row = rowObject(input, "project");
    const projectId = id(row.id, "project");
    return [
      projectId, optionalId(row.thought_id), authorId, textValue(row.title, "project title"),
      optionalText(row.description), optionalText(row.status) || "active",
      numberValue(row.created_at, "project created_at"), optionalNumber(row.archived_at),
      projectPrivacyById.get(projectId) ?? 0,
    ];
  }));

  const sourceTaskById = new Map(
    source.tasks.map((input) => {
      const row = rowObject(input, "task");
      return [id(row.id, "task"), row];
    }),
  );
  add("task", [
    "id", "thoughtId", "projectId", "title", "description", "createdAt", "completedAt",
    "deprioritizedAt", "position", "private",
  ], source.tasks.map((input) => {
    const row = rowObject(input, "task");
    const thoughtId = optionalId(row.thought_id);
    const projectId = optionalId(row.project_id);
    return [
      id(row.id, "task"), thoughtId, projectId, textValue(row.title, "task title"),
      optionalText(row.description), numberValue(row.created_at, "task created_at"),
      optionalNumber(row.completed_at), optionalNumber(row.deprioritized_at), optionalNumber(row.position),
      thoughtPrivacyById.get(thoughtId) ?? projectPrivacyById.get(projectId) ?? 0,
    ];
  }));

  add("taskDependency", ["id", "blockerTaskId", "blockedTaskId", "createdAt"], source.taskDependencies.map((input) => {
    const row = rowObject(input, "task dependency");
    const blockerTaskId = id(row.blocker_task_id, "blocker task");
    const blockedTaskId = id(row.blocked_task_id, "blocked task");
    const blockerCreated = sourceTaskById.has(blockerTaskId)
      ? numberValue(sourceTaskById.get(blockerTaskId).created_at, "blocker task created_at")
      : 0;
    const blockedCreated = sourceTaskById.has(blockedTaskId)
      ? numberValue(sourceTaskById.get(blockedTaskId).created_at, "blocked task created_at")
      : 0;
    return [
      stableId("taskDependency", blockerTaskId, blockedTaskId), blockerTaskId, blockedTaskId,
      Math.max(blockerCreated, blockedCreated),
    ];
  }));

  add("event", [
    "id", "thoughtId", "title", "description", "dateText", "dateEpoch", "createdAt",
  ], source.events.map((input) => {
    const row = rowObject(input, "event");
    return [
      id(row.id, "event"), id(row.thought_id, "event thought"), textValue(row.title, "event title"),
      optionalText(row.description), textValue(row.date_text, "event date_text"),
      numberValue(row.date_epoch, "event date_epoch"), numberValue(row.created_at, "event created_at"),
    ];
  }));

  add("question", [
    "id", "thoughtId", "title", "description", "createdAt", "answeredAt",
  ], source.questions.map((input) => {
    const row = rowObject(input, "question");
    return [
      id(row.id, "question"), id(row.thought_id, "question thought"),
      textValue(row.title, "question title"), optionalText(row.description),
      numberValue(row.created_at, "question created_at"), optionalNumber(row.answered_at),
    ];
  }));

  add("location", [
    "id", "thoughtId", "title", "description", "latitude", "longitude", "resolvedName",
    "sourceRevision", "resolutionRevision", "resolutionStatus", "createdAt",
  ], source.locations.map((input) => {
    const row = rowObject(input, "location");
    const thoughtId = id(row.thought_id, "location thought");
    const revision = thoughtHashById.get(thoughtId) ?? stableId("legacyLocation", thoughtId);
    const latitude = optionalNumber(row.lat);
    const longitude = optionalNumber(row.lng);
    const resolvedName = optionalText(row.resolved_name);
    const resolved = resolvedName !== null || (latitude !== null && longitude !== null);
    return [
      id(row.id, "location"), thoughtId, textValue(row.title, "location title"),
      optionalText(row.description), latitude, longitude, resolvedName, revision,
      resolved ? revision : null, resolved ? "ready" : "pending",
      numberValue(row.created_at, "location created_at"),
    ];
  }));

  add("movie", [
    "id", "title", "normalizedTitle", "description", "posterUrl", "year", "tmdbId",
    "voteAverage", "voteCount", "metadataStatus", "metadataProjectionVersion", "createdAt",
  ], movieEntities.rows.map((row) => {
    const projection = metadataState([row.poster_url, row.year, row.tmdb_id, row.vote_average, row.vote_count]);
    return [
      movieEntities.canonicalIdById.get(id(row.id, "movie")) ?? id(row.id, "movie"),
      textValue(row.title, "movie title"), normalizedTitle(row),
      optionalText(row.description), optionalText(row.poster_url), optionalText(row.year),
      optionalNumber(row.tmdb_id), optionalNumber(row.vote_average), optionalNumber(row.vote_count),
      projection[0], projection[1], numberValue(row.created_at, "movie created_at"),
    ];
  }));

  const seenThoughtMovies = new Set();
  add("thoughtMovie", [
    "id", "thoughtId", "movieId", "description", "createdAt",
  ], source.thoughtMovies.flatMap((input) => {
    const row = rowObject(input, "thought movie");
    const thoughtId = id(row.thought_id, "thought movie thought");
    const sourceMovieId = id(row.movie_id, "thought movie movie");
    const movieId = movieEntities.canonicalIdById.get(sourceMovieId) ?? sourceMovieId;
    const key = `${thoughtId}\0${movieId}`;
    if (seenThoughtMovies.has(key)) return [];
    seenThoughtMovies.add(key);
    return [[
      stableId("thoughtMovie", thoughtId, movieId), thoughtId, movieId, optionalText(row.description),
      numberValue(row.created_at, "thought movie created_at"),
    ]];
  }));

  add("book", [
    "id", "thoughtId", "title", "description", "coverUrl", "author", "year", "openLibraryKey",
    "metadataStatus", "metadataProjectionVersion", "createdAt",
  ], source.books.map((input) => {
    const row = rowObject(input, "book");
    const projection = metadataState([row.cover_url, row.author, row.year, row.ol_key]);
    return [
      id(row.id, "book"), id(row.thought_id, "book thought"), textValue(row.title, "book title"),
      optionalText(row.description), optionalText(row.cover_url), optionalText(row.author),
      optionalText(row.year), optionalText(row.ol_key), projection[0], projection[1],
      numberValue(row.created_at, "book created_at"),
    ];
  }));

  add("album", [
    "id", "title", "normalizedTitle", "artist", "year", "coverUrl", "itunesId", "genre",
    "metadataStatus", "metadataProjectionVersion", "createdAt",
  ], albumEntities.rows.map((row) => {
    const projection = metadataState([row.artist, row.year, row.cover_url, row.itunes_id, row.genre]);
    return [
      albumEntities.canonicalIdById.get(id(row.id, "album")) ?? id(row.id, "album"),
      textValue(row.title, "album title"), normalizedTitle(row),
      optionalText(row.artist), optionalText(row.year), optionalText(row.cover_url),
      optionalNumber(row.itunes_id), optionalText(row.genre), projection[0], projection[1],
      numberValue(row.created_at, "album created_at"),
    ];
  }));

  const seenThoughtAlbums = new Set();
  add("thoughtAlbum", [
    "id", "thoughtId", "albumId", "description", "createdAt",
  ], source.thoughtAlbums.flatMap((input) => {
    const row = rowObject(input, "thought album");
    const thoughtId = id(row.thought_id, "thought album thought");
    const sourceAlbumId = id(row.album_id, "thought album album");
    const albumId = albumEntities.canonicalIdById.get(sourceAlbumId) ?? sourceAlbumId;
    const key = `${thoughtId}\0${albumId}`;
    if (seenThoughtAlbums.has(key)) return [];
    seenThoughtAlbums.add(key);
    return [[
      stableId("thoughtAlbum", thoughtId, albumId), thoughtId, albumId, optionalText(row.description),
      numberValue(row.created_at, "thought album created_at"),
    ]];
  }));

  add("bookmark", [
    "id", "url", "title", "imageUrl", "description", "siteName", "metadataStatus",
    "metadataProjectionVersion", "createdAt",
  ], bookmarkEntities.rows.map((row) => {
    const projection = metadataState([row.title, row.image_url, row.description, row.site_name]);
    return [
      bookmarkEntities.canonicalIdById.get(id(row.id, "bookmark")) ?? id(row.id, "bookmark"),
      textValue(row.url, "bookmark url"), optionalText(row.title),
      optionalText(row.image_url), optionalText(row.description), optionalText(row.site_name),
      projection[0], projection[1], numberValue(row.created_at, "bookmark created_at"),
    ];
  }));

  add("thoughtBookmark", [
    "id", "thoughtId", "bookmarkId", "createdAt",
  ], source.thoughtBookmarks.map((input) => {
    const row = rowObject(input, "thought bookmark");
    const thoughtId = id(row.thought_id, "thought bookmark thought");
    const sourceBookmarkId = id(row.bookmark_id, "thought bookmark bookmark");
    const bookmarkId = bookmarkEntities.canonicalIdById.get(sourceBookmarkId) ?? sourceBookmarkId;
    const thought = sourceThoughtById.get(thoughtId);
    return [
      stableId("thoughtBookmark", thoughtId, bookmarkId), thoughtId, bookmarkId,
      thought ? numberValue(thought.timestamp, `thought ${thoughtId} timestamp`) : 0,
    ];
  }));

  add("amplification", [
    "id", "url", "source", "note", "title", "imageUrl", "description", "siteName",
    "metadataStatus", "metadataProjectionVersion", "createdAt",
  ], amplificationEntities.rows.map((row) => {
    const projection = metadataState([row.title, row.image_url, row.description, row.site_name]);
    return [
      amplificationEntities.canonicalIdById.get(id(row.id, "amplification")) ?? id(row.id, "amplification"),
      textValue(row.url, "amplification url"),
      textValue(row.source, "amplification source"), optionalText(row.note), optionalText(row.title),
      optionalText(row.image_url), optionalText(row.description), optionalText(row.site_name),
      projection[0], projection[1], numberValue(row.created_at, "amplification created_at"),
    ];
  }));

  add("projectComment", [
    "id", "projectId", "authorId", "parentId", "body", "createdAt", "updatedAt",
  ], source.projectComments.map((input) => {
    const row = rowObject(input, "project comment");
    return [
      id(row.id, "project comment"), id(row.project_id, "project comment project"), authorId,
      optionalId(row.parent_id), textValue(row.body, "project comment body"),
      numberValue(row.created_at, "project comment created_at"), optionalNumber(row.updated_at),
    ];
  }));

  add("projectActivity", ["id", "projectId", "kind", "detail", "createdAt"], source.projectActivities.map((input) => {
    const row = rowObject(input, "project activity");
    return [
      id(row.id, "project activity"), id(row.project_id, "project activity project"),
      textValue(row.kind, "project activity kind"), optionalText(row.detail),
      numberValue(row.created_at, "project activity created_at"),
    ];
  }));

  add("projectItem", [
    "id", "projectId", "itemType", "itemId", "role", "position", "addedAt",
  ], source.projectItems.map((input) => {
    const row = rowObject(input, "project item");
    return [
      id(row.id, "project item"), id(row.project_id, "project item project"),
      textValue(row.item_type, "project item type"), id(row.item_id, "project item target"),
      optionalText(row.role), optionalNumber(row.position), numberValue(row.added_at, "project item added_at"),
    ];
  }));

  add("projectAttachment", [
    "id", "projectId", "storageKey", "mediaType", "fileName", "createdAt", "position",
  ], source.projectAttachments.map((input, index) => {
    const row = rowObject(input, "project attachment");
    return [
      id(row.id, "project attachment"), id(row.project_id, "project attachment project"),
      textValue(row.attachment_key, "project attachment storage key"),
      textValue(row.attachment_type, "project attachment media type"),
      textValue(row.attachment_name, "project attachment file name"),
      numberValue(row.created_at, "project attachment created_at"), projectAttachmentPositions[index],
    ];
  }));

  add("framing", [
    "id", "authorId", "name", "description", "createdAt", "updatedAt", "private",
  ], source.framings.map((input) => {
    const row = rowObject(input, "framing");
    return [
      id(row.id, "framing"), authorId, textValue(row.name, "framing name"),
      optionalText(row.description), numberValue(row.created_at, "framing created_at"),
      numberValue(row.updated_at, "framing updated_at"),
      // The legacy D1 model had no framing-level visibility: every imported canvas was public.
      0,
    ];
  }));

  add("framingNode", [
    "id", "framingId", "itemType", "itemId", "x", "y", "width", "height",
  ], source.framingNodes.map((input) => {
    const row = rowObject(input, "framing node");
    return [
      id(row.id, "framing node"), id(row.framing_id, "framing node framing"),
      optionalText(row.node_type) || "thought", id(row.item_id, "framing node item"),
      numberValue(row.x, "framing node x", 0), numberValue(row.y, "framing node y", 0),
      optionalNumber(row.w), optionalNumber(row.h),
    ];
  }));

  add("framingEdge", [
    "id", "framingId", "sourceNodeId", "targetNodeId", "label", "sourceHandle", "targetHandle", "kind",
  ], source.framingEdges.map((input) => {
    const row = rowObject(input, "framing edge");
    return [
      id(row.id, "framing edge"), id(row.framing_id, "framing edge framing"),
      id(row.source_node_id, "framing edge source"), id(row.target_node_id, "framing edge target"),
      optionalText(row.label), optionalText(row.source_handle), optionalText(row.target_handle),
      optionalText(row.kind),
    ];
  }));

  add("cluster", [
    "id", "label", "size", "projectionVersion", "createdAt", "updatedAt",
  ], source.clusters.map((input) => {
    const row = rowObject(input, "cluster");
    const createdAt = numberValue(row.created_at, "cluster created_at");
    return [
      id(row.id, "cluster"), textValue(row.label, "cluster label"),
      numberValue(row.size, "cluster size", 0), LEGACY_PROJECTION, createdAt, createdAt,
    ];
  }));

  add("clusterMembership", [
    "id", "itemKind", "itemId", "clusterId", "rank", "distance", "title", "preview", "projectionVersion",
  ], source.clusterMemberships.map((input) => {
    const row = rowObject(input, "cluster membership");
    const itemKind = textValue(row.item_kind, "cluster membership kind");
    const itemId = id(row.item_id, "cluster membership item");
    const clusterId = id(row.cluster_id, "cluster membership cluster");
    return [
      stableId("clusterMembership", itemKind, itemId, clusterId), itemKind, itemId, clusterId,
      numberValue(row.rank, "cluster membership rank"),
      numberValue(row.distance, "cluster membership distance"), optionalText(row.title),
      optionalText(row.preview), LEGACY_PROJECTION,
    ];
  }));

  return tables;
}

function quoted(identifier) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return `"${identifier}"`;
}

function upsertSql(table) {
  const columns = table.columns.map(quoted).join(", ");
  const placeholders = table.columns.map(() => "?").join(", ");
  const updates = table.columns
    .filter((column) => column !== "id")
    .map((column) => `${quoted(column)} = excluded.${quoted(column)}`)
    .join(", ");
  return `INSERT INTO ${quoted(table.target)} (${columns}) VALUES (${placeholders}) ` +
    `ON CONFLICT("id") DO UPDATE SET ${updates}`;
}

function printSummary(tables, prefix = "Prepared") {
  const populated = tables.filter((table) => table.rows.length > 0);
  const total = populated.reduce((count, table) => count + table.rows.length, 0);
  console.log(`${prefix} ${total} rows across ${populated.length} Rindle tables.`);
  for (const table of populated) console.log(`  ${table.target}: ${table.rows.length}`);
}

async function main() {
  const authorId = process.env.THOUGHT_AUTHOR_ID?.trim() || "legacy:tantaman";
  if (!process.env.THOUGHT_AUTHOR_ID?.trim()) {
    console.warn(
      "THOUGHT_AUTHOR_ID is unset; owned rows will use legacy:tantaman. " +
      "Re-run with your Better Auth subject to make imported content editable as that account.",
    );
  }

  const source = await loadSource();
  if (process.env.THOUGHT_IMPORT_DRY_RUN === "1") {
    const tables = buildTables(source, authorId);
    printSummary(tables, "Validated");
    return;
  }

  const url = process.env.RINDLE_URL;
  const authToken = process.env.RINDLE_DATABASE_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      "RINDLE_URL + RINDLE_DATABASE_TOKEN are required — run with `pnpm import:thoughts`.",
    );
  }

  const sql = createSqlClient({ url, authToken });
  const existing = await loadExistingEntities(sql);
  const tables = buildTables(source, authorId, existing);
  const reused = Object.values(existing).reduce((count, rows) => count + rows.size, 0);
  if (reused > 0) {
    console.log(`Reconciled against ${reused} existing natural-key entities in Rindle.`);
  }
  let written = 0;
  const total = tables.reduce((count, table) => count + table.rows.length, 0);
  for (const table of tables) {
    const statement = upsertSql(table);
    for (let index = 0; index < table.rows.length; index += BATCH_SIZE) {
      const batch = table.rows.slice(index, index + BATCH_SIZE);
      await sql.withTransaction((tx) => tx.batch(batch.map((args) => ({ sql: statement, args }))));
      written += batch.length;
      process.stdout.write(`\r  upserted ${written}/${total} (${table.target})`);
    }
  }
  if (total > 0) process.stdout.write("\n");
  console.log(`Done — ${written} legacy thought-domain rows moved from D1 to Rindle (${authorId}).`);
  console.log("Attachment bytes were not copied; their existing R2 storage keys were preserved.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
