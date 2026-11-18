// Pull a Rindle app's data into a plain local SQLite file you can poke at with `sqlite3`.
//
// Rindle Cloud has no "download my database" endpoint: the backup store is the platform's bucket,
// the write-master is an HCTree file and a follower is a wal2 store — none of which stock SQLite
// opens. What IS available is the app's SQL ingress, so this script reads every base table through
// `rindle sql --json` and replays the rows into a file built from migrations/*.sql.
//
//   node --env-file=.env scripts/pull-cloud-db.mjs             # cloud app (RINDLE_URL from .env)
//   node scripts/pull-cloud-db.mjs --local                     # the local dev fleet
//   node scripts/pull-cloud-db.mjs --out /tmp/snap.db --page 100
//
// Target selection and auth are the CLI's: with no flag it honours RINDLE_URL/RINDLE_DATABASE_TOKEN
// (what --env-file=.env provides), and any passthrough flags (--local, --url, --token) go to
// `rindle sql` as given. Attachment bytes live in R2/the object store, not in the database, so this
// is the whole of the relational data and none of the blobs.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rindleBin = join(projectRoot, "node_modules", ".bin", "rindle");

const args = process.argv.slice(2);
let out = "local-copy.db";
let pageSize = 500;
const passthrough = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--out") out = args[++i];
  else if (arg === "--page") pageSize = Number(args[++i]);
  else if (arg === "--local" || arg === "--cloud") passthrough.push(arg);
  else if (arg === "--url" || arg === "--token") passthrough.push(arg, args[++i]);
  else {
    console.error(`unknown argument: ${arg}`);
    process.exit(64);
  }
}
const outPath = resolve(projectRoot, out);

/** Run a rindle subcommand with --json and parse stdout. */
function rindleJson(argv) {
  const stdout = execFileSync(rindleBin, [...argv, ...passthrough, "--json"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // `rindle sql` prints a "[sql] target: …" banner on stdout before the JSON body.
  const start = stdout.search(/[[{]/);
  if (start < 0) throw new Error(`no JSON in rindle output: ${stdout.slice(0, 200)}`);
  return JSON.parse(stdout.slice(start));
}

const query = (sql) => rindleJson(["sql", sql]).result;

/** The wire encoding wraps 64-bit integers so they survive JSON; everything else is literal. */
function decode(value) {
  if (value === null || typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "object" && value.$rindle === "i64") {
    const n = BigInt(value.value);
    return n >= -9007199254740991n && n <= 9007199254740991n ? Number(n) : n;
  }
  throw new Error(`unsupported value on the wire: ${JSON.stringify(value)}`);
}

const quote = (ident) => `"${ident.replaceAll('"', '""')}"`;

// 1. The shape to copy, from the deployed app itself rather than from local assumptions.
const tables = rindleJson(["schema", "show"]).tables;

// 2. A local file with the real schema: the migrations are plain, additive SQLite DDL, so applying
//    them in order reproduces the deployed tables and every index. `migrate status` says whether
//    they match what the app has applied.
rmSync(outPath, { force: true });
rmSync(`${outPath}-wal`, { force: true });
rmSync(`${outPath}-shm`, { force: true });
const db = new Database(outPath);
db.pragma("journal_mode = WAL");
const migrations = readdirSync(join(projectRoot, "migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
for (const name of migrations) {
  db.exec(readFileSync(join(projectRoot, "migrations", name), "utf8"));
}
console.log(`schema: ${migrations.length} migrations applied to ${outPath}`);

// 2b. A deployed app can hold a table the migrations never declared (one created by hand through
//     `rindle sql`). Synthesize those from the live column types so their rows have somewhere to go.
const localTables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all(),
);
for (const table of tables) {
  if (localTables.has(table.name)) continue;
  const live = query(`SELECT * FROM ${quote(table.name)} LIMIT 0`).columns;
  const decltype = new Map(live.map((c) => [c.name, c.decltype]));
  const defs = table.columns.map((c) => {
    const type = decltype.get(c.name) ?? (c.type === "number" ? "REAL" : "TEXT");
    return `${quote(c.name)} ${type}${c.nullable ? "" : " NOT NULL"}`;
  });
  if (table.primaryKey?.length) defs.push(`PRIMARY KEY (${table.primaryKey.map(quote).join(", ")})`);
  db.exec(`CREATE TABLE ${quote(table.name)} (${defs.join(", ")})`);
  console.log(`  + ${table.name}: not in migrations, created from the deployed column types`);
}

// 3. Page through each table. OFFSET paging needs a total order, and the primary key is one.
let grandTotal = 0;
for (const table of tables) {
  const columns = table.columns.map((c) => c.name);
  const order = (table.primaryKey?.length ? table.primaryKey : columns).map(quote).join(", ");
  const insert = db.prepare(
    `INSERT OR REPLACE INTO ${quote(table.name)} (${columns.map(quote).join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`,
  );
  const insertRows = db.transaction((rows) => {
    for (const row of rows) insert.run(row.map(decode));
  });

  let offset = 0;
  let page = pageSize;
  for (;;) {
    let result;
    try {
      result = query(
        `SELECT ${columns.map(quote).join(", ")} FROM ${quote(table.name)}
         ORDER BY ${order} LIMIT ${page} OFFSET ${offset}`,
      );
    } catch (err) {
      // Wide rows (a post's html + body) can overrun a response or the buffer; narrow the page.
      if (page > 1) {
        page = Math.max(1, Math.floor(page / 4));
        console.log(`  ${table.name}: retrying at page ${page} (${err.message.trim().slice(0, 120)})`);
        continue;
      }
      throw err;
    }
    insertRows(result.rows);
    offset += result.rows.length;
    if (result.rows.length < page) break;
  }
  grandTotal += offset;
  console.log(`  ${table.name}: ${offset} rows`);
}

db.pragma("wal_checkpoint(TRUNCATE)");
db.close();
console.log(`\n${grandTotal} rows in ${tables.length} tables → ${outPath}`);
