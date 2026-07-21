// The shared CONTRACT root: the generated schema, the shared query builder, and the row types — the
// one import app code reaches for. The blog is READ-ONLY for now (posts are seeded; the DB is the
// source of truth), so there are no mutators yet; authoring (create/edit post) will register here.
//
// The per-component SELECTIONS (fragments) and the named root queries that compose them are co-located
// with their components in `src/components/*.queries.ts` (Relay-style). Keeping the schema here, free of
// those imports, keeps the contract graph acyclic.

import { newQueryBuilder } from "@rindle/client";
import type { Row } from "@rindle/client";
import type { ClientRegistry } from "@rindle/optimistic";

// The schema is GENERATED from migrations/*.sql into ./schema.gen.ts by `rindle schema gen` — `pnpm
// dev` regenerates it on every migration change, so the DDL is the single source of truth.
import { post, schema } from "./schema.gen.ts";

// --------------------------------------------------------------------------- tables (generated)

export { post, schema };

/** One schema-bound query builder, shared by every co-located `*.queries.ts`. Each `q.<table>` access
 *  mints a fresh builder, so sharing the single instance is safe. */
export const q = newQueryBuilder(schema);

// --------------------------------------------------------------- row types (schema-derived)

export type Post = Row<typeof post>;

// --------------------------------------------------------------------------- principal

/** A login handle reduced to a stable slug, so the client's predicted acting user matches the
 *  server's. Kept for when authoring lands; the read-only client still stamps a per-browser handle. */
export function normalizeSubject(raw: string): string {
  return raw.trim().replace(/\s+/g, "-").toLowerCase().slice(0, 40) || "anon";
}

// --------------------------------------------------------------------------- mutators
//
// None yet — the blog is read-only. When authoring is added, each mutator is ONE isomorphic generator
// body driven by both tiers (browser prediction + server authority); see the create-rindle docs. The
// empty registry keeps the client wire-up (`createRindleClient({ mutators })`) unchanged.
export const mutators = {} satisfies ClientRegistry;
