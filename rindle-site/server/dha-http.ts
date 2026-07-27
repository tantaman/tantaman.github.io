// Password-gated REST compatibility for the standalone Drumaldry HOA report app.
// The static app remains independently built, while these same-origin endpoints preserve its
// existing `/api/dha/*` contract and read the report rows from the legacy D1 database binding.

import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

const MAX_REQUEST_BYTES = 1_000_000;
const REPORT_DATE = /^\d{4}-\d{2}-\d{2}$/;

const CreateDhaReportBody = z.object({
  report_date: z.string().regex(REPORT_DATE, "Must be YYYY-MM-DD"),
  data: z.record(z.string(), z.unknown()),
});

interface DhaBindings {
  database: D1Database;
  viewerSecret: string;
  adminSecret: string;
}

interface DhaReportListRow {
  report_date: string;
  created_at: number;
}

interface DhaReportRow extends DhaReportListRow {
  data: string;
}

class RequestFailure extends Error {
  readonly status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("Authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
}

async function secretMatches(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return timingSafeEqual(new Uint8Array(providedHash), new Uint8Array(expectedHash));
}

async function loadBindings(): Promise<DhaBindings | null> {
  try {
    // The ordinary Rindle dev server runs under Node, where this module is unavailable. Keeping the
    // import lazy lets the rest of the app develop normally; Cloudflare preview/production supplies it.
    const specifier = "cloudflare:workers";
    const workers: typeof import("cloudflare:workers") = await import(
      /* @vite-ignore */ specifier
    );
    const { DHA_ADMIN_SECRET, DHA_DB, DHA_SECRET } = workers.env;
    if (!DHA_ADMIN_SECRET || !DHA_DB || !DHA_SECRET) return null;
    return {
      database: DHA_DB,
      viewerSecret: DHA_SECRET,
      adminSecret: DHA_ADMIN_SECRET,
    };
  } catch {
    return null;
  }
}

async function authorize(
  request: Request,
  bindings: DhaBindings,
  adminOnly: boolean,
): Promise<boolean> {
  const token = bearerToken(request);
  if (adminOnly) return secretMatches(token, bindings.adminSecret);
  const [viewer, admin] = await Promise.all([
    secretMatches(token, bindings.viewerSecret),
    secretMatches(token, bindings.adminSecret),
  ]);
  return viewer || admin;
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    throw new RequestFailure(415, "Content-Type must be application/json");
  }

  if (!request.body) throw new RequestFailure(400, "Request body is required");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RequestFailure(413, "Report payload is too large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new RequestFailure(400, "Invalid JSON");
  }
}

async function withDhaRequest(
  request: Request,
  adminOnly: boolean,
  action: (bindings: DhaBindings) => Promise<Response>,
): Promise<Response> {
  const bindings = await loadBindings();
  if (!bindings) return jsonResponse({ error: "Report storage unavailable" }, 503);

  if (!(await authorize(request, bindings, adminOnly))) {
    return jsonResponse(
      { error: adminOnly ? "Admin password required to modify reports" : "Unauthorized" },
      adminOnly ? 403 : 401,
    );
  }

  try {
    return await action(bindings);
  } catch (error) {
    if (error instanceof RequestFailure) {
      return jsonResponse({ error: error.message }, error.status);
    }
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: error.issues[0]?.message ?? "Invalid report" }, 400);
    }
    console.error(JSON.stringify({
      message: "DHA report request failed",
      path: new URL(request.url).pathname,
      error: error instanceof Error ? error.message : String(error),
    }));
    return jsonResponse({ error: "Report request failed" }, 500);
  }
}

export function listDhaReports(request: Request): Promise<Response> {
  return withDhaRequest(request, false, async ({ database }) => {
    const result = await database.prepare(
      "SELECT report_date, created_at FROM dha_report ORDER BY report_date DESC",
    ).all<DhaReportListRow>();
    return jsonResponse({ reports: result.results });
  });
}

export function getDhaReport(request: Request, date: string): Promise<Response> {
  return withDhaRequest(request, false, async ({ database }) => {
    if (!REPORT_DATE.test(date)) return jsonResponse({ error: "Invalid report date" }, 400);
    const row = await database.prepare(
      "SELECT report_date, data, created_at FROM dha_report WHERE report_date = ?",
    ).bind(date).first<DhaReportRow>();
    if (!row) return jsonResponse({ error: "Not found" }, 404);
    return jsonResponse({
      report_date: row.report_date,
      data: JSON.parse(row.data),
      created_at: row.created_at,
    });
  });
}

export function createDhaReport(request: Request): Promise<Response> {
  return withDhaRequest(request, true, async ({ database }) => {
    const body = CreateDhaReportBody.parse(await readBoundedJson(request));
    const createdAt = Math.floor(Date.now() / 1_000);
    await database.prepare(
      `INSERT INTO dha_report (report_date, data, created_at) VALUES (?, ?, ?)
       ON CONFLICT(report_date) DO UPDATE SET data = excluded.data, created_at = excluded.created_at`,
    ).bind(body.report_date, JSON.stringify(body.data), createdAt).run();
    return jsonResponse({ report_date: body.report_date, created_at: createdAt }, 201);
  });
}

export function deleteDhaReport(request: Request, date: string): Promise<Response> {
  return withDhaRequest(request, true, async ({ database }) => {
    if (!REPORT_DATE.test(date)) return jsonResponse({ error: "Invalid report date" }, 400);
    const result = await database.prepare(
      "DELETE FROM dha_report WHERE report_date = ?",
    ).bind(date).run();
    if (result.meta.changes === 0) return jsonResponse({ error: "Not found" }, 404);
    return new Response(null, { status: 204 });
  });
}
