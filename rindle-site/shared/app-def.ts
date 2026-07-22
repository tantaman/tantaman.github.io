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
import {
  album,
  author,
  book,
  bookmark,
  cluster,
  clusterMembership,
  event,
  framing,
  framingEdge,
  framingNode,
  location,
  movie,
  post,
  postAuthor,
  postComment,
  postFacet,
  project,
  projectActivity,
  projectAttachment,
  projectComment,
  projectItem,
  question,
  schema,
  tag,
  task,
  taskDependency,
  thought,
  thoughtAlbum,
  thoughtAttachment,
  thoughtBookmark,
  thoughtEdge,
  thoughtHistory,
  thoughtMovie,
  thoughtTag,
} from "./schema.gen.ts";

// --------------------------------------------------------------------------- tables (generated)

export * from "./schema.gen.ts";

// --------------------------------------------------------------- relationships

/** Normalized edges seeded alongside the legacy JSON-string columns. New views and authoring flows
 *  can adopt these incrementally without restating correlation keys or breaking today's readers. */
export const relationships = defineRelationships({
  postFacets: rel(post, postFacet, { id: "postId" }),
  postAuthors: rel(post, postAuthor, { id: "postId" }),
  postComments: rel(post, postComment, { id: "postId" }),
  postCommentReplies: rel(postComment, postComment, { id: "parentId" }),
  authorPosts: rel(author, postAuthor, { id: "authorId" }),
  postAuthorProfile: rel(postAuthor, author, { authorId: "id" }),
  thoughtReplies: rel(thought, thought, { id: "parentId" }),
  thoughtHistory: rel(thought, thoughtHistory, { id: "thoughtId" }),
  thoughtAttachments: rel(thought, thoughtAttachment, { id: "thoughtId" }),
  thoughtTagLinks: rel(thought, thoughtTag, { id: "thoughtId" }),
  tagThoughtLinks: rel(tag, thoughtTag, { id: "tagId" }),
  thoughtTagProfile: rel(thoughtTag, tag, { tagId: "id" }),
  thoughtOutboundEdges: rel(thought, thoughtEdge, { id: "sourceId" }),
  thoughtInboundEdges: rel(thought, thoughtEdge, { id: "targetId" }),
  thoughtTasks: rel(thought, task, { id: "thoughtId" }),
  taskThought: rel(task, thought, { thoughtId: "id" }),
  thoughtEvents: rel(thought, event, { id: "thoughtId" }),
  eventThought: rel(event, thought, { thoughtId: "id" }),
  thoughtQuestions: rel(thought, question, { id: "thoughtId" }),
  questionThought: rel(question, thought, { thoughtId: "id" }),
  thoughtLocations: rel(thought, location, { id: "thoughtId" }),
  locationThought: rel(location, thought, { thoughtId: "id" }),
  thoughtBooks: rel(thought, book, { id: "thoughtId" }),
  bookThought: rel(book, thought, { thoughtId: "id" }),
  thoughtMovieLinks: rel(thought, thoughtMovie, { id: "thoughtId" }),
  thoughtMovieThought: rel(thoughtMovie, thought, { thoughtId: "id" }),
  movieThoughtLinks: rel(movie, thoughtMovie, { id: "movieId" }),
  thoughtMovieProfile: rel(thoughtMovie, movie, { movieId: "id" }),
  thoughtAlbumLinks: rel(thought, thoughtAlbum, { id: "thoughtId" }),
  thoughtAlbumThought: rel(thoughtAlbum, thought, { thoughtId: "id" }),
  albumThoughtLinks: rel(album, thoughtAlbum, { id: "albumId" }),
  thoughtAlbumProfile: rel(thoughtAlbum, album, { albumId: "id" }),
  thoughtBookmarkLinks: rel(thought, thoughtBookmark, { id: "thoughtId" }),
  bookmarkThoughtLinks: rel(bookmark, thoughtBookmark, { id: "bookmarkId" }),
  thoughtBookmarkProfile: rel(thoughtBookmark, bookmark, { bookmarkId: "id" }),
  thoughtProjects: rel(thought, project, { id: "thoughtId" }),
  projectThought: rel(project, thought, { thoughtId: "id" }),
  projectTasks: rel(project, task, { id: "projectId" }),
  taskProject: rel(task, project, { projectId: "id" }),
  taskBlockedBy: rel(task, taskDependency, { id: "blockedTaskId" }),
  taskBlocks: rel(task, taskDependency, { id: "blockerTaskId" }),
  projectComments: rel(project, projectComment, { id: "projectId" }),
  projectActivity: rel(project, projectActivity, { id: "projectId" }),
  projectItems: rel(project, projectItem, { id: "projectId" }),
  projectAttachments: rel(project, projectAttachment, { id: "projectId" }),
  framingNodes: rel(framing, framingNode, { id: "framingId" }),
  framingEdges: rel(framing, framingEdge, { id: "framingId" }),
  framingNodeOutgoingEdges: rel(framingNode, framingEdge, { id: "sourceNodeId" }),
  framingNodeIncomingEdges: rel(framingNode, framingEdge, { id: "targetNodeId" }),
  clusterMembers: rel(cluster, clusterMembership, { id: "clusterId" }),
});

/** One schema-bound query builder, shared by every co-located `*.queries.ts`. Each `q.<table>` access
 *  mints a fresh builder, so sharing the single instance is safe. */
export const q = newQueryBuilder(schema);

// --------------------------------------------------------------- row types (schema-derived)

export type Post = Row<typeof post>;
export type PostFacet = Row<typeof postFacet>;
export type Author = Row<typeof author>;
export type PostAuthor = Row<typeof postAuthor>;
export type PostComment = Row<typeof postComment>;
export type Thought = Row<typeof thought>;
export type ThoughtHistory = Row<typeof thoughtHistory>;
export type ThoughtAttachment = Row<typeof thoughtAttachment>;
export type Tag = Row<typeof tag>;
export type ThoughtTag = Row<typeof thoughtTag>;
export type ThoughtEdge = Row<typeof thoughtEdge>;

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
const deletePostArgs = z.object({
  id: z.string().trim().min(1).max(200),
});
export type DeletePostArgs = z.infer<typeof deletePostArgs>;

const stableId = z
  .string()
  .min(1)
  .max(500)
  .refine((value) => value.trim() === value, "IDs must not have surrounding whitespace.");
const revision = z.string().min(1).max(200);
const timestamp = z.number().finite().nonnegative();
const storedFlag = z.number().int().min(0).max(1);

const createPostCommentArgs = z.object({
  comment: z.object({
    id: stableId,
    postId: z.string().trim().min(1).max(200),
    authorName: z
      .string()
      .min(1)
      .max(200)
      .refine((value) => value === value.trim(), "Author name must not have surrounding whitespace."),
    parentId: stableId.nullable(),
    body: z
      .string()
      .max(10_000)
      .refine((value) => value.trim().length > 0, "Comment body is required."),
    createdAt: timestamp,
  }),
});
export type CreatePostCommentArgs = z.infer<typeof createPostCommentArgs>;

const deletePostCommentArgs = z.object({
  id: stableId,
  deletedAt: timestamp,
});
export type DeletePostCommentArgs = z.infer<typeof deletePostCommentArgs>;

const thoughtTagArg = z.object({
  id: stableId,
  tagId: stableId,
  name: z.string().min(1).max(200),
  normalizedName: z.string().min(1).max(200),
  position: z.number().int().min(0),
});

const thoughtAttachmentArg = z.object({
  id: stableId,
  storageKey: z.string().min(1).max(2_000),
  mediaType: z.string().min(1).max(500),
  fileName: z.string().min(1).max(1_000),
  createdAt: timestamp,
  position: z.number().int().min(0),
});

const thoughtEdgeArg = z.object({
  id: stableId,
  targetId: stableId,
  kind: z.string().min(1).max(100),
  createdAt: timestamp,
});

const structuredTitle = z.string().trim().min(1).max(2_000);
const structuredDescription = nullableText(100_000);
const titledEnrichmentArg = z.object({
  id: stableId,
  title: structuredTitle,
  description: structuredDescription,
  createdAt: timestamp,
});
const eventEnrichmentArg = titledEnrichmentArg.extend({
  dateText: z.string().trim().min(1).max(100),
  dateEpoch: timestamp,
});
const locationEnrichmentArg = titledEnrichmentArg.extend({
  sourceRevision: revision,
});
const normalizedMediaEnrichmentArg = titledEnrichmentArg.extend({
  linkId: stableId,
  normalizedTitle: z.string().trim().min(1).max(2_000),
});
const taskDependencyArg = z.object({
  id: stableId,
  blockerTaskId: stableId,
  blockedTaskId: stableId,
  createdAt: timestamp,
});
const thoughtEnrichmentArgs = z.object({
  projects: z.array(titledEnrichmentArg).max(200),
  tasks: z.array(titledEnrichmentArg).max(200),
  taskDependencies: z.array(taskDependencyArg).max(10_000),
  events: z.array(eventEnrichmentArg).max(200),
  questions: z.array(titledEnrichmentArg).max(200),
  locations: z.array(locationEnrichmentArg).max(200),
  movies: z.array(normalizedMediaEnrichmentArg).max(200),
  books: z.array(titledEnrichmentArg).max(200),
  albums: z.array(normalizedMediaEnrichmentArg).max(200),
});

const createThoughtArgs = z
  .object({
    thought: z.object({
      id: stableId,
      body: z.string().max(500_000).refine((value) => value.trim().length > 0, "Body is required."),
      bodyHash: revision,
      createdAt: timestamp,
      updatedAt: timestamp,
      parentId: stableId.nullable(),
      private: storedFlag,
      contentRevision: revision,
    }),
    tags: z.array(thoughtTagArg).max(200),
    attachments: z.array(thoughtAttachmentArg).max(100),
    edges: z.array(thoughtEdgeArg).max(500),
    enrichments: thoughtEnrichmentArgs,
  })
  .superRefine((args, ctx) => {
    if (args.thought.updatedAt !== args.thought.createdAt) {
      ctx.addIssue({ code: "custom", path: ["thought", "updatedAt"], message: "A new thought's timestamps must match." });
    }
    const ids = new Set<string>();
    for (const [group, rows] of [
      ["tags", args.tags],
      ["attachments", args.attachments],
      ["edges", args.edges],
    ] as const) {
      for (let index = 0; index < rows.length; index++) {
        const id = rows[index].id;
        if (ids.has(id)) ctx.addIssue({ code: "custom", path: [group, index, "id"], message: "Row ids must be unique within a thought mutation." });
        ids.add(id);
      }
    }
    for (const [group, rows] of Object.entries(args.enrichments)) {
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index] as { id: string; linkId?: string };
        for (const field of ["id", "linkId"] as const) {
          const id = field in row ? row[field] : undefined;
          if (typeof id !== "string") continue;
          if (ids.has(id)) {
            ctx.addIssue({
              code: "custom",
              path: ["enrichments", group, index, field],
              message: "Row ids must be unique within a thought mutation.",
            });
          }
          ids.add(id);
        }
      }
    }
    const tagIds = new Set<string>();
    for (let index = 0; index < args.tags.length; index++) {
      const input = args.tags[index];
      if (input.tagId !== input.normalizedName) {
        ctx.addIssue({ code: "custom", path: ["tags", index, "tagId"], message: "tagId must be the normalized tag name." });
      }
      if (tagIds.has(input.tagId)) ctx.addIssue({ code: "custom", path: ["tags", index, "tagId"], message: "A tag may occur only once per thought." });
      tagIds.add(input.tagId);
    }
    const edgeKeys = new Set<string>();
    for (let index = 0; index < args.edges.length; index++) {
      const input = args.edges[index];
      if (input.targetId === args.thought.id) {
        ctx.addIssue({ code: "custom", path: ["edges", index, "targetId"], message: "A thought cannot link to itself." });
      }
      const key = `${input.targetId}\u0000${input.kind}`;
      if (edgeKeys.has(key)) ctx.addIssue({ code: "custom", path: ["edges", index], message: "Duplicate thought edge." });
      edgeKeys.add(key);
    }
    const taskIds = new Set(args.enrichments.tasks.map((row) => row.id));
    const dependencyKeys = new Set<string>();
    for (let index = 0; index < args.enrichments.taskDependencies.length; index++) {
      const dependency = args.enrichments.taskDependencies[index];
      if (!taskIds.has(dependency.blockedTaskId)) {
        ctx.addIssue({
          code: "custom",
          path: ["enrichments", "taskDependencies", index, "blockedTaskId"],
          message: "A captured dependency must target a task in the same mutation.",
        });
      }
      const key = `${dependency.blockerTaskId}\u0000${dependency.blockedTaskId}`;
      if (dependencyKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["enrichments", "taskDependencies", index],
          message: "Duplicate captured task dependency.",
        });
      }
      dependencyKeys.add(key);
    }
    for (let index = 0; index < args.enrichments.locations.length; index++) {
      if (args.enrichments.locations[index].sourceRevision !== args.thought.contentRevision) {
        ctx.addIssue({
          code: "custom",
          path: ["enrichments", "locations", index, "sourceRevision"],
          message: "Location sourceRevision must match the thought content revision.",
        });
      }
    }
    for (const group of ["movies", "albums"] as const) {
      const normalizedTitles = new Set<string>();
      for (let index = 0; index < args.enrichments[group].length; index++) {
        const normalizedTitle = args.enrichments[group][index].normalizedTitle;
        if (normalizedTitles.has(normalizedTitle)) {
          ctx.addIssue({
            code: "custom",
            path: ["enrichments", group, index, "normalizedTitle"],
            message: "A normalized media title may occur only once per thought.",
          });
        }
        normalizedTitles.add(normalizedTitle);
      }
    }
  });
export type CreateThoughtArgs = z.infer<typeof createThoughtArgs>;

const editThoughtArgs = z
  .object({
    id: stableId,
    expectedVersion: z.number().int().min(1),
    historyId: stableId,
    body: z.string().max(500_000).refine((value) => value.trim().length > 0, "Body is required."),
    bodyHash: revision,
    updatedAt: timestamp,
    contentRevision: revision,
    private: storedFlag.optional(),
    tags: z.array(thoughtTagArg).max(200),
    attachments: z.array(thoughtAttachmentArg).max(100),
  })
  .superRefine((args, ctx) => {
    const ids = new Set<string>();
    const tagIds = new Set<string>();
    for (let index = 0; index < args.tags.length; index++) {
      const input = args.tags[index];
      if (input.tagId !== input.normalizedName) {
        ctx.addIssue({ code: "custom", path: ["tags", index, "tagId"], message: "tagId must be the normalized tag name." });
      }
      if (tagIds.has(input.tagId)) ctx.addIssue({ code: "custom", path: ["tags", index, "tagId"], message: "A tag may occur only once per thought." });
      tagIds.add(input.tagId);
      if (ids.has(input.id)) ctx.addIssue({ code: "custom", path: ["tags", index, "id"], message: "Row ids must be unique within a thought mutation." });
      ids.add(input.id);
    }
    for (let index = 0; index < args.attachments.length; index++) {
      const input = args.attachments[index];
      if (ids.has(input.id)) ctx.addIssue({ code: "custom", path: ["attachments", index, "id"], message: "Row ids must be unique within a thought mutation." });
      ids.add(input.id);
    }
  });
export type EditThoughtArgs = z.infer<typeof editThoughtArgs>;

const deleteThoughtArgs = z.object({ id: stableId });
export type DeleteThoughtArgs = z.infer<typeof deleteThoughtArgs>;
const updateTaskStateArgs = z.object({
  id: stableId,
  completedAt: timestamp.nullable().optional(),
  deprioritizedAt: timestamp.nullable().optional(),
}).refine(
  (args) => args.completedAt !== undefined || args.deprioritizedAt !== undefined,
  "At least one task state field is required.",
);
const updateQuestionStateArgs = z.object({
  id: stableId,
  answeredAt: timestamp.nullable(),
});
const updateProjectStatusArgs = z.object({
  id: stableId,
  status: z.enum(["draft", "active", "archived"]),
  archivedAt: timestamp.nullable(),
});

const { shared } = defineMutators(schema);

function requireMutationUser(user: string): string {
  if (user) return user;
  throw new Error("An authenticated author is required.");
}

function queryRows(value: unknown, label: string): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) throw new Error(`${label} did not return rows.`);
  return value as Array<Record<string, unknown>>;
}

function rowIds(value: unknown, label: string, maxRows = 10_000): string[] {
  const rows = queryRows(value, label);
  if (rows.length > maxRows) throw new Error(`${label} exceeds the ${maxRows}-row mutation safety limit.`);
  return rows.map((row) => {
    if (typeof row.id !== "string") throw new Error(`${label} returned a row without a text id.`);
    return row.id;
  });
}

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

/** Delete one post and every normalized edge owned by it. The edge primary keys are discovered
 * through replayable shared queries so the same deterministic body runs in the optimistic client
 * and at the server authority. The shared author profile is intentionally retained. */
const deletePost = shared(deletePostArgs, function* (tx, args) {
  const facets = (yield tx.query(q.postFacet.where.postId(args.id))) as unknown as Array<{
    id?: unknown;
  }>;
  const authors = (yield tx.query(q.postAuthor.where.postId(args.id))) as unknown as Array<{
    id?: unknown;
  }>;
  const comments = rowIds(
    (yield tx.query(q.postComment.where.postId(args.id).orderBy("id", "asc").limit(10_001))) as unknown,
    "post comments",
  );

  for (const row of facets) {
    if (typeof row.id === "string") yield tx.delete("postFacet", { id: row.id });
  }
  for (const row of authors) {
    if (typeof row.id === "string") yield tx.delete("postAuthor", { id: row.id });
  }
  for (const id of comments) yield tx.delete("postComment", { id });
  yield tx.delete("post", { id: args.id });
});

/** Add a public post comment or reply. The callsite supplies stable ids, timestamps, and the account
 * display label; the row's ownership always comes from the tier-injected authenticated principal.
 * The authority separately verifies the display label against the signed account session. */
const createPostComment = shared(createPostCommentArgs, function* (tx, args, ctx) {
  const authorId = requireMutationUser(ctx.user);
  const targetPost = (yield tx.row("post", { id: args.comment.postId })) as
    | Record<string, unknown>
    | undefined;
  if (!targetPost) throw new Error("Post not found.");

  if (args.comment.parentId !== null) {
    const parent = (yield tx.row("postComment", { id: args.comment.parentId })) as
      | Record<string, unknown>
      | undefined;
    if (!parent || parent.postId !== args.comment.postId) {
      throw new Error("Parent comment not found in this post.");
    }
  }

  yield tx.insert("postComment", {
    ...args.comment,
    authorId,
    deletedAt: null,
  });
});

/** Tombstone an author's comment instead of removing it, preserving the shape and readability of
 * every reply below it. Ownership is checked inside the same replayed body on both tiers. */
const deletePostComment = shared(deletePostCommentArgs, function* (tx, args, ctx) {
  const authorId = requireMutationUser(ctx.user);
  const comment = (yield tx.row("postComment", { id: args.id })) as
    | Record<string, unknown>
    | undefined;
  if (!comment) throw new Error("Comment not found.");
  if (comment.authorId !== authorId) throw new Error("Only the comment author can delete it.");
  if (comment.deletedAt !== null) return;
  yield tx.update("postComment", { id: args.id, body: "", deletedAt: args.deletedAt });
});

/** Insert one stable thought plus its deterministic local projections. Every id, timestamp, hash,
 * and revision is supplied by the callsite; the authenticated author comes only from ctx.user. */
const createThought = shared(createThoughtArgs, function* (tx, args, ctx) {
  const authorId = requireMutationUser(ctx.user);
  if (args.thought.parentId !== null) {
    const parent = (yield tx.row("thought", { id: args.thought.parentId })) as Record<string, unknown> | undefined;
    if (!parent) throw new Error("Parent thought not found.");
  }

  yield tx.insert("thought", {
    ...args.thought,
    authorId,
    version: 1,
    color: null,
    colorRevision: null,
    colorProjectionVersion: null,
    colorStatus: "pending",
  });

  // A `#p` capture starts as a draft. Projects are inserted before tasks so inline `#t` rows can
  // join the new draft in the same optimistic/server transaction.
  for (const input of args.enrichments.projects) {
    yield tx.insert("project", {
      ...input,
      thoughtId: args.thought.id,
      authorId,
      status: "draft",
      archivedAt: null,
      private: args.thought.private,
    });
  }

  // Drafts absorb task captures from their own root thought and from descendants. Converted
  // projects are deliberately sealed. The ancestry walk is replay-safe and bounded; it uses only
  // rows visible in the transaction, so server and optimistic rebases converge without a trigger.
  let capturedProjectId = args.enrichments.projects[0]?.id ?? null;
  let ancestorId = capturedProjectId === null ? args.thought.parentId : null;
  let ancestorHops = 0;
  while (capturedProjectId === null && ancestorId !== null && ancestorHops++ < 200) {
    const draftRows = queryRows(
      (yield tx.query(
        q.project
          .where.thoughtId(ancestorId)
          .where.status("draft")
          .orderBy("id", "asc")
          .limit(1),
      )) as unknown,
      "ancestor draft projects",
    );
    const draftId = draftRows[0]?.id;
    if (typeof draftId === "string") {
      capturedProjectId = draftId;
      break;
    }
    const ancestor = (yield tx.row("thought", { id: ancestorId })) as Record<string, unknown> | undefined;
    ancestorId = typeof ancestor?.parentId === "string" ? ancestor.parentId : null;
  }

  for (const input of args.enrichments.tasks) {
    yield tx.insert("task", {
      ...input,
      thoughtId: args.thought.id,
      projectId: capturedProjectId,
      completedAt: null,
      deprioritizedAt: null,
      position: null,
      private: args.thought.private,
    });
  }

  // The composer supplies ids for the exact parent-task × captured-task edges it saw. Re-check the
  // provenance and project membership inside the mutation: a stale parent view simply omits an edge
  // rather than rejecting the thought.
  for (const input of args.enrichments.taskDependencies) {
    const blocker = (yield tx.row("task", { id: input.blockerTaskId })) as Record<string, unknown> | undefined;
    const blocked = (yield tx.row("task", { id: input.blockedTaskId })) as Record<string, unknown> | undefined;
    if (
      !blocker ||
      !blocked ||
      blocker.thoughtId !== args.thought.parentId ||
      blocked.thoughtId !== args.thought.id ||
      typeof blocker.projectId !== "string" ||
      blocker.projectId !== blocked.projectId
    ) {
      continue;
    }
    yield tx.insertIgnore("taskDependency", input);
  }

  for (const input of args.enrichments.events) {
    yield tx.insert("event", { ...input, thoughtId: args.thought.id });
  }
  for (const input of args.enrichments.questions) {
    yield tx.insert("question", {
      ...input,
      thoughtId: args.thought.id,
      answeredAt: null,
    });
  }
  for (const input of args.enrichments.locations) {
    yield tx.insert("location", {
      ...input,
      thoughtId: args.thought.id,
      latitude: null,
      longitude: null,
      resolvedName: null,
      resolutionRevision: null,
      resolutionStatus: "pending",
    });
  }
  for (const input of args.enrichments.movies) {
    const existingRows = queryRows(
      (yield tx.query(
        q.movie.where.normalizedTitle(input.normalizedTitle).orderBy("id", "asc").limit(1),
      )) as unknown,
      "normalized movie",
    );
    const existingId = existingRows[0]?.id;
    const movieId = typeof existingId === "string" ? existingId : input.id;
    if (typeof existingId !== "string") {
      yield tx.insert("movie", {
        id: input.id,
        title: input.title,
        normalizedTitle: input.normalizedTitle,
        description: input.description,
        posterUrl: null,
        year: null,
        tmdbId: null,
        voteAverage: null,
        voteCount: null,
        metadataStatus: "pending",
        metadataProjectionVersion: null,
        createdAt: input.createdAt,
      });
    }
    yield tx.insert("thoughtMovie", {
      id: input.linkId,
      thoughtId: args.thought.id,
      movieId,
      description: input.description,
      createdAt: input.createdAt,
    });
  }
  for (const input of args.enrichments.books) {
    yield tx.insert("book", {
      ...input,
      thoughtId: args.thought.id,
      coverUrl: null,
      author: null,
      year: null,
      openLibraryKey: null,
      metadataStatus: "pending",
      metadataProjectionVersion: null,
    });
  }
  for (const input of args.enrichments.albums) {
    const existingRows = queryRows(
      (yield tx.query(
        q.album.where.normalizedTitle(input.normalizedTitle).orderBy("id", "asc").limit(1),
      )) as unknown,
      "normalized album",
    );
    const existingId = existingRows[0]?.id;
    const albumId = typeof existingId === "string" ? existingId : input.id;
    if (typeof existingId !== "string") {
      yield tx.insert("album", {
        id: input.id,
        title: input.title,
        normalizedTitle: input.normalizedTitle,
        artist: null,
        year: null,
        coverUrl: null,
        itunesId: null,
        genre: null,
        metadataStatus: "pending",
        metadataProjectionVersion: null,
        createdAt: input.createdAt,
      });
    }
    yield tx.insert("thoughtAlbum", {
      id: input.linkId,
      thoughtId: args.thought.id,
      albumId,
      description: input.description,
      createdAt: input.createdAt,
    });
  }

  for (const input of args.tags) {
    yield tx.insertIgnore("tag", {
      id: input.tagId,
      name: input.name,
      normalizedName: input.normalizedName,
    });
    yield tx.insert("thoughtTag", {
      id: input.id,
      thoughtId: args.thought.id,
      tagId: input.tagId,
      position: input.position,
    });
  }
  for (const input of args.attachments) {
    yield tx.insert("thoughtAttachment", { ...input, thoughtId: args.thought.id });
  }
  for (const input of args.edges) {
    yield tx.insert("thoughtEdge", {
      id: input.id,
      sourceId: args.thought.id,
      targetId: input.targetId,
      kind: input.kind,
      createdAt: input.createdAt,
    });
  }
});

/** Edit a thought in place. The prior body is snapshotted explicitly before the update—the
 * trigger-free equivalent of the legacy thought_history_snapshot trigger. expectedVersion prevents
 * a stale editor from silently overwriting a newer body. */
const editThought = shared(editThoughtArgs, function* (tx, args, ctx) {
  const authorId = requireMutationUser(ctx.user);
  const current = (yield tx.row("thought", { id: args.id })) as Record<string, unknown> | undefined;
  if (!current) throw new Error("Thought not found.");
  if (current.authorId !== authorId) throw new Error("Only the thought author can edit it.");
  if (current.version !== args.expectedVersion) throw new Error("The thought changed since this edit began.");
  if (
    typeof current.body !== "string" ||
    typeof current.bodyHash !== "string" ||
    typeof current.updatedAt !== "number" ||
    typeof current.version !== "number" ||
    typeof current.private !== "number"
  ) {
    throw new Error("Thought row has an invalid stored shape.");
  }

  const bodyChanged = current.body !== args.body;
  if (!bodyChanged && current.bodyHash !== args.bodyHash) {
    throw new Error("An unchanged body must retain its body hash.");
  }

  if (bodyChanged) {
    yield tx.insert("thoughtHistory", {
      id: args.historyId,
      thoughtId: args.id,
      version: current.version,
      body: current.body,
      bodyHash: current.bodyHash,
      writtenAt: current.updatedAt,
      replacedAt: args.updatedAt,
    });
    yield tx.update("thought", {
      id: args.id,
      body: args.body,
      bodyHash: args.bodyHash,
      updatedAt: args.updatedAt,
      version: current.version + 1,
      contentRevision: args.contentRevision,
      colorStatus: "pending",
    });

    const oldTagRows = queryRows(
      (yield tx.query(q.thoughtTag.where.thoughtId(args.id).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought tags",
    );
    if (oldTagRows.length > 10_000) throw new Error("thought tags exceeds the 10,000-row mutation safety limit.");
    const oldTagProfileIds = new Set<string>();
    for (const row of oldTagRows) {
      if (typeof row.id !== "string" || typeof row.tagId !== "string") {
        throw new Error("thought tags returned a row without text ids.");
      }
      oldTagProfileIds.add(row.tagId);
      yield tx.delete("thoughtTag", { id: row.id });
    }
    for (const input of args.tags) {
      yield tx.insertIgnore("tag", {
        id: input.tagId,
        name: input.name,
        normalizedName: input.normalizedName,
      });
      yield tx.insert("thoughtTag", {
        id: input.id,
        thoughtId: args.id,
        tagId: input.tagId,
        position: input.position,
      });
    }
    // Tags are shared profiles, but body extraction owns their lifecycle. Once all replacement links
    // have landed, remove a prior profile only when no thought references it anymore.
    for (const tagId of oldTagProfileIds) {
      const remaining = queryRows(
        (yield tx.query(q.thoughtTag.where.tagId(tagId).orderBy("id", "asc").limit(1))) as unknown,
        "remaining thought tag links",
      );
      if (remaining.length === 0) yield tx.delete("tag", { id: tagId });
    }
  }

  if (args.private !== undefined && args.private !== current.private) {
    yield tx.update("thought", { id: args.id, private: args.private });
  }
  for (const input of args.attachments) {
    yield tx.insert("thoughtAttachment", { ...input, thoughtId: args.id });
  }
});

/** Structured records outlive body edits and are curated directly after capture. */
const updateTaskState = shared(updateTaskStateArgs, function* (tx, args, ctx) {
  requireMutationUser(ctx.user);
  const current = (yield tx.row("task", { id: args.id })) as Record<string, unknown> | undefined;
  if (!current) throw new Error("Task not found.");
  yield tx.update("task", {
    id: args.id,
    ...(args.completedAt !== undefined ? { completedAt: args.completedAt } : {}),
    ...(args.deprioritizedAt !== undefined ? { deprioritizedAt: args.deprioritizedAt } : {}),
  });
});

const updateQuestionState = shared(updateQuestionStateArgs, function* (tx, args, ctx) {
  requireMutationUser(ctx.user);
  const current = (yield tx.row("question", { id: args.id })) as Record<string, unknown> | undefined;
  if (!current) throw new Error("Question not found.");
  yield tx.update("question", args);
});

const updateProjectStatus = shared(updateProjectStatusArgs, function* (tx, args, ctx) {
  const authorId = requireMutationUser(ctx.user);
  const current = (yield tx.row("project", { id: args.id })) as Record<string, unknown> | undefined;
  if (!current) throw new Error("Project not found.");
  if (current.authorId !== authorId) throw new Error("Only the project author can update it.");
  if (args.status === "archived" && args.archivedAt === null) throw new Error("Archived projects need an archive timestamp.");
  if (args.status !== "archived" && args.archivedAt !== null) throw new Error("Only archived projects may have an archive timestamp.");
  yield tx.update("project", args);
});

/** Delete a thought and its reply subtree without relying on foreign-key cascades. Structured rows
 * that became independently editable in the legacy final model (tasks/projects) retain their row and
 * lose only thought provenance; derived child records are deleted. Loose project-item references are
 * intentionally retained, matching their documented "missing target" behavior. */
const deleteThought = shared(deleteThoughtArgs, function* (tx, args, ctx) {
  const authorId = requireMutationUser(ctx.user);
  const root = (yield tx.row("thought", { id: args.id })) as Record<string, unknown> | undefined;
  if (!root) throw new Error("Thought not found.");
  if (root.authorId !== authorId) throw new Error("Only the thought author can delete it.");

  const thoughtIds: string[] = [];
  const possiblyOrphanedTagIds = new Set<string>();
  const seen = new Set<string>();
  const queue = [args.id];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    thoughtIds.push(id);
    if (thoughtIds.length > 10_000) throw new Error("Thought reply subtree exceeds the 10,000-row deletion limit.");
    const children = queryRows(
      (yield tx.query(q.thought.where.parentId(id).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought replies",
    );
    if (children.length > 10_000) throw new Error("A thought has too many direct replies to delete safely.");
    for (const child of children) {
      if (typeof child.id !== "string") throw new Error("A reply is missing its text id.");
      if (child.authorId !== authorId) throw new Error("A reply subtree contains a thought owned by another author.");
      queue.push(child.id);
    }
  }

  for (const thoughtId of thoughtIds) {
    const historyIds = rowIds(
      (yield tx.query(q.thoughtHistory.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought history",
    );
    for (const id of historyIds) yield tx.delete("thoughtHistory", { id });

    const attachmentIds = rowIds(
      (yield tx.query(q.thoughtAttachment.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought attachments",
    );
    for (const id of attachmentIds) yield tx.delete("thoughtAttachment", { id });

    const tagLinkRows = queryRows(
      (yield tx.query(q.thoughtTag.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought tag links",
    );
    if (tagLinkRows.length > 10_000) throw new Error("thought tag links exceeds the 10,000-row mutation safety limit.");
    for (const row of tagLinkRows) {
      if (typeof row.id !== "string" || typeof row.tagId !== "string") {
        throw new Error("thought tag links returned a row without text ids.");
      }
      possiblyOrphanedTagIds.add(row.tagId);
      yield tx.delete("thoughtTag", { id: row.id });
    }

    const outboundEdgeIds = rowIds(
      (yield tx.query(q.thoughtEdge.where.sourceId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "outbound thought edges",
    );
    const inboundEdgeIds = rowIds(
      (yield tx.query(q.thoughtEdge.where.targetId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "inbound thought edges",
    );
    for (const id of new Set([...outboundEdgeIds, ...inboundEdgeIds])) yield tx.delete("thoughtEdge", { id });

    for (const tableQuery of [
      ["event", q.event.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001)],
      ["question", q.question.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001)],
      ["location", q.location.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001)],
      ["book", q.book.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001)],
      ["thoughtMovie", q.thoughtMovie.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001)],
      ["thoughtAlbum", q.thoughtAlbum.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001)],
      ["thoughtBookmark", q.thoughtBookmark.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001)],
      ["clusterMembership", q.clusterMembership.where.itemKind("thought").where.itemId(thoughtId).orderBy("id", "asc").limit(10_001)],
    ] as const) {
      const [table, tableQueryValue] = tableQuery;
      const ids = rowIds((yield tx.query(tableQueryValue)) as unknown, `${table} thought dependents`);
      for (const id of ids) {
        if (table === "event") yield tx.delete("event", { id });
        else if (table === "question") yield tx.delete("question", { id });
        else if (table === "location") yield tx.delete("location", { id });
        else if (table === "book") yield tx.delete("book", { id });
        else if (table === "thoughtMovie") yield tx.delete("thoughtMovie", { id });
        else if (table === "thoughtAlbum") yield tx.delete("thoughtAlbum", { id });
        else if (table === "thoughtBookmark") yield tx.delete("thoughtBookmark", { id });
        else yield tx.delete("clusterMembership", { id });
      }
    }

    const taskIds = rowIds(
      (yield tx.query(q.task.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought-backed tasks",
    );
    for (const id of taskIds) yield tx.update("task", { id, thoughtId: null });

    const projectIds = rowIds(
      (yield tx.query(q.project.where.thoughtId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought-backed projects",
    );
    for (const id of projectIds) yield tx.update("project", { id, thoughtId: null });

    const framingNodeIds = rowIds(
      (yield tx.query(q.framingNode.where.itemType("thought").where.itemId(thoughtId).orderBy("id", "asc").limit(10_001))) as unknown,
      "thought framing nodes",
    );
    for (const nodeId of framingNodeIds) {
      const outgoing = rowIds(
        (yield tx.query(q.framingEdge.where.sourceNodeId(nodeId).orderBy("id", "asc").limit(10_001))) as unknown,
        "outgoing framing edges",
      );
      const incoming = rowIds(
        (yield tx.query(q.framingEdge.where.targetNodeId(nodeId).orderBy("id", "asc").limit(10_001))) as unknown,
        "incoming framing edges",
      );
      for (const id of new Set([...outgoing, ...incoming])) yield tx.delete("framingEdge", { id });
      yield tx.delete("framingNode", { id: nodeId });
    }
  }

  for (const tagId of possiblyOrphanedTagIds) {
    const remaining = queryRows(
      (yield tx.query(q.thoughtTag.where.tagId(tagId).orderBy("id", "asc").limit(1))) as unknown,
      "remaining thought tag links",
    );
    if (remaining.length === 0) yield tx.delete("tag", { id: tagId });
  }

  for (const id of thoughtIds.reverse()) yield tx.delete("thought", { id });
});

export const mutators = {
  savePost,
  deletePost,
  createPostComment,
  deletePostComment,
  createThought,
  editThought,
  updateTaskState,
  updateQuestionState,
  updateProjectStatus,
  deleteThought,
} satisfies ClientRegistry;
