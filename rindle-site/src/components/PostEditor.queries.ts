// The private authoring projection. Keeping it separate from PostDetailFragment means public readers
// receive rendered HTML without also downloading the raw Markdown and enrichment bookkeeping.

import { defineFragment, defineQuery } from "@rindle/client";
import { z } from "zod";

import { post, postFacet, q } from "../../shared/app-def.ts";
import { canPublish, type QueryContext } from "../../shared/auth.ts";

export const PostEditorFragment = defineFragment(post, (p) =>
  p.select(
    "id",
    "title",
    "date",
    "description",
    "thesis",
    "tags",
    "concern",
    "form",
    "kind",
    "image",
    "body",
    "cardImage",
    "pinned",
    "color",
    "contentRevision",
    "colorRevision",
    "colorProjectionVersion",
    "colorStatus",
  ),
);

const editorSlugArgs = z.string().max(200);

export const postEditorQuery = defineQuery(
  "postEditor",
  (raw) => editorSlugArgs.parse(raw),
  (slug, ctx: QueryContext) => {
    let query = q.post.where.id(slug);
    // Two distinct equalities on the primary key are an unconditionally empty public projection.
    if (!canPublish(ctx.user)) query = query.where.id(`${slug}#denied`);
    return query.include(PostEditorFragment).one();
  },
);

export const postEditorFacetOptionsQuery = defineQuery(
  "postEditorFacetOptions",
  (raw) => z.object({}).parse(raw),
  (_args, ctx: QueryContext) => {
    let query = q.postFacet;
    if (!canPublish(ctx.user)) {
      query = query.where.id("__denied_a__").where.id("__denied_b__");
    }
    return query
      .orderBy("facet", "asc")
      .orderBy("value", "asc")
      .orderBy("id", "asc")
      .limit(2_000)
      .select("facet", "value");
  },
);

export const postEditorMetadataOptionsQuery = defineQuery(
  "postEditorMetadataOptions",
  (raw) => z.object({}).parse(raw),
  (_args, ctx: QueryContext) => {
    let query = q.post;
    if (!canPublish(ctx.user)) {
      query = query.where.id("__denied_a__").where.id("__denied_b__");
    }
    return query
      .orderBy("id", "asc")
      .limit(1_000)
      .select("form", "kind");
  },
);
