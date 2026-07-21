// The private authoring projection. Keeping it separate from PostDetailFragment means public readers
// receive rendered HTML without also downloading the raw Markdown and enrichment bookkeeping.

import { defineFragment, defineQuery } from "@rindle/client";
import { z } from "zod";

import { post, q } from "../../shared/app-def.ts";

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
  (slug) => q.post.where.id(slug).include(PostEditorFragment).one(),
);
