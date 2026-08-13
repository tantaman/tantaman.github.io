import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import { ulid } from "ulid";
import { z } from "zod";

import { app, currentQueryContext } from "../rindle-client.ts";
import { FRAMINGS_LIMIT, framingsQuery, type FramingsRow } from "./Framing.queries.ts";

const importNode = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.enum(["thought", "post", "framing", "document"]),
  item_id: z.union([z.string(), z.number()]).optional(),
  slug: z.string().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
});
const importPayload = z.object({
  name: z.string().trim().min(1).max(300),
  // Exports written before framings had their own visibility carry no flag; every framing was public
  // then, so a missing field restores as public.
  private: z.number().int().min(0).max(1).optional(),
  nodes: z.array(importNode).max(1_000),
  edges: z.array(z.object({
    source: z.union([z.string(), z.number()]),
    target: z.union([z.string(), z.number()]),
    label: z.string().nullable().optional(),
    source_handle: z.string().nullable().optional(),
    target_handle: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
  })).max(5_000),
});

export function FramingsListView({ isAdmin }: { isAdmin: boolean }) {
  const [rows, { status }] = useRoot(framingsQuery, { limit: FRAMINGS_LIMIT }, currentQueryContext());
  const framings = rows.slice(0, FRAMINGS_LIMIT) as readonly FramingsRow[];
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function create(event: FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    if (!isAdmin || !nextName) return;
    const now = Date.now();
    const id = ulid();
    try {
      app.mutate.createFraming({
        framing: { id, name: nextName, description: null, private: isPrivate ? 1 : 0, createdAt: now, updatedAt: now },
      });
      setName("");
      setIsPrivate(false);
      setError(null);
      void navigate({ to: "/thoughts/framings/$id", params: { id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create framing.");
    }
  }

  function setPrivacy(framing: FramingsRow) {
    if (!isAdmin) return;
    try {
      app.mutate.updateFraming({
        id: framing.id,
        private: framing.private === 1 ? 0 : 1,
        updatedAt: Date.now(),
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change framing visibility.");
    }
  }

  function remove(id: string) {
    if (!isAdmin || !window.confirm("Delete this framing? This cannot be undone.")) return;
    try {
      app.mutate.deleteFraming({ id });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete framing.");
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !isAdmin) return;
    try {
      const parsed = importPayload.parse(JSON.parse(await file.text()));
      const framingId = ulid();
      const now = Date.now();
      const nodeIds = new Map<string, string>();
      const nodes = parsed.nodes.flatMap((node) => {
        // The Rindle port has no document model. Keep legacy D1 exports importable by omitting
        // document nodes (and, below, any edges that touched them).
        if (node.type === "document") return [];
        const itemId = String(node.item_id ?? node.slug ?? node.id);
        const rowId = ulid();
        nodeIds.set(String(node.id), rowId);
        nodeIds.set(`${node.type}:${itemId}`, rowId);
        return [{
          id: rowId,
          framingId,
          itemType: node.type,
          itemId,
          x: node.x,
          y: node.y,
          width: null,
          height: null,
        }];
      });
      const edges = parsed.edges.flatMap((edge) => {
        const sourceNodeId = nodeIds.get(String(edge.source));
        const targetNodeId = nodeIds.get(String(edge.target));
        if (!sourceNodeId || !targetNodeId) return [];
        return [{
          id: ulid(),
          framingId,
          sourceNodeId,
          targetNodeId,
          label: edge.label?.trim() || null,
          sourceHandle: edge.source_handle ?? null,
          targetHandle: edge.target_handle ?? null,
          kind: edge.kind ?? null,
        }];
      });
      app.mutate.importFraming({
        framing: {
          id: framingId,
          name: parsed.name,
          description: null,
          private: parsed.private ?? 0,
          createdAt: now,
          updatedAt: now,
        },
        nodes,
        edges,
      });
      setError(null);
      void navigate({ to: "/thoughts/framings/$id", params: { id: framingId } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import framing.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="framings-view">
      <header className="thought-lane-head">
        <div><span>#f</span><h1>Framings</h1></div>
        <p>Spatial arrangements of thoughts, essays, and other framings. Every canvas stays live as its Rindle views change.</p>
      </header>
      {isAdmin ? (
        <form className="framings-create" onSubmit={create}>
          <input
            type="text"
            className="framings-name-input"
            placeholder="New framing name…"
            value={name}
            maxLength={300}
            onChange={(event) => setName(event.target.value)}
          />
          <label className="thought-private-toggle">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(event) => setIsPrivate(event.target.checked)}
            />
            <span aria-hidden="true" />
            Private
          </label>
          <button type="submit" className="framings-create-btn" disabled={!name.trim()}>Create</button>
          <button type="button" className="framings-create-btn" onClick={() => fileInputRef.current?.click()}>Import</button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importFile(event)} />
        </form>
      ) : null}
      {error ? <p className="framings-error" role="alert">{error}</p> : null}
      {framings.length === 0 ? (
        <div className="thoughts-empty"><span aria-hidden="true">◇</span><p>{status === "complete" ? "No framings yet." : "Loading framings…"}</p></div>
      ) : (
        <ul className="framings-list">
          {framings.map((framing) => (
            <li key={framing.id} className={`framings-item${framing.private === 1 ? " is-private" : ""}`}>
              <Link to="/thoughts/framings/$id" params={{ id: framing.id }} className="framings-item-link">
                <span className="framings-item-name">{framing.name}</span>
                {framing.description ? <span className="framings-item-desc">{framing.description}</span> : null}
                <time dateTime={new Date(framing.updatedAt).toISOString()}>{new Date(framing.updatedAt).toLocaleDateString()}</time>
              </Link>
              {isAdmin ? (
                <button
                  type="button"
                  className={`framings-privacy-btn${framing.private === 1 ? " is-private" : ""}`}
                  onClick={() => setPrivacy(framing)}
                  aria-label={framing.private === 1 ? `Make ${framing.name} public` : `Make ${framing.name} private`}
                  title={framing.private === 1 ? "Private — click to publish" : "Public — click to make private"}
                >{framing.private === 1 ? "private" : "public"}</button>
              ) : null}
              {isAdmin ? (
                <button type="button" className="framings-delete-btn" onClick={() => remove(framing.id)} aria-label={`Delete ${framing.name}`}>×</button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {rows.length > FRAMINGS_LIMIT ? <p className="framings-limit-note">Showing the newest {FRAMINGS_LIMIT} framings.</p> : null}
    </section>
  );
}
