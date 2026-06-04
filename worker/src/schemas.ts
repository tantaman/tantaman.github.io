import { z } from "zod";

// POST /thoughts (JSON branch)
export const CreateThoughtBody = z.object({
  body: z.string(),
  parent_id: z.number().int().optional(),
  private: z.boolean().optional(),
});

// PATCH /thoughts/:id (JSON branch). Editing is an in-place update of the
// stable row; the body trigger snapshots the prior version into thought_history.
export const UpdateThoughtBody = z.object({
  body: z.string().optional(),
  private: z.boolean().optional(),
});

// POST /thoughts/:id/revert
export const RevertThoughtBody = z.object({
  version: z.number().int().positive(),
});

// PATCH /tasks/:id
export const UpdateTaskBody = z.object({
  completed: z.boolean().optional(),
  deprioritized: z.boolean().optional(),
});

// PATCH /questions/:id
export const UpdateQuestionBody = z.object({
  answered: z.boolean().optional(),
});

// PATCH /projects/:id
export const UpdateProjectBody = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
  archived: z.boolean().optional(),
});

// POST /thoughts/:id/blockers — record that `blocker_id` must complete before
// this thought's task (a `blocks` edge in thought_edge).
export const AddBlockerBody = z.object({
  blocker_id: z.number().int(),
});

// POST /framings
export const CreateFramingBody = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
});

// PATCH /framings/:id
export const UpdateFramingBody = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

// POST /framings/:id/nodes
export const PlaceNodeBody = z.object({
  node_type: z.enum(["thought", "post", "document", "framing"]),
  item_id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number().optional(),
  h: z.number().optional(),
});

// PATCH /framings/:id/nodes/:nodeId
export const UpdateNodeBody = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
});

// POST /framings/:id/edges
export const CreateEdgeBody = z.object({
  source_node_id: z.number().int(),
  target_node_id: z.number().int(),
  label: z.string().optional(),
  source_handle: z.string().nullable().optional(),
  target_handle: z.string().nullable().optional(),
  kind: z.string().nullable().optional(),
});

// PATCH /framings/:id/edges/:edgeId
export const UpdateEdgeBody = z.object({
  label: z.string().optional(),
});

// POST /framings/import
export const ImportFramingBody = z.object({
  name: z.string().trim().min(1),
  nodes: z.array(z.object({
    id: z.union([z.number(), z.string()]),
    type: z.enum(["thought", "post"]),
    x: z.number(),
    y: z.number(),
    body: z.string().optional(),
    timestamp: z.number().optional(),
    color: z.string().nullable().optional(),
    slug: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })),
  edges: z.array(z.object({
    source: z.union([z.number(), z.string()]),
    target: z.union([z.number(), z.string()]),
    label: z.string().nullable().optional(),
  })),
});

// POST /canvases
export const CreateCanvasBody = z.object({
  name: z.string().trim().min(1),
});

// PATCH /canvases/:id
export const UpdateCanvasBody = z.object({
  name: z.string().trim().min(1).optional(),
  snapshot: z.string().optional(),
});

// POST /dha/reports
export const CreateDhaReportBody = z.object({
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  data: z.record(z.unknown()),
});

// PATCH /framings/:id/batch
export const BatchUpdateBody = z.object({
  nodes: z.array(z.object({
    node_id: z.number().int(),
    x: z.number(),
    y: z.number(),
    w: z.number().optional(),
    h: z.number().optional(),
  })).min(1),
});

// --- Documents ---

export const DocumentFrontmatter = z.object({
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  layout: z.string().optional(),
  related: z.array(z.string()).optional(),
  wide: z.boolean().optional(),
  concern: z.array(z.string()).optional(),
  image: z.string().optional(),
  date: z.string().optional(),
  minimalHeader: z.boolean().optional(),
  noHeader: z.boolean().optional(),
  js: z.array(z.string()).optional(),
  form: z.string().optional(),
}).strict();

export const DocumentStatus = z.enum(["document", "draft", "published"]);
export const DocumentSlug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase hyphenated");

// POST /documents
export const CreateDocumentBody = z.object({
  title: z.string().trim().min(1),
  body: z.string().optional(),
  private: z.boolean().optional(),
  slug: DocumentSlug.optional(),
  status: DocumentStatus.optional(),
  frontmatter: DocumentFrontmatter.optional(),
});

// PATCH /documents/:id
export const UpdateDocumentBody = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().optional(),
  private: z.boolean().optional(),
  slug: DocumentSlug.nullable().optional(),
  status: DocumentStatus.optional(),
  frontmatter: DocumentFrontmatter.optional(),
});

// --- Comments ---

// POST /comments/:slug/like
export const LikeBody = z.object({
  visitor_id: z.string().min(1).max(128),
});

// POST /comments/auth/request-otp
export const RequestOtpBody = z.object({
  email: z.string().email(),
});

// POST /comments/auth/verify-otp
export const VerifyOtpBody = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  display_name: z.string().trim().min(1).max(100).optional(),
});

// PATCH /movies/:id
export const UpdateMovieBody = z.object({
  title: z.string().trim().min(1).optional(),
  tmdb_id: z.number().int().positive().optional(),
}).refine(
  (data) => data.title !== undefined || data.tmdb_id !== undefined,
  { message: "Must provide title or tmdb_id" },
);

// PATCH /books/:id
export const UpdateBookBody = z.object({
  title: z.string().trim().min(1).optional(),
  ol_key: z.string().trim().min(1).optional(),
}).refine(
  (data) => data.title !== undefined || data.ol_key !== undefined,
  { message: "Must provide title or ol_key" },
);

// PATCH /albums/:id
export const UpdateAlbumBody = z.object({
  title: z.string().trim().min(1).optional(),
  itunes_id: z.number().int().positive().optional(),
}).refine(
  (data) => data.title !== undefined || data.itunes_id !== undefined,
  { message: "Must provide title or itunes_id" },
);

// --- Lists ---

// POST /lists
export const CreateListBody = z.object({
  name: z.string().trim().min(1).max(200),
});

// PATCH /lists/:id
export const UpdateListBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

// POST /lists/:id/items
export const CreateListItemBody = z.object({
  text: z.string().trim().min(1).max(1000),
});

// PATCH /lists/:id/items/:itemId
export const UpdateListItemBody = z.object({
  text: z.string().trim().min(1).max(1000).optional(),
  completed: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

// PATCH /lists/:id/items/reorder
export const ReorderListItemsBody = z.object({
  items: z.array(z.object({
    id: z.number().int(),
    position: z.number().int().min(0),
  })).min(1),
});

// POST /amplifications
export const CreateAmplificationBody = z.object({
  url: z.string().url().max(2048),
  source: z.string().trim().min(1).max(64).optional(),
  note: z.string().max(2000).optional(),
});

// POST /comments/:slug
export const CreateCommentBody = z.object({
  body: z.string().trim().min(1).max(2000),
  parent_id: z.number().int().optional(),
});
