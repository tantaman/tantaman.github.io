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

// POST /framings/:id/thoughts
export const PlaceThoughtBody = z.object({
  thought_id: z.number().int(),
  x: z.number(),
  y: z.number(),
  w: z.number().optional(),
  h: z.number().optional(),
});

// PATCH /framings/:id/thoughts/:thoughtId
export const UpdatePlacementBody = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
});

// POST /framings/:id/edges
export const CreateEdgeBody = z.object({
  source_thought_id: z.number().int(),
  target_thought_id: z.number().int(),
  label: z.string().optional(),
  source_handle: z.string().nullable().optional(),
  target_handle: z.string().nullable().optional(),
});

// PATCH /framings/:id/edges/:edgeId
export const UpdateEdgeBody = z.object({
  label: z.string().optional(),
});

// PATCH /framings/:id/batch
export const BatchUpdateBody = z.object({
  thoughts: z.array(z.object({
    thought_id: z.number().int(),
    x: z.number(),
    y: z.number(),
    w: z.number().optional(),
    h: z.number().optional(),
  })).min(1),
});
