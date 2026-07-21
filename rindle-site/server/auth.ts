// Better Auth runtime configuration. Cloudflare requests use the native AUTH_DB D1 binding; the
// ordinary `pnpm dev` Node runtime uses a local better-sqlite3 file migrated from the exact same
// migrations-auth source. A fresh auth instance is built per request so request-bound D1 work never
// leaks across Worker invocations.

import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { AUTH_USER_FIELDS } from "../shared/auth.ts";

const DB_BINDING = "AUTH_DB";
const LOCAL_AUTH_URL = "http://localhost:3000";
const LOCAL_AUTH_SECRET = "rindle-site-local-auth-secret-not-for-production";
const LOCAL_OWNER_EMAIL = "owner@tantaman.local";

type DbOption = NonNullable<BetterAuthOptions["database"]>;

interface LoadedDatabase {
  database: DbOption;
  local: boolean;
}

let localDatabasePromise: Promise<DbOption> | undefined;

async function loadDatabase(): Promise<LoadedDatabase> {
  try {
    // The binding is an object, not a process.env string. Indirection keeps this Workers-only module
    // out of the normal Node SSR and browser build graphs.
    const specifier = "cloudflare:workers";
    const workers = (await import(/* @vite-ignore */ specifier)) as {
      env?: Record<string, unknown>;
    };
    const binding = workers.env?.[DB_BINDING] as DbOption | undefined;
    if (binding) return { database: binding, local: false };
  } catch {
    // Node development has no cloudflare:workers module; fall through to the local auth database.
  }

  localDatabasePromise ??= loadLocalDatabase();
  return { database: await localDatabasePromise, local: true };
}

async function loadLocalDatabase(): Promise<DbOption> {
  const sqliteSpecifier = "better-sqlite3";
  const fsSpecifier = "node:fs";
  const pathSpecifier = "node:path";
  const sqlite = (await import(/* @vite-ignore */ sqliteSpecifier)) as {
    default: typeof import("better-sqlite3");
  };
  const fs = (await import(/* @vite-ignore */ fsSpecifier)) as typeof import("node:fs");
  const path = (await import(/* @vite-ignore */ pathSpecifier)) as typeof import("node:path");

  const file = process.env.AUTH_DB_PATH ?? path.join(process.cwd(), "auth-local.db");
  const database = new sqlite.default(file);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  applyLocalMigrations(database, fs, path);
  return database;
}

function applyLocalMigrations(
  database: import("better-sqlite3").Database,
  fs: typeof import("node:fs"),
  path: typeof import("node:path"),
): void {
  database.exec(
    "CREATE TABLE IF NOT EXISTS _auth_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  const directory = path.join(process.cwd(), "migrations-auth");
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const applied = new Set(
    database
      .prepare("SELECT name FROM _auth_migrations")
      .all()
      .map((row) => String((row as { name: unknown }).name)),
  );
  const apply = database.transaction((name: string, sql: string) => {
    database.exec(sql);
    database
      .prepare("INSERT INTO _auth_migrations (name, applied_at) VALUES (?, ?)")
      .run(name, new Date().toISOString());
  });
  for (const file of files) {
    if (!applied.has(file)) apply(file, fs.readFileSync(path.join(directory, file), "utf8"));
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[auth] missing required server environment variable: ${name}`);
  return value;
}

function localOrRequired(name: string, local: boolean, fallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  return local ? fallback : required(name);
}

function requestOrigin(request: Request | undefined): string | null {
  if (!request) return null;
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

function socialProviders(): BetterAuthOptions["socialProviders"] {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } =
    process.env;
  if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
    providers.github = { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET };
  }
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    providers.google = { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
  }
  return providers;
}

export async function getAuth(request?: Request) {
  const loaded = await loadDatabase();
  const origin = requestOrigin(request);
  const baseURL = localOrRequired(
    "BETTER_AUTH_URL",
    loaded.local,
    origin ?? LOCAL_AUTH_URL,
  );
  const ownerEmail = localOrRequired(
    "TANTAMAN_OWNER_EMAIL",
    loaded.local,
    LOCAL_OWNER_EMAIL,
  ).toLowerCase();
  const extraOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const trustedOrigins = Array.from(
    new Set([baseURL, ...(loaded.local && origin ? [origin] : []), ...extraOrigins]),
  );

  return betterAuth({
    appName: "Tantaman",
    database: loaded.database,
    baseURL,
    basePath: "/api/auth",
    secret: localOrRequired("BETTER_AUTH_SECRET", loaded.local, LOCAL_AUTH_SECRET),
    trustedOrigins,
    emailAndPassword: { enabled: false },
    socialProviders: socialProviders(),
    user: { additionalFields: AUTH_USER_FIELDS },
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            const isOwner = user.emailVerified && user.email.trim().toLowerCase() === ownerEmail;
            return {
              data: {
                ...user,
                role: isOwner ? "admin" : "reader",
                username: isOwner ? "tantaman" : null,
              },
            };
          },
        },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    // Keep the TanStack cookie bridge last, per Better Auth's integration contract.
    plugins: [tanstackStartCookies()],
  });
}
