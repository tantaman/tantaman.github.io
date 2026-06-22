import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { Env } from "./index";
import { CreateDhaReportBody } from "./schemas";

export const dha = new Hono<{ Bindings: Env }>();

function bearer(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const auth = c.req.header("Authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

// Auth middleware for all DHA routes: either the viewer or the admin secret
// grants read access.
dha.use("*", async (c, next) => {
  const token = bearer(c);
  if (!token || (token !== c.env.DHA_SECRET && token !== c.env.DHA_ADMIN_SECRET)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

// Write guard: mutations (upload/delete) require the admin secret specifically.
// Fails closed — if DHA_ADMIN_SECRET is unset, no token matches and writes are denied.
const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (bearer(c) !== c.env.DHA_ADMIN_SECRET) {
    return c.json({ error: "Admin password required to modify reports" }, 403);
  }
  return next();
};

// List reports
dha.get("/reports", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT report_date, created_at FROM dha_report ORDER BY report_date DESC"
  ).all();
  return c.json({ reports: results.results });
});

// Get single report
dha.get("/reports/:date", async (c) => {
  const date = c.req.param("date");
  const row = await c.env.DB.prepare(
    "SELECT report_date, data, created_at FROM dha_report WHERE report_date = ?"
  ).bind(date).first();

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    report_date: row.report_date,
    data: JSON.parse(row.data as string),
    created_at: row.created_at,
  });
});

// Upsert report
dha.post("/reports", requireAdmin, async (c) => {
  const body = CreateDhaReportBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    `INSERT INTO dha_report (report_date, data, created_at) VALUES (?, ?, ?)
     ON CONFLICT(report_date) DO UPDATE SET data = excluded.data, created_at = excluded.created_at`
  ).bind(body.report_date, JSON.stringify(body.data), now).run();

  return c.json({ report_date: body.report_date, created_at: now }, 201);
});

// Delete report
dha.delete("/reports/:date", requireAdmin, async (c) => {
  const date = c.req.param("date");
  const result = await c.env.DB.prepare(
    "DELETE FROM dha_report WHERE report_date = ?"
  ).bind(date).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});
