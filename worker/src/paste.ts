import { Hono } from "hono";
import { marked } from "marked";
import { nanoid } from "nanoid";
import type { Env } from "./index";

export const paste = new Hono<{ Bindings: Env }>();

function isAuthed(c: {
  req: {
    header: (name: string) => string | undefined;
    query: (name: string) => string | undefined;
  };
  env: { THOUGHT_SECRET: string };
}): boolean {
  const auth = c.req.header("Authorization");
  if (auth === `Bearer ${c.env.THOUGHT_SECRET}`) return true;
  const token = c.req.query("token");
  if (token === c.env.THOUGHT_SECRET) return true;
  return false;
}

const PAGE_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
    color: #1a1a1a;
    background: #fff;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e0e0e0; background: #1a1a1a; }
    a { color: #6db3f2; }
    input, textarea, select { background: #2a2a2a; color: #e0e0e0; border-color: #444; }
    pre { background: #2a2a2a !important; }
    .meta { color: #999; }
  }
  a { color: #0066cc; text-decoration: none; }
  a:hover { text-decoration: underline; }
  h1 { margin-bottom: 0.5rem; font-size: 1.5rem; }
  .meta { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
  .content { line-height: 1.7; }
  .content h1, .content h2, .content h3 { margin: 1.5em 0 0.5em; }
  .content p { margin: 0.75em 0; }
  .content pre { padding: 1rem; overflow-x: auto; border-radius: 4px; background: #f5f5f5; }
  .content code { font-size: 0.9em; }
  .content img { max-width: 100%; }
  .content blockquote { border-left: 3px solid #ccc; padding-left: 1rem; margin: 1em 0; }
  .actions { margin-top: 1.5rem; font-size: 0.875rem; }
  .actions a { margin-right: 1rem; }
  label { display: block; margin-bottom: 0.25rem; font-weight: 600; font-size: 0.875rem; }
  input, textarea, select {
    width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;
    font-family: inherit; font-size: 1rem;
  }
  textarea { min-height: 400px; font-family: monospace; resize: vertical; }
  .field { margin-bottom: 1rem; }
  button {
    background: #0066cc; color: #fff; border: none; padding: 0.5rem 1.5rem;
    border-radius: 4px; font-size: 1rem; cursor: pointer;
  }
  button:hover { background: #0052a3; }
`;

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Tantamanlands Paste</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// GET / — creation form (auth required)
paste.get("/", async (c) => {
  if (!isAuthed(c)) {
    return c.html(htmlPage("Unauthorized", "<h1>401 Unauthorized</h1><p>Token required.</p>"), 401);
  }

  const body = htmlPage(
    "New Paste",
    `<h1>New Paste</h1>
    <form method="POST" action="/paste">
      <input type="hidden" name="token" value="${escapeHtml(c.req.query("token") || "")}">
      <div class="field">
        <label for="title">Title (optional)</label>
        <input type="text" id="title" name="title" placeholder="Untitled">
      </div>
      <div class="field">
        <label for="language">Language</label>
        <select id="language" name="language">
          <option value="markdown" selected>Markdown</option>
          <option value="plaintext">Plain text</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="rust">Rust</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="json">JSON</option>
          <option value="sql">SQL</option>
        </select>
      </div>
      <div class="field">
        <label for="body">Content</label>
        <textarea id="body" name="body" required placeholder="Paste content here..."></textarea>
      </div>
      <button type="submit">Create Paste</button>
    </form>`
  );
  return c.html(body);
});

// POST / — create paste (JSON API or form submission)
paste.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") || "";
  let body: string;
  let title: string | undefined;
  let language: string;
  let isForm = false;

  if (contentType.includes("application/json")) {
    // JSON API — auth via Bearer token
    if (!isAuthed(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const json = await c.req.json();
    body = json.body;
    title = json.title;
    language = json.language || "markdown";
  } else {
    // Form submission
    isForm = true;
    const form = await c.req.parseBody();
    // Auth via hidden token field
    const token = (form.token as string) || "";
    if (token !== c.env.THOUGHT_SECRET) {
      return c.html(htmlPage("Unauthorized", "<h1>401 Unauthorized</h1>"), 401);
    }
    body = form.body as string;
    title = (form.title as string) || undefined;
    language = (form.language as string) || "markdown";
  }

  if (!body) {
    const msg = "Body is required";
    return isForm
      ? c.html(htmlPage("Error", `<h1>Error</h1><p>${msg}</p>`), 400)
      : c.json({ error: msg }, 400);
  }

  const id = nanoid(10);
  const now = Date.now();

  await c.env.DB.prepare(
    "INSERT INTO paste (id, body, language, title, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, body, language, title || null, now)
    .run();

  if (isForm) {
    return c.redirect(`/paste/${id}`);
  }

  return c.json({ id, url: `/paste/${id}` }, 201);
});

// GET /:id — view paste (public)
paste.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM paste WHERE id = ?")
    .bind(id)
    .first<{ id: string; body: string; language: string; title: string | null; created_at: number }>();

  if (!row) {
    return c.html(htmlPage("Not Found", "<h1>404 — Paste not found</h1>"), 404);
  }

  const date = new Date(row.created_at).toISOString().split("T")[0];
  const title = row.title || "Untitled";

  let rendered: string;
  if (row.language === "markdown") {
    rendered = `<div class="content">${await marked.parse(row.body)}</div>`;
  } else {
    rendered = `<div class="content"><pre><code class="language-${escapeHtml(row.language)}">${escapeHtml(row.body)}</code></pre></div>`;
  }

  const html = htmlPage(
    title,
    `<h1>${escapeHtml(title)}</h1>
    <div class="meta">${date} · ${escapeHtml(row.language)}</div>
    ${rendered}
    <div class="actions">
      <a href="/paste/${escapeHtml(row.id)}/raw">Raw</a>
    </div>`
  );

  return c.html(html);
});

// GET /:id/raw — raw content (public)
paste.get("/:id/raw", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT body FROM paste WHERE id = ?")
    .bind(id)
    .first<{ body: string }>();

  if (!row) {
    return c.text("Not found", 404);
  }

  return c.text(row.body);
});
