// The shared CONTRACT root: the generated schema, the shared query builder, and the row types — the
// one import app code reaches for. The blog is READ-ONLY for now (posts are seeded; the DB is the
// source of truth), so there are no mutators yet; authoring (create/edit post) will register here.
//
// The per-component SELECTIONS (fragments) and the named root queries that compose them are co-located
// with their components in `src/components/*.queries.ts` (Relay-style). Keeping the schema here, free of
// those imports, keeps the contract graph acyclic.

import { defineRelationships, newQueryBuilder, rel } from "@rindle/client";
import type { Row } from "@rindle/client";
import type { ClientRegistry } from "@rindle/optimistic";

// The schema is GENERATED from migrations/*.sql into ./schema.gen.ts by `rindle schema gen` — `pnpm
// dev` regenerates it on every migration change, so the DDL is the single source of truth.
import { author, post, postAuthor, postFacet, schema } from "./schema.gen.ts";

// --------------------------------------------------------------------------- tables (generated)

export { author, post, postAuthor, postFacet, schema };

// --------------------------------------------------------------- relationships

/** Normalized edges seeded alongside the legacy JSON-string columns. New views and authoring flows
 *  can adopt these incrementally without restating correlation keys or breaking today's readers. */
export const relationships = defineRelationships({
  postFacets: rel(post, postFacet, { id: "postId" }),
  postAuthors: rel(post, postAuthor, { id: "postId" }),
  authorPosts: rel(author, postAuthor, { id: "authorId" }),
  postAuthorProfile: rel(postAuthor, author, { authorId: "id" }),
});

/** One schema-bound query builder, shared by every co-located `*.queries.ts`. Each `q.<table>` access
 *  mints a fresh builder, so sharing the single instance is safe. */
export const q = newQueryBuilder(schema);

// --------------------------------------------------------------- row types (schema-derived)

export type Post = Row<typeof post>;
export type PostFacet = Row<typeof postFacet>;
export type Author = Row<typeof author>;
export type PostAuthor = Row<typeof postAuthor>;

// --------------------------------------------------------------------------- mutators
//
// None yet — the blog is read-only. When authoring is added, each mutator is ONE isomorphic generator
// body driven by both tiers (browser prediction + server authority); see the create-rindle docs. The
// empty registry keeps the client wire-up (`createRindleClient({ mutators })`) unchanged.
export const mutators = {} satisfies ClientRegistry;
