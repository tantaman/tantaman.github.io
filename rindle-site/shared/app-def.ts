// The shared CONTRACT root: the generated schema, the shared query builder, row types, and the
// replay-safe authoring mutators driven by both the browser and server authority.
//
// The per-component SELECTIONS (fragments) and the named root queries that compose them are co-located
// with their components in `src/components/*.queries.ts` (Relay-style). Keeping the schema here, free of
// those imports, keeps the contract graph acyclic.

import { defineMutators, defineRelationships, newQueryBuilder, rel } from "@rindle/client";
import type { Row } from "@rindle/client";
import type { ClientRegistry } from "@rindle/optimistic";
import { z } from "zod";

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

const nullableText = (max: number) => z.string().max(max).nullable();
const savePostArgs = z.object({
  post: z.object({
    id: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(300),
    date: nullableText(10),
    publishedAt: z.number().finite(),
    description: z.string().max(2_000),
    thesis: nullableText(2_000),
    tags: z.string().max(20_000),
    concern: z.string().max(20_000),
    form: nullableText(100),
    kind: nullableText(100),
    image: nullableText(2_000),
    html: z.string().max(1_000_000),
    body: z.string().max(500_000),
    cardImage: nullableText(2_000),
    pinned: z.number().int().min(0).max(1),
    readingMinutes: z.number().int().min(1).max(10_000),
    color: nullableText(100),
    contentRevision: z.string().min(1).max(100),
    colorRevision: nullableText(100),
    colorProjectionVersion: nullableText(100),
    colorStatus: z.string().min(1).max(30),
  }),
  facets: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        facet: z.enum(["tag", "concern"]),
        value: z.string().trim().min(1).max(200),
        position: z.number().int().min(0),
      }),
    )
    .max(200),
  postAuthorId: z.string().min(1).max(100),
});
export type SavePostArgs = z.infer<typeof savePostArgs>;

const { shared } = defineMutators(schema);

/** Create or replace one post and its normalized facet/author edges. IDs, render output, revisions,
 * and timestamps arrive in args because this body is re-invoked verbatim on every optimistic rebase.
 * The author identity is always the tier-provided principal, never a client argument. */
const savePost = shared(savePostArgs, function* (tx, args, ctx) {
  const oldFacets = (yield tx.query(q.postFacet.where.postId(args.post.id))) as unknown as Array<{
    id?: unknown;
  }>;
  const oldAuthors = (yield tx.query(q.postAuthor.where.postId(args.post.id))) as unknown as Array<{
    id?: unknown;
  }>;

  yield tx.upsert("post", { ...args.post, author: JSON.stringify(["tantaman"]) });

  for (const row of oldFacets) {
    if (typeof row.id === "string") yield tx.delete("postFacet", { id: row.id });
  }
  for (const facet of args.facets) {
    yield tx.insert("postFacet", { ...facet, postId: args.post.id });
  }

  for (const row of oldAuthors) {
    if (typeof row.id === "string") yield tx.delete("postAuthor", { id: row.id });
  }
  yield tx.insertIgnore("author", {
    id: ctx.user,
    displayName: "Tantaman",
    glyph: "T",
    color: null,
  });
  yield tx.insert("postAuthor", {
    id: args.postAuthorId,
    postId: args.post.id,
    authorId: ctx.user,
    position: 0,
  });
});

export const mutators = { savePost } satisfies ClientRegistry;
