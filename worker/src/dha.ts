import { Hono } from "hono";
import type { Env } from "./index";
import { CreateDhaReportBody } from "./schemas";

export const dha = new Hono<{ Bindings: Env }>();

// Auth middleware for all DHA routes
dha.use("*", async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth || auth !== `Bearer ${c.env.DHA_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

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
dha.post("/reports", async (c) => {
  const body = CreateDhaReportBody.parse(await c.req.json());
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    `INSERT INTO dha_report (report_date, data, created_at) VALUES (?, ?, ?)
     ON CONFLICT(report_date) DO UPDATE SET data = excluded.data, created_at = excluded.created_at`
  ).bind(body.report_date, JSON.stringify(body.data), now).run();

  return c.json({ report_date: body.report_date, created_at: now }, 201);
});

// Delete report
dha.delete("/reports/:date", async (c) => {
  const date = c.req.param("date");
  const result = await c.env.DB.prepare(
    "DELETE FROM dha_report WHERE report_date = ?"
  ).bind(date).run();

  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});
