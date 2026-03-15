import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { marked } from "marked";
import { nanoid } from "nanoid";
import { transform } from "sucrase";
import type { Env } from "./index";
import { stripMarkdown, chunkText } from "./tts-utils.js";

export const paste = new Hono<{ Bindings: Env }>();

function isAuthed(c: Context<{ Bindings: Env }>): boolean {
  const auth = c.req.header("Authorization");
  if (auth === `Bearer ${c.env.THOUGHT_SECRET}`) return true;
  const token = getCookie(c, "paste_auth");
  if (token === c.env.THOUGHT_SECRET) return true;
  return false;
}

const PAGE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&display=swap');

  :root {
    --fg: #2c2c2c;
    --fg-dim: #8a8a8a;
    --bg: #faf9f7;
    --bg-surface: #f0eeeb;
    --border: #e0ddd8;
    --accent: #c45d3e;
    --accent-hover: #a84830;
    --mono: 'DM Mono', 'Menlo', monospace;
    --serif: 'Newsreader', 'Georgia', serif;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --fg: #d4d0ca;
      --fg-dim: #7a7770;
      --bg: #1c1b19;
      --bg-surface: #262522;
      --border: #3a3835;
      --accent: #e0815f;
      --accent-hover: #c45d3e;
    }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--mono);
    font-weight: 300;
    font-size: 14px;
    line-height: 1.7;
    max-width: 720px;
    margin: 0 auto;
    padding: 3rem 1.5rem;
    color: var(--fg);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }

  h1 {
    font-family: var(--serif);
    font-weight: 300;
    font-style: italic;
    font-size: 1.75rem;
    letter-spacing: -0.02em;
    margin-bottom: 0.25rem;
    line-height: 1.3;
  }

  h2 {
    font-family: var(--mono);
    font-weight: 400;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fg-dim);
    margin-bottom: 0.75rem;
  }

  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 3px; }

  .meta { color: var(--fg-dim); font-size: 0.8125rem; }

  .rule { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

  /* Forms */
  select {
    font-family: var(--mono);
    font-size: 0.8125rem;
    padding: 0.35rem 0.5rem;
    background: var(--bg-surface);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 3px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a8a8a' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    padding-right: 1.5rem;
  }

  textarea {
    width: 100%;
    min-height: 50vh;
    padding: 1rem;
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 300;
    line-height: 1.7;
    color: var(--fg);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
  }
  textarea:focus { border-color: var(--accent); }
  textarea::placeholder { color: var(--fg-dim); }

  input[type="password"], input[type="text"] {
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 300;
    padding: 0.5rem 0.75rem;
    width: 100%;
    max-width: 320px;
    color: var(--fg);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus { border-color: var(--accent); }

  .field { margin-bottom: 1.25rem; }
  label {
    display: block;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fg-dim);
    margin-bottom: 0.4rem;
  }

  button {
    font-family: var(--mono);
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--bg);
    background: var(--accent);
    border: none;
    padding: 0.5rem 1.75rem;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: var(--accent-hover); }

  /* Paste content */
  .content { line-height: 1.8; }
  .content h1, .content h2, .content h3 {
    font-family: var(--serif);
    font-weight: 400;
    margin: 1.75em 0 0.5em;
  }
  .content h1 { font-size: 1.5rem; }
  .content h2 { font-size: 1.2rem; text-transform: none; letter-spacing: normal; color: var(--fg); }
  .content h3 { font-size: 1rem; }
  .content p { margin: 0.75em 0; }
  .content pre {
    padding: 1rem;
    overflow-x: auto;
    border-radius: 3px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    font-size: 0.875rem;
  }
  .content code { font-size: 0.9em; font-family: var(--mono); }
  .content img { max-width: 100%; border-radius: 3px; }
  .content blockquote {
    border-left: 2px solid var(--accent);
    padding-left: 1.25rem;
    margin: 1.25em 0;
    color: var(--fg-dim);
    font-style: italic;
  }
  .content ul, .content ol { padding-left: 1.25rem; margin: 0.75em 0; }

  .actions { margin-top: 2rem; font-size: 0.8125rem; }
  .actions a { margin-right: 1.25rem; }

  /* Lists */
  .paste-list { list-style: none; padding: 0; }
  .paste-list li {
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }
  .paste-list li:last-child { border-bottom: none; }
  .paste-list .paste-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .paste-list .paste-meta { flex-shrink: 0; font-size: 0.75rem; color: var(--fg-dim); }

  /* Header bar */
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2.5rem;
  }
  .topbar-title {
    font-family: var(--serif);
    font-weight: 300;
    font-style: italic;
    font-size: 0.9375rem;
    color: var(--fg-dim);
  }
  .topbar-title a { color: var(--fg-dim); }
  .topbar-title a:hover { color: var(--accent); }
  .topbar-nav { font-size: 0.75rem; color: var(--fg-dim); }
  .topbar-nav a { color: var(--fg-dim); margin-left: 1rem; }
  .topbar-nav a:hover { color: var(--accent); }
`;

function htmlPage(title: string, body: string, nav?: string): string {
  const navHtml = nav ?? `<span class="topbar-nav"><a href="/paste/logout">log out</a></span>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — paste</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <header class="topbar">
    <span class="topbar-title"><a href="/paste">paste</a></span>
    ${navHtml}
  </header>
  ${body}
</body>
</html>`;
}

function extractTitle(body: string, language: string): string | undefined {
  if (language === "html") {
    const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (match) return match[1].trim();
  }
  if (language === "markdown") {
    // First ATX heading (# Title)
    const match = body.match(/^#{1,6}\s+(.+)/m);
    if (match) return match[1].trim();
  }
  // For all languages (including markdown with no heading): first non-empty line
  const firstLine = body.split("\n").find((l) => l.trim().length > 0);
  if (firstLine) {
    const trimmed = firstLine.trim();
    // Cap at 120 chars to keep titles reasonable
    return trimmed.length > 120 ? trimmed.slice(0, 120) + "…" : trimmed;
  }
  return undefined;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


function compileJsx(source: string, lang: "jsx" | "tsx"): string {
  const transforms: ("jsx" | "typescript")[] =
    lang === "tsx" ? ["jsx", "typescript"] : ["jsx"];
  const { code } = transform(source, {
    transforms,
    jsxRuntime: "automatic",
    jsxImportSource: "https://esm.sh/react",
    production: true,
  });
  return rewriteImports(code);
}

function rewriteImports(code: string): string {
  return code.replace(
    /((?:import|export)\s[^'"]*?from\s+['"])([^'".\/][^'"]*?)(['"])/g,
    (match, pre, spec, post) => {
      if (spec.startsWith("http://") || spec.startsWith("https://"))
        return match;
      return `${pre}https://esm.sh/${spec}${post}`;
    },
  );
}

// GET /login — login form (public)
paste.get("/login", async (c) => {
  const body = htmlPage(
    "Login",
    `<h1>Sign in</h1>
    <p class="meta" style="margin-bottom:2rem">Enter your token to continue.</p>
    <form method="POST" action="/paste/login">
      <div class="field">
        <label for="token">Token</label>
        <input type="password" id="token" name="token" required autofocus>
      </div>
      <button type="submit">Continue</button>
    </form>`,
    ""
  );
  return c.html(body);
});

// POST /login — validate token, set cookie, redirect
paste.post("/login", async (c) => {
  const form = await c.req.parseBody();
  const token = form.token as string;
  if (token !== c.env.THOUGHT_SECRET) {
    return c.html(htmlPage("Login Failed", `<h1>Invalid token</h1><p style="margin-top:1rem"><a href="/paste/login">Try again</a></p>`, ""), 401);
  }
  setCookie(c, "paste_auth", token, {
    path: "/paste",
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
  return c.redirect("/paste");
});

// GET /logout — clear cookie, redirect to login
paste.get("/logout", async (c) => {
  deleteCookie(c, "paste_auth", { path: "/paste" });
  return c.redirect("/paste/login");
});

// GET /all — list all pastes (auth required)
paste.get("/all", async (c) => {
  if (!isAuthed(c)) {
    return c.redirect("/paste/login");
  }

  const rows = await c.env.DB.prepare(
    "SELECT id, title, language, created_at FROM paste ORDER BY created_at DESC"
  ).all<{ id: string; title: string | null; language: string; created_at: number }>();

  const items = rows.results
    .map((r) => {
      const date = new Date(r.created_at).toISOString().split("T")[0];
      const title = escapeHtml(r.title || "Untitled");
      return `<li><span class="paste-title"><a href="/paste/${escapeHtml(r.id)}">${title}</a></span><span class="paste-meta">${date}</span></li>`;
    })
    .join("\n      ");

  const body = htmlPage(
    "All Pastes",
    `<h1>All pastes</h1>
    <p class="meta" style="margin-bottom:2rem">${rows.results.length} paste${rows.results.length === 1 ? "" : "s"}</p>
    <ul class="paste-list">
      ${items}
    </ul>`
  );
  return c.html(body);
});

// GET / — creation form (auth required)
paste.get("/", async (c) => {
  if (!isAuthed(c)) {
    return c.redirect("/paste/login");
  }

  // Fetch 5 most recent pastes
  const recents = await c.env.DB.prepare(
    "SELECT id, title, created_at FROM paste ORDER BY created_at DESC LIMIT 5"
  ).all<{ id: string; title: string | null; created_at: number }>();

  let recentHtml = "";
  if (recents.results.length > 0) {
    const items = recents.results
      .map((r) => `<li><span class="paste-title"><a href="/paste/${escapeHtml(r.id)}">${escapeHtml(r.title || "Untitled")}</a></span><span class="paste-meta">${new Date(r.created_at).toISOString().split("T")[0]}</span></li>`)
      .join("\n        ");
    recentHtml = `
    <hr class="rule">
    <h2>Recent <a href="/paste/all" style="text-transform:none;letter-spacing:normal;font-weight:300">/ all</a></h2>
    <ul class="paste-list">
        ${items}
    </ul>`;
  }

  const body = htmlPage(
    "New Paste",
    `<form method="POST" action="/paste">
      <div class="field" style="display:flex;align-items:baseline;gap:0.75rem;margin-bottom:1.5rem">
        <label for="language" style="margin:0">Lang</label>
        <select id="language" name="language">
          <option value="markdown" selected>Markdown</option>
          <option value="plaintext">Plain text</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="jsx">JSX</option>
          <option value="tsx">TSX</option>
          <option value="python">Python</option>
          <option value="rust">Rust</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="json">JSON</option>
          <option value="sql">SQL</option>
        </select>
      </div>
      <div class="field">
        <textarea id="body" name="body" required placeholder="Write something..." autofocus></textarea>
      </div>
      <button type="submit">Save</button>
    </form>
    ${recentHtml}`
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
    // Form submission — auth via cookie
    isForm = true;
    if (!isAuthed(c)) {
      return c.redirect("/paste/login");
    }
    const form = await c.req.parseBody();
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

  if (!title) {
    title = extractTitle(body, language);
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

// GET /:id/module — compiled JSX/TSX as ES module (public)
paste.get("/:id/module", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT body, language FROM paste WHERE id = ?")
    .bind(id)
    .first<{ body: string; language: string }>();

  if (!row || (row.language !== "jsx" && row.language !== "tsx")) {
    return c.text("Not found", 404);
  }

  try {
    const compiled = compileJsx(row.body, row.language as "jsx" | "tsx");
    return c.body(compiled, 200, { "Content-Type": "application/javascript; charset=utf-8" });
  } catch (err: any) {
    const msg = (err.message || "Compilation error").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
    const errorModule = `document.getElementById("root").innerText = \`Compile error: ${msg}\`;`;
    return c.body(errorModule, 200, { "Content-Type": "application/javascript; charset=utf-8" });
  }
});

// GET /:id/audio — TTS audio for markdown pastes (public)
// Returns cached MP3 if available, otherwise kicks off a workflow and returns JSON.
paste.get("/:id/audio", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT body, language FROM paste WHERE id = ?")
    .bind(id)
    .first<{ body: string; language: string }>();

  if (!row) {
    return c.text("Not found", 404);
  }
  if (row.language !== "markdown") {
    return c.text("Audio is only available for markdown pastes", 400);
  }

  const r2Key = `paste/${id}.mp3`;

  // Check R2 cache — fast path
  const existing = await c.env.AUDIO_BUCKET.get(r2Key);
  if (existing) {
    return new Response(existing.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const text = stripMarkdown(row.body);
  if (!text) {
    return c.text("No speakable text found", 400);
  }

  const totalChunks = chunkText(text, 1900).length;

  // Kick off durable workflow
  const instance = await c.env.TTS_WORKFLOW.create({
    params: { pasteId: id, text },
  });

  return c.json({
    status: "generating",
    instanceId: instance.id,
    totalChunks,
  });
});

// GET /:id/audio/status — poll workflow status
paste.get("/:id/audio/status", async (c) => {
  const instanceId = c.req.query("instanceId");
  if (!instanceId) {
    return c.json({ error: "instanceId query param required" }, 400);
  }

  try {
    const instance = await c.env.TTS_WORKFLOW.get(instanceId);
    const status = await instance.status();
    return c.json({
      status: status.status,
      ...(status.error ? { error: String(status.error) } : {}),
    });
  } catch {
    return c.json({ error: "Instance not found" }, 404);
  }
});

// GET /:id/audio/chunk/:index — fetch individual TTS chunk from R2
paste.get("/:id/audio/chunk/:index", async (c) => {
  const id = c.req.param("id");
  const index = c.req.param("index");

  const obj = await c.env.AUDIO_BUCKET.get(`paste/${id}/chunk-${index}.mp3`);
  if (!obj) {
    return c.text("Not found", 404);
  }

  const totalChunks = obj.customMetadata?.totalChunks;
  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
  };
  if (totalChunks) {
    headers["X-Total-Chunks"] = totalChunks;
  }

  return new Response(obj.body, { headers });
});

// DELETE /:id/audio — purge cached audio from R2 (auth required)
paste.delete("/:id/audio", async (c) => {
  if (!isAuthed(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const id = c.req.param("id");
  const r2Key = `paste/${id}.mp3`;
  await c.env.AUDIO_BUCKET.delete(r2Key);
  return c.json({ ok: true, deleted: r2Key });
});

// GET /:id — view paste (public)
paste.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM paste WHERE id = ?")
    .bind(id)
    .first<{ id: string; body: string; language: string; title: string | null; created_at: number }>();

  if (!row) {
    return c.html(htmlPage("Not Found", `<h1>Not found</h1><p class="meta" style="margin-top:1rem">This paste doesn't exist.</p>`), 404);
  }

  const date = new Date(row.created_at).toISOString().split("T")[0];
  const title = row.title || "Untitled";

  if (row.language === "jsx" || row.language === "tsx") {
    const runnerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — paste</title>
  <style>
    ${PAGE_STYLE}
    body { max-width: none; padding: 0; }
    #root { min-height: 100vh; padding: 2rem; }
    .paste-toolbar {
      position: fixed; bottom: 1rem; right: 1rem;
      font-family: var(--mono); font-size: 0.75rem;
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: 3px; padding: 0.35rem 0.75rem;
      color: var(--fg-dim); z-index: 9999;
      display: flex; gap: 0.75rem; align-items: center;
    }
    .paste-toolbar a { color: var(--accent); }
    .paste-error { color: var(--accent); padding: 2rem; font-family: var(--mono); font-size: 0.875rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div class="paste-toolbar">
    <span>${escapeHtml(row.language)}</span>
    <a href="/paste/${escapeHtml(row.id)}/raw">source</a>
  </div>
  <script type="module">
    try {
      const mod = await import("/paste/${row.id}/module");
      if (mod.default && typeof mod.default === "function") {
        const { createRoot } = await import("https://esm.sh/react-dom/client");
        const { createElement } = await import("https://esm.sh/react");
        createRoot(document.getElementById("root")).render(createElement(mod.default));
      }
    } catch (err) {
      document.getElementById("root").innerHTML =
        '<div class="paste-error">' + (err.message || String(err)).replace(/</g, "&lt;") + '</div>';
    }
  </script>
</body>
</html>`;
    return c.html(runnerHtml);
  }

  if (row.language === "html") {
    const toolbar = `<div class="paste-toolbar" style="
      position: fixed; bottom: 1rem; right: 1rem;
      font-family: monospace; font-size: 0.75rem;
      background: #1a1a2e; border: 1px solid #333;
      border-radius: 3px; padding: 0.35rem 0.75rem;
      color: #888; z-index: 9999;
      display: flex; gap: 0.75rem; align-items: center;
    "><span>html</span><a href="/paste/${escapeHtml(row.id)}/raw" style="color:#6c9ef8">source</a></div>`;

    const isFullDocument = /<!DOCTYPE|<html/i.test(row.body);
    if (isFullDocument) {
      // Inject toolbar before </body>
      const html = row.body.replace(/<\/body>/i, `${toolbar}</body>`);
      return c.html(html);
    }

    // Wrap fragment in minimal shell
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — paste</title>
</head>
<body>
  ${row.body}
  ${toolbar}
</body>
</html>`;
    return c.html(html);
  }

  let rendered: string;
  if (row.language === "markdown") {
    rendered = `<div class="content">${await marked.parse(row.body)}</div>`;
  } else {
    rendered = `<div class="content"><pre><code class="language-${escapeHtml(row.language)}">${escapeHtml(row.body)}</code></pre></div>`;
  }

  const html = htmlPage(
    title,
    `<h1>${escapeHtml(title)}</h1>
    <p class="meta">${date} · ${escapeHtml(row.language)}</p>
    <hr class="rule">
    ${rendered}
    <div class="actions">
      <a href="/paste/${escapeHtml(row.id)}/raw">raw</a>${row.language === "markdown" ? `
      <span id="audio-container" style="display:inline-block;vertical-align:middle">
        <audio id="audio-player" controls preload="none" style="height:2rem"></audio>
        <span id="audio-status" class="meta" style="margin-left:0.5rem"></span>
      </span>
      <script>
      (function() {
        const pasteId = ${JSON.stringify(row.id)};
        const audio = document.getElementById('audio-player');
        const statusEl = document.getElementById('audio-status');
        let started = false;

        audio.addEventListener('play', async function onPlay() {
          if (started) return;
          started = true;
          audio.removeEventListener('play', onPlay);

          statusEl.textContent = 'loading...';

          try {
            const res = await fetch('/paste/' + pasteId + '/audio');
            const ct = res.headers.get('content-type') || '';

            if (ct.includes('audio/mpeg')) {
              // Cached full MP3
              const blob = await res.blob();
              audio.src = URL.createObjectURL(blob);
              audio.play();
              statusEl.textContent = '';
              return;
            }

            // Workflow started — poll chunks
            const data = await res.json();
            if (data.status !== 'generating') {
              statusEl.textContent = data.error || 'error';
              return;
            }

            const { instanceId, totalChunks } = data;
            const chunkUrls = [];

            // Collect chunk blobs as they become available
            for (let i = 0; i < totalChunks; i++) {
              statusEl.textContent = 'generating ' + (i + 1) + '/' + totalChunks + '...';
              let chunkBlob = null;
              while (!chunkBlob) {
                const cr = await fetch('/paste/' + pasteId + '/audio/chunk/' + i);
                if (cr.ok) {
                  chunkBlob = await cr.blob();
                } else {
                  // Check if workflow errored
                  const sr = await fetch('/paste/' + pasteId + '/audio/status?instanceId=' + instanceId);
                  const st = await sr.json();
                  if (st.status === 'errored') {
                    statusEl.textContent = 'generation failed';
                    return;
                  }
                  await new Promise(r => setTimeout(r, 2000));
                }
              }
              chunkUrls.push(URL.createObjectURL(chunkBlob));

              // Start playback from first chunk immediately
              if (i === 0) {
                audio.src = chunkUrls[0];
                audio.play();
              }
            }

            statusEl.textContent = '';

            // Chain playback: when current chunk ends, play next
            let currentChunk = 0;
            audio.addEventListener('ended', function advance() {
              currentChunk++;
              if (currentChunk < chunkUrls.length) {
                audio.src = chunkUrls[currentChunk];
                audio.play();
              } else {
                // All chunks played — try to load the full cached version for seeking
                audio.removeEventListener('ended', advance);
                fetch('/paste/' + pasteId + '/audio').then(r => {
                  if (r.ok && (r.headers.get('content-type') || '').includes('audio/mpeg')) {
                    return r.blob();
                  }
                  return null;
                }).then(blob => {
                  if (blob) {
                    audio.src = URL.createObjectURL(blob);
                  }
                });
              }
            });

          } catch (e) {
            statusEl.textContent = 'error';
            console.error('TTS error:', e);
          }
        });
      })();
      </script>` : ""}
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
