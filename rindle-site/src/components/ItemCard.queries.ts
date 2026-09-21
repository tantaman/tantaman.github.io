// The shared TARGET RESOLVER for the polymorphic item space. A curation row stores only
// `(itemType, itemId)`, so every surface that renders one needs the same fan of correlated
// sub-selections and — more importantly — the same per-kind privacy gate. Defining the fan once means
// a second surface over the same rows (a board view of a framing) inherits both, and widening the
// item space stays one branch here plus one entry in shared/item-kinds.ts.
//
// Resolution is deliberately a fan rather than a discriminated join: a node of one kind resolves the
// other kinds' sub-selections empty. That is the cost of a polymorphic target that is not a foreign
// key, and it is what the canvas already paid for its original three kinds.
//
// The module stays React-free — the browser, the API authority, and the SSR loader all import it.

import { exists } from "@rindle/client";

import { q, relationships } from "../../shared/app-def.ts";

/** A capture derived from a thought is visible exactly when that thought is. */
const publicThought = (thought: typeof q.thought) => thought.where.private(0);

export interface ItemTargetOptions {
  /** A publisher resolves private targets; a reader's window simply omits them. */
  admin: boolean;
  /** The bounded node window. Curation rows are a window like any other (AGENTS rule 6). */
  limit: number;
}

/** Chain every kind's target selection onto a `framingNode` window. Kinds carrying their own
 *  `private` column are gated directly; captures derived from a thought are gated through it; and
 *  deduplicated entities (movie, album, bookmark) select only their own public fields — no mention
 *  note, no source thought — so placing one publishes the artwork and nothing behind it. */
export function framingNodeItems(node: typeof q.framingNode, { admin, limit }: ItemTargetOptions) {
  return node
    // One window serves both arrangements: the board reads the sequence directly, and the canvas
    // ignores it because it positions by x/y. `(position, id)` is a total order even for framings
    // whose nodes all predate the board and tie at position 0.
    .orderBy("position", "asc")
    .orderBy("id", "asc")
    .limit(limit)
    .sub("thought", relationships.framingNodeThought, (row) => {
      const visible = admin ? row : row.where.private(0);
      return visible
        .countAs("replyCount", relationships.thoughtReplies, (reply) => admin ? reply : reply.where.private(0))
        .countAs("linkCount", relationships.thoughtOutboundEdges, (edge) => edge.where.kind("link"))
        .countAs("backlinkCount", relationships.thoughtInboundEdges, (edge) => edge.where.kind("link"))
        .sub("attachments", relationships.thoughtAttachments, (attachment) =>
          attachment
            .orderBy("position", "asc")
            .orderBy("id", "asc")
            .limit(4)
            .select("id", "storageKey", "mediaType", "fileName", "position"),
        )
        .select("id", "body", "createdAt", "color", "private")
        .one();
    })
    .sub("post", relationships.framingNodePost, (row) =>
      row.select("id", "title", "date", "description", "tags", "color").one(),
    )
    .sub("nestedFraming", relationships.framingNodeFraming, (row) => {
      const visible = admin ? row : row.where.private(0);
      return visible.select("id", "name", "private", "updatedAt").one();
    })
    .sub("project", relationships.framingNodeProject, (row) => {
      const visible = admin ? row : row.where.private(0);
      return visible.select("id", "title", "description", "status", "private", "createdAt").one();
    })
    .sub("task", relationships.framingNodeTask, (row) => {
      const visible = admin ? row : row.where.private(0);
      return visible
        .select("id", "title", "description", "completedAt", "deprioritizedAt", "private", "createdAt")
        .one();
    })
    .sub("question", relationships.framingNodeQuestion, (row) => {
      const visible = admin ? row : row.where(exists(relationships.questionThought, publicThought));
      return visible.select("id", "title", "description", "answeredAt", "createdAt").one();
    })
    .sub("event", relationships.framingNodeEvent, (row) => {
      const visible = admin ? row : row.where(exists(relationships.eventThought, publicThought));
      return visible.select("id", "title", "description", "dateText", "dateEpoch", "createdAt").one();
    })
    .sub("location", relationships.framingNodeLocation, (row) => {
      const visible = admin ? row : row.where(exists(relationships.locationThought, publicThought));
      return visible
        .select("id", "title", "description", "latitude", "longitude", "resolvedName", "resolutionStatus")
        .one();
    })
    .sub("book", relationships.framingNodeBook, (row) => {
      const visible = admin ? row : row.where(exists(relationships.bookThought, publicThought));
      return visible
        .select("id", "title", "description", "author", "year", "coverUrl", "openLibraryKey", "metadataStatus")
        .one();
    })
    .sub("movie", relationships.framingNodeMovie, (row) =>
      row.select("id", "title", "posterUrl", "year", "voteAverage", "tmdbId", "metadataStatus").one(),
    )
    .sub("album", relationships.framingNodeAlbum, (row) =>
      row.select("id", "title", "artist", "year", "genre", "coverUrl", "itunesId", "metadataStatus").one(),
    )
    .sub("bookmark", relationships.framingNodeBookmark, (row) =>
      row.select("id", "url", "title", "description", "imageUrl", "siteName", "metadataStatus").one(),
    );
}
