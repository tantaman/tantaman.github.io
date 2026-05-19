import { DurableObject } from "cloudflare:workers";
import type { Env } from "./index";

// Threshold of unsnapshotted steps before we tell the client to push a snapshot.
const SNAPSHOT_THRESHOLD = 64;
// Hard cap — refuse new steps if the log somehow grows past this without a
// snapshot landing. Forces the next client to snapshot before continuing.
const MAX_STEP_BACKLOG = 512;

interface StepEntry {
  version: number;     // version AFTER applying this step
  step: unknown;       // opaque ProseMirror Step JSON
  clientID: number;
  ts: number;
}

interface Snapshot {
  version: number;
  doc: unknown;        // ProseMirror doc JSON (opaque to the worker)
  body: string;        // derived markdown
  title: string;
  savedAt: number;
}

function stepKey(version: number): string {
  // Pad so lexical order matches numeric order (versions are ≥ 1 here).
  return `step:${String(version).padStart(10, "0")}`;
}

export class DocCollabRoom extends DurableObject<Env> {
  private documentId: number | null = null;

  // Cache fetched state to keep hot-path reads off storage.
  private snapshotCache: Snapshot | null | undefined = undefined;
  private headCache: number | undefined = undefined;

  private async loadSnapshot(): Promise<Snapshot | null> {
    if (this.snapshotCache !== undefined) return this.snapshotCache;
    const s = (await this.ctx.storage.get<Snapshot>("snapshot")) ?? null;
    this.snapshotCache = s;
    return s;
  }

  private async loadHead(): Promise<number> {
    if (this.headCache !== undefined) return this.headCache;
    const h = (await this.ctx.storage.get<number>("head")) ?? 0;
    this.headCache = h;
    return h;
  }

  private async stepsAfter(version: number, head: number): Promise<StepEntry[]> {
    if (version >= head) return [];
    // DO storage list() is [start, end) — so end = stepKey(head + 1) makes
    // head inclusive.
    const map = await this.ctx.storage.list<StepEntry>({
      start: stepKey(version + 1),
      end: stepKey(head + 1),
    });
    return Array.from(map.values());
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // Expected shape: ["collab", "<documentId>", "<action>"]
    if (parts[0] !== "collab" || !parts[1] || !parts[2]) {
      return new Response("Not found", { status: 404 });
    }
    this.documentId = parseInt(parts[1], 10);
    if (!Number.isFinite(this.documentId)) {
      return new Response("Bad document id", { status: 400 });
    }
    const action = parts[2];

    try {
      switch (action) {
        case "bootstrap":
          if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
          return await this.handleBootstrap();
        case "seed":
          if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
          return await this.handleSeed(request);
        case "steps":
          if (request.method === "GET") return await this.handleGetSteps(url);
          if (request.method === "POST") return await this.handleSubmitSteps(request);
          return new Response("Method not allowed", { status: 405 });
        case "snapshot":
          if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
          return await this.handleSnapshot(request);
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not found", { status: 404 });
  }

  private async handleBootstrap(): Promise<Response> {
    const snapshot = await this.loadSnapshot();
    const head = await this.loadHead();
    if (!snapshot) {
      return Response.json({ initialized: false, head });
    }
    const steps = await this.stepsAfter(snapshot.version, head);
    return Response.json({
      initialized: true,
      snapshot: {
        version: snapshot.version,
        doc: snapshot.doc,
        body: snapshot.body,
        title: snapshot.title,
      },
      steps: steps.map((s) => ({ version: s.version, step: s.step, clientID: s.clientID })),
      head,
    });
  }

  private async handleSeed(request: Request): Promise<Response> {
    const existing = await this.loadSnapshot();
    if (existing) {
      // Idempotent: the caller can just re-bootstrap.
      return Response.json({ ok: false, reason: "already-initialized", version: existing.version }, { status: 409 });
    }
    const body = await request.json<{ doc: unknown; body: string; title: string }>();
    const snapshot: Snapshot = {
      version: 0,
      doc: body.doc,
      body: body.body,
      title: body.title ?? "",
      savedAt: Math.floor(Date.now() / 1000),
    };
    await this.ctx.storage.put("snapshot", snapshot);
    await this.ctx.storage.put("head", 0);
    this.snapshotCache = snapshot;
    this.headCache = 0;
    await this.persistSnapshotToD1(snapshot);
    return Response.json({ ok: true, version: 0 });
  }

  private async handleGetSteps(url: URL): Promise<Response> {
    const since = parseInt(url.searchParams.get("since") ?? "0", 10) || 0;
    const snapshot = await this.loadSnapshot();
    const head = await this.loadHead();
    if (!snapshot) return Response.json({ initialized: false });
    if (since < snapshot.version) {
      // Caller is too far behind — they must reload from snapshot.
      return Response.json({ error: "stale", snapshotVersion: snapshot.version }, { status: 410 });
    }
    const steps = await this.stepsAfter(since, head);
    return Response.json({
      head,
      steps: steps.map((s) => ({ version: s.version, step: s.step, clientID: s.clientID })),
    });
  }

  private async handleSubmitSteps(request: Request): Promise<Response> {
    const body = await request.json<{
      baseVersion: number;
      steps: unknown[];
      clientID: number;
    }>();
    const snapshot = await this.loadSnapshot();
    const head = await this.loadHead();
    if (!snapshot) {
      return Response.json({ error: "not-initialized" }, { status: 409 });
    }
    if (body.baseVersion < snapshot.version) {
      return Response.json({ error: "stale", snapshotVersion: snapshot.version }, { status: 410 });
    }
    if (body.baseVersion > head) {
      return Response.json({ error: "future-version" }, { status: 400 });
    }
    if (body.baseVersion < head) {
      // Conflict — return the missed steps so the client can rebase + retry.
      const missed = await this.stepsAfter(body.baseVersion, head);
      return Response.json(
        {
          error: "behind",
          head,
          steps: missed.map((s) => ({ version: s.version, step: s.step, clientID: s.clientID })),
        },
        { status: 409 },
      );
    }
    if (head - snapshot.version + body.steps.length > MAX_STEP_BACKLOG) {
      // Force the client to snapshot before we accept more steps.
      return Response.json(
        { error: "snapshot-required", head, snapshotVersion: snapshot.version },
        { status: 409 },
      );
    }
    // Append.
    const now = Math.floor(Date.now() / 1000);
    const writes: Record<string, StepEntry | number> = {};
    let v = head;
    for (const step of body.steps) {
      v += 1;
      writes[stepKey(v)] = { version: v, step, clientID: body.clientID, ts: now };
    }
    writes["head"] = v;
    await this.ctx.storage.put(writes);
    this.headCache = v;
    const shouldSnapshot = v - snapshot.version > SNAPSHOT_THRESHOLD;
    return Response.json({ version: v, head: v, shouldSnapshot });
  }

  private async handleSnapshot(request: Request): Promise<Response> {
    const body = await request.json<{
      version: number;
      doc: unknown;
      body: string;
      title: string;
    }>();
    const snapshot = await this.loadSnapshot();
    const head = await this.loadHead();
    if (!snapshot) {
      return Response.json({ error: "not-initialized" }, { status: 409 });
    }
    if (body.version < snapshot.version) {
      // Stale snapshot — ignore.
      return Response.json({ ok: false, reason: "stale", snapshotVersion: snapshot.version });
    }
    if (body.version > head) {
      return Response.json({ error: "future-version" }, { status: 400 });
    }
    const next: Snapshot = {
      version: body.version,
      doc: body.doc,
      body: body.body,
      title: body.title ?? snapshot.title,
      savedAt: Math.floor(Date.now() / 1000),
    };
    // Prune steps with version ≤ snapshot.version.
    const toDelete: string[] = [];
    for (let v = snapshot.version + 1; v <= body.version; v++) {
      toDelete.push(stepKey(v));
    }
    if (toDelete.length > 0) {
      // Storage.delete accepts up to 128 keys per call.
      for (let i = 0; i < toDelete.length; i += 128) {
        await this.ctx.storage.delete(toDelete.slice(i, i + 128));
      }
    }
    await this.ctx.storage.put("snapshot", next);
    this.snapshotCache = next;
    await this.persistSnapshotToD1(next);
    return Response.json({ ok: true, snapshotVersion: next.version });
  }

  private async persistSnapshotToD1(snapshot: Snapshot): Promise<void> {
    if (this.documentId == null) return;
    const now = Math.floor(Date.now() / 1000);
    await this.env.DB.prepare(
      `UPDATE document SET body = ?, doc_json = ?, collab_version = ?, title = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(snapshot.body, JSON.stringify(snapshot.doc), snapshot.version, snapshot.title, now, this.documentId)
      .run();
  }
}
