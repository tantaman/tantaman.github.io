import { z } from "zod";

// POST /thoughts (JSON branch)
export const CreateThoughtBody = z.object({
  body: z.string(),
  parent_id: z.number().int().optional(),
});

// PATCH /tasks/:id
export const UpdateTaskBody = z.object({
  completed: z.boolean(),
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
  node_type: z.enum(["thought", "post"]),
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
});

// PATCH /framings/:id/edges/:edgeId
export const UpdateEdgeBody = z.object({
  label: z.string().optional(),
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
