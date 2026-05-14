import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { marked } from "marked";
import { nanoid } from "nanoid";
import { transform } from "sucrase";
import type { Env } from "./index";
import { stripMarkdown, chunkText } from "./tts-utils.js";
import { upsertPasteEmbedding, deletePasteEmbeddings } from "./embeddings.js";
import { assignClusters, removeClusterMembership } from "./clusters.js";
import { renderPasteCard } from "./paste-card.js";

const SITE_URL = "https://tantaman.com";

type PasteMeta = {
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
};

async function listSplashIds(bucket: R2Bucket): Promise<Set<string>> {
  const ids = new Set<string>();
  let cursor: string | undefined = undefined;
  for (let i = 0; i < 20; i++) {
    const result: R2Objects = await bucket.list({
      prefix: "paste-cards/",
      limit: 1000,
      cursor,
    });
    for (const obj of result.objects) {
      const m = obj.key.match(/^paste-cards\/(.+)\.png$/);
      if (m) ids.add(m[1]);
    }
    if (!result.truncated) break;
    cursor = result.cursor;
  }
  return ids;
}

function thumbHtml(id: string): string {
  return `<img src="/paste/${escapeHtml(id)}/splash.png" alt="" loading="lazy" width="72" height="38" style="flex-shrink:0;width:72px;height:38px;object-fit:cover;border-radius:3px;border:1px solid var(--border);background:var(--bg-soft)">`;
}

function metaTagsHtml(meta: PasteMeta): string {
  return `<meta property="og:title" content="${escapeHtml(meta.ogTitle)}">
  <meta property="og:description" content="${escapeHtml(meta.ogDescription)}">
  <meta property="og:image" content="${escapeHtml(meta.ogImage)}">
  <meta property="og:url" content="${escapeHtml(meta.ogUrl)}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(meta.ogDescription)}">
  <meta name="twitter:image" content="${escapeHtml(meta.ogImage)}">
  <meta name="description" content="${escapeHtml(meta.ogDescription)}">`;
}

export const paste = new Hono<{ Bindings: Env }>();

function isAuthed(c: Context<{ Bindings: Env }>): boolean {
  const auth = c.req.header("Authorization");
  if (auth === `Bearer ${c.env.THOUGHT_SECRET}`) return true;
  const token = getCookie(c, "paste_auth");
  if (token === c.env.THOUGHT_SECRET) return true;
  return false;
}

const PAGE_STYLE = `
  :root {
    --bg: #ffffff;
    --bg-soft: #f8f8f8;
    --text: #1a1a1a;
    --text-muted: #6b6b6b;
    --accent: #1a1a1a;
    --border: #e5e5e5;
    --border-heavy: #d0d0d0;
    --code-bg: #f6f6f6;
    --subtext: #888;
  }

  [data-theme='dark'] {
    --bg: #1a1a1a;
    --bg-soft: #242424;
    --text: #e0e0e0;
    --text-muted: #999;
    --accent: #e0e0e0;
    --border: #333;
    --border-heavy: #444;
    --code-bg: #242424;
    --subtext: #888;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    max-width: 720px;
    margin: 0 auto;
    padding: 3rem 1.5rem;
    color: var(--text);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }

  h1 {
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 700;
    font-size: 1.75rem;
    letter-spacing: -0.02em;
    margin-bottom: 0.25rem;
    line-height: 1.3;
  }

  h2 {
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 600;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: lowercase;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  a { color: var(--text); text-decoration: none; }
  a:hover { color: var(--text-muted); }

  .meta { color: var(--text-muted); font-size: 0.8125rem; }

  .rule { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }

  /* Forms */
  select {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.8125rem;
    padding: 0.35rem 0.5rem;
    background: var(--bg-soft);
    color: var(--text);
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
    font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, monospace;
    font-size: 14px;
    line-height: 1.7;
    color: var(--text);
    background: var(--bg-soft);
    border: 1px solid var(--border);
    border-radius: 3px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
  }
  textarea:focus { border-color: var(--border-heavy); }
  textarea::placeholder { color: var(--text-muted); }

  input[type="password"], input[type="text"] {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    padding: 0.5rem 0.75rem;
    width: 100%;
    max-width: 320px;
    color: var(--text);
    background: var(--bg-soft);
    border: 1px solid var(--border);
    border-radius: 3px;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus { border-color: var(--border-heavy); }

  .field { margin-bottom: 1.25rem; }
  label {
    display: block;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-transform: lowercase;
    color: var(--text-muted);
    margin-bottom: 0.4rem;
  }

  button {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    color: var(--bg);
    background: var(--text);
    border: none;
    padding: 0.5rem 1.75rem;
    border-radius: 3px;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  button:hover { opacity: 0.8; }

  /* Paste content */
  .content { line-height: 1.8; }
  .content h1, .content h2, .content h3 {
    font-family: system-ui, -apple-system, sans-serif;
    margin: 1.75em 0 0.5em;
  }
  .content h1 { font-size: 1.5rem; font-weight: 700; }
  .content h2 { font-size: 1.2rem; font-weight: 600; text-transform: none; letter-spacing: normal; color: var(--text); }
  .content h3 { font-size: 1rem; font-weight: 600; }
  .content p { margin: 0.75em 0; }
  .content pre {
    padding: 1rem;
    overflow-x: auto;
    border-radius: 3px;
    background: var(--code-bg);
    border: 1px solid var(--border);
    font-size: 0.875rem;
  }
  .content code { font-size: 0.9em; font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, monospace; }
  .content img { max-width: 100%; border-radius: 3px; }
  .content blockquote {
    border-left: 2px solid var(--border-heavy);
    padding-left: 1.25rem;
    margin: 1.25em 0;
    color: var(--text-muted);
    font-style: italic;
  }
  .content ul, .content ol { padding-left: 1.25rem; margin: 0.75em 0; }
  .content a { text-decoration: underline; }

  .actions { margin-top: 2rem; font-size: 0.8125rem; }
  .actions a { margin-right: 1.25rem; color: var(--text-muted); }
  .actions a:hover { color: var(--text); }

  /* Lists */
  .paste-list { list-style: none; padding: 0; }
  .paste-list li {
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }
  .paste-list li:last-child { border-bottom: none; }
  .paste-list .paste-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .paste-list .paste-meta { flex-shrink: 0; font-size: 0.75rem; color: var(--text-muted); }

  /* Header bar */
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }
  .topbar-title {
    font-size: 0.9375rem;
    letter-spacing: 0.05em;
    text-transform: lowercase;
    color: var(--text-muted);
  }
  .topbar-title a { color: var(--text-muted); }
  .topbar-title a:hover { color: var(--text); }
  .topbar-nav { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 1rem; }
  .topbar-nav a { color: var(--text-muted); }
  .topbar-nav a:hover { color: var(--text); }

  /* Theme toggle */
  .theme-toggle {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
  }
  .theme-toggle:hover { color: var(--text); opacity: 1; }

  /* Revision bar */
  .revision-bar { font-size: 0.8125rem; color: var(--text-muted); margin: 0.5rem 0; line-height: 1.6; }
  .revision-bar a { color: var(--text-muted); text-decoration: underline; }
  .revision-bar a:hover { color: var(--text); }
  .revision-bar .current { font-weight: 500; color: var(--text); }
`;

const THEME_SCRIPT = `
(function() {
  function getTheme() {
    var stored = localStorage.getItem('theme');
    if (stored) return stored;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(function(btn) {
      btn.textContent = theme === 'dark' ? '\\u2600' : '\\u263E';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || getTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  }
  applyTheme(getTheme());
  document.addEventListener('DOMContentLoaded', function() {
    applyTheme(getTheme());
    document.addEventListener('click', function(e) {
      if (e.target.closest('.theme-toggle')) toggleTheme();
    });
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (!localStorage.getItem('theme')) applyTheme(getTheme());
  });
})();
`;

function htmlPage(title: string, body: string, nav?: string, meta?: PasteMeta): string {
  const navLinks = nav ?? `<a href="/paste/logout">log out</a>`;
  const metaBlock = meta ? metaTagsHtml(meta) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — paste</title>
  ${metaBlock}
  <style>${PAGE_STYLE}</style>
  <script>${THEME_SCRIPT}</script>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="f2e3a69c-3f8b-4eef-9619-75b2677c4ee6"></script>
</head>
<body>
  <header class="topbar">
    <span class="topbar-title"><a href="/paste">paste</a></span>
    <span class="topbar-nav">
      <a href="/thoughts/">thoughts</a>
      ${navLinks}
      <button class="theme-toggle" aria-label="Toggle theme"></button>
    </span>
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


const LANGUAGES: [string, string][] = [
  ["markdown", "Markdown"], ["plaintext", "Plain text"], ["javascript", "JavaScript"],
  ["typescript", "TypeScript"], ["jsx", "JSX"], ["tsx", "TSX"], ["python", "Python"],
  ["rust", "Rust"], ["html", "HTML"], ["css", "CSS"], ["json", "JSON"], ["sql", "SQL"],
];

function languageOptions(selected: string): string {
  return LANGUAGES.map(([val, label]) =>
    `<option value="${val}"${val === selected ? " selected" : ""}>${label}</option>`
  ).join("\n          ");
}

function excerpt(body: string, maxLen = 150): string {
  const plain = body.replace(/[#*_`~\[\]()>]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
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
    maxAge: 34560000, // ~400 days, max browsers will honor
  });
  return c.redirect("/paste");
});

// GET /logout — clear cookie, redirect to login
paste.get("/logout", async (c) => {
  deleteCookie(c, "paste_auth", { path: "/paste" });
  return c.redirect("/paste/login");
});

// GET /fork/:id — fork a paste (auth required)
paste.get("/fork/:id", async (c) => {
  if (!isAuthed(c)) {
    return c.redirect("/paste/login");
  }

  const forkId = c.req.param("id");
  const forkSource = await c.env.DB.prepare("SELECT id, body, language, title FROM paste WHERE id = ?")
    .bind(forkId)
    .first<{ id: string; body: string; language: string; title: string | null }>();

  if (!forkSource) {
    return c.html(htmlPage("Not Found", `<h1>Not found</h1><p class="meta" style="margin-top:1rem">This paste doesn't exist.</p>`), 404);
  }

  // Fetch 5 most recent pastes
  const recents = await c.env.DB.prepare(
    "SELECT id, title, created_at FROM paste p WHERE NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id) ORDER BY created_at DESC LIMIT 5"
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
    "Fork Paste",
    `<p class="meta" style="margin-bottom:1rem">Forking <a href="/paste/${escapeHtml(forkSource.id)}">${escapeHtml(forkSource.title || "Untitled")}</a></p>
    <form method="POST" action="/paste">
      <input type="hidden" name="parent_id" value="${escapeHtml(forkSource.id)}">
      <div class="field" style="display:flex;align-items:baseline;gap:0.75rem;margin-bottom:1.5rem">
        <label for="language" style="margin:0">Lang</label>
        <select id="language" name="language">
          ${languageOptions(forkSource.language)}
        </select>
      </div>
      <div class="field">
        <div style="margin-bottom:0.5rem"><button type="button" onclick="document.getElementById('body').value='';document.getElementById('body').focus()" style="font-size:0.75rem;padding:0.2rem 0.5rem">Clear</button></div>
        <textarea id="body" name="body" required placeholder="Write something..." autofocus>${escapeHtml(forkSource.body)}</textarea>
      </div>
      <button type="submit">Save</button>
    </form>
    ${recentHtml}`
  );
  return c.html(body);
});

// GET /all — list all pastes (authed: all, public: shared only)
paste.get("/all", async (c) => {
  const authed = isAuthed(c);

  const [rows, splashIds] = await Promise.all([
    authed
      ? c.env.DB.prepare(
          "SELECT id, title, language, created_at, parent_id, shared FROM paste p WHERE NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id) ORDER BY created_at DESC"
        ).all<{ id: string; title: string | null; language: string; created_at: number; parent_id: string | null; shared: number }>()
      : c.env.DB.prepare(
          "SELECT id, title, language, created_at, parent_id, shared FROM paste p WHERE shared = 1 AND NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id) ORDER BY shared_at DESC"
        ).all<{ id: string; title: string | null; language: string; created_at: number; parent_id: string | null; shared: number }>(),
    listSplashIds(c.env.BUCKET),
  ]);

  const items = rows.results
    .map((r) => {
      const date = new Date(r.created_at).toISOString().split("T")[0];
      const title = escapeHtml(r.title || "Untitled");
      const fork = r.parent_id ? ` <a href="/paste/${escapeHtml(r.parent_id)}" style="color:var(--text-muted);font-size:0.7rem" title="forked from">↑</a>` : "";
      const shared = authed && r.shared ? ` <span style="color:var(--text-muted);font-size:0.7rem">●</span>` : "";
      const thumb = splashIds.has(r.id) ? thumbHtml(r.id) : "";
      return `<li>${thumb}<span class="paste-title"><a href="/paste/${escapeHtml(r.id)}">${title}</a>${fork}${shared}</span><span class="paste-meta">${date}</span></li>`;
    })
    .join("\n      ");

  const heading = authed ? "All pastes" : "Shared pastes";
  const nav = authed ? undefined : '<a href="/paste/login">log in</a>';

  const body = htmlPage(
    heading,
    `<h1>${heading}</h1>
    <p class="meta" style="margin-bottom:2rem">${rows.results.length} paste${rows.results.length === 1 ? "" : "s"}</p>
    <ul class="paste-list">
      ${items}
    </ul>`,
    nav
  );
  return c.html(body);
});

// GET / — creation form (authed) or public shared listing
paste.get("/", async (c) => {
  if (!isAuthed(c)) {
    // Public landing: show shared pastes
    const [rows, splashIds] = await Promise.all([
      c.env.DB.prepare(
        "SELECT id, title, body, language, shared_at FROM paste p WHERE shared = 1 AND NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id) ORDER BY shared_at DESC LIMIT 20"
      ).all<{ id: string; title: string | null; body: string; language: string; shared_at: number }>(),
      listSplashIds(c.env.BUCKET),
    ]);

    const items = rows.results
      .map((r) => {
        const date = new Date(r.shared_at).toISOString().split("T")[0];
        const title = escapeHtml(r.title || "Untitled");
        const desc = escapeHtml(excerpt(r.body));
        const thumb = splashIds.has(r.id)
          ? `<img src="/paste/${escapeHtml(r.id)}/splash.png" alt="" loading="lazy" width="96" height="50" style="flex-shrink:0;width:96px;height:50px;object-fit:cover;border-radius:3px;border:1px solid var(--border);background:var(--bg-soft);margin-top:0.15rem">`
          : "";
        return `<li style="flex-direction:row;align-items:flex-start;gap:0.75rem;padding:0.75rem 0">
          ${thumb}
          <span style="display:flex;flex-direction:column;flex:1;min-width:0;gap:0.25rem">
            <span style="display:flex;justify-content:space-between;width:100%;align-items:baseline;gap:1rem"><span class="paste-title"><a href="/paste/${escapeHtml(r.id)}">${title}</a></span><span class="paste-meta">${date}</span></span>
            <span class="meta" style="font-size:0.75rem">${desc}</span>
          </span>
        </li>`;
      })
      .join("\n      ");

    const body = htmlPage(
      "paste",
      `<h1>paste</h1>
      <p class="meta" style="margin-bottom:2rem">shared snippets</p>
      ${rows.results.length > 0 ? `<ul class="paste-list">${items}</ul>` : `<p class="meta">nothing shared yet.</p>`}
      ${rows.results.length > 0 ? `<p style="margin-top:1.5rem;font-size:0.8125rem"><a href="/paste/all">all shared</a></p>` : ""}`,
      '<a href="/paste/login">log in</a>'
    );
    return c.html(body);
  }

  // Fetch 5 most recent pastes
  const recents = await c.env.DB.prepare(
    "SELECT id, title, created_at FROM paste p WHERE NOT EXISTS (SELECT 1 FROM paste c WHERE c.parent_id = p.id) ORDER BY created_at DESC LIMIT 5"
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
          ${languageOptions("markdown")}
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
  let parentId: string | null = null;
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
    parentId = json.parent_id || null;
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
    parentId = (form.parent_id as string) || null;
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
    "INSERT INTO paste (id, body, language, title, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, body, language, title || null, now, parentId)
    .run();

  // Only the latest leaf of a fork chain is indexed. Drop the parent's vectors, embed the new leaf.
  if (parentId) {
    const parent = await c.env.DB.prepare("SELECT title, body FROM paste WHERE id = ?")
      .bind(parentId)
      .first<{ title: string | null; body: string }>();
    if (parent) {
      c.executionCtx.waitUntil(
        deletePasteEmbeddings(c.env, [{ id: parentId, title: parent.title, body: parent.body }]),
      );
    }
    c.executionCtx.waitUntil(removeClusterMembership(c.env, "paste", parentId));
  }
  c.executionCtx.waitUntil(
    (async () => {
      const { vec } = await upsertPasteEmbedding(c.env, id, title || null, body, now);
      if (vec) {
        const preview = body.slice(0, 200);
        await assignClusters(c.env, "paste", id, title || "(untitled paste)", preview, vec);
      }
    })(),
  );

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

  // Check KV for an existing in-flight job
  const kvKey = `tts-job:${id}`;
  const existingJob = await c.env.KV.get(kvKey, "json") as { instanceId: string; totalChunks: number } | null;
  if (existingJob) {
    return c.json({
      status: "generating",
      instanceId: existingJob.instanceId,
      totalChunks: existingJob.totalChunks,
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

  // Record job in KV with 1-hour TTL to prevent duplicates
  await c.env.KV.put(kvKey, JSON.stringify({ instanceId: instance.id, totalChunks }), {
    expirationTtl: 3600,
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
  await c.env.KV.delete(`tts-job:${id}`);
  return c.json({ ok: true, deleted: r2Key });
});

// POST /:id/share — toggle shared status (auth required)
paste.post("/:id/share", async (c) => {
  if (!isAuthed(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT shared FROM paste WHERE id = ?")
    .bind(id)
    .first<{ shared: number }>();
  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  const nowShared = row.shared ? 0 : 1;
  await c.env.DB.prepare("UPDATE paste SET shared = ?, shared_at = ? WHERE id = ?")
    .bind(nowShared, nowShared ? Date.now() : null, id)
    .run();

  const contentType = c.req.header("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return c.json({ shared: !!nowShared });
  }
  return c.redirect(`/paste/${id}`);
});

// GET /:id/diff — diff against parent (public)
paste.get("/:id/diff", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT id, body, title, parent_id FROM paste WHERE id = ?")
    .bind(id)
    .first<{ id: string; body: string; title: string | null; parent_id: string | null }>();

  if (!row) {
    return c.html(htmlPage("Not Found", `<h1>Not found</h1>`), 404);
  }
  if (!row.parent_id) {
    return c.html(htmlPage("No Parent", `<h1>No parent</h1><p class="meta" style="margin-top:1rem">This paste has no parent to diff against.</p><p style="margin-top:1rem"><a href="/paste/${escapeHtml(row.id)}">back</a></p>`));
  }

  const parent = await c.env.DB.prepare("SELECT id, body, title FROM paste WHERE id = ?")
    .bind(row.parent_id)
    .first<{ id: string; body: string; title: string | null }>();

  if (!parent) {
    return c.html(htmlPage("Parent Missing", `<h1>Parent missing</h1><p class="meta" style="margin-top:1rem">The parent paste no longer exists.</p><p style="margin-top:1rem"><a href="/paste/${escapeHtml(row.id)}">back</a></p>`));
  }

  const safeJson = (s: string) => JSON.stringify(s).replace(/<\//g, "<\\/");
  const currentTitle = escapeHtml(row.title || "Untitled");
  const parentTitle = escapeHtml(parent.title || "Untitled");

  const html = htmlPage(
    "Diff",
    `<h1>Diff</h1>
    <p class="meta"><a href="/paste/${escapeHtml(parent.id)}">${parentTitle}</a> &rarr; <a href="/paste/${escapeHtml(row.id)}">${currentTitle}</a></p>
    <hr class="rule">
    <pre id="diff-output" style="font-size:0.8125rem;line-height:1.7;overflow-x:auto"></pre>
    <script id="parent-body" type="application/json">${safeJson(parent.body)}</script>
    <script id="current-body" type="application/json">${safeJson(row.body)}</script>
    <style>
      .diff-add { color: #2a2; } .diff-del { color: #c44; } .diff-hunk { color: var(--text-muted); }
      [data-theme='dark'] .diff-add { color: #5d8; } [data-theme='dark'] .diff-del { color: #e66; }
    </style>
    <script type="module">
      import { createTwoFilesPatch } from 'https://esm.sh/diff@7';
      const p = JSON.parse(document.getElementById('parent-body').textContent);
      const cur = JSON.parse(document.getElementById('current-body').textContent);
      const patch = createTwoFilesPatch('parent', 'current', p, cur, '', '', { context: 4 });
      const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const lines = patch.split('\\n').slice(2).map(l => {
        const e = esc(l);
        if (l.startsWith('+')) return '<span class="diff-add">' + e + '</span>';
        if (l.startsWith('-')) return '<span class="diff-del">' + e + '</span>';
        if (l.startsWith('@@')) return '<span class="diff-hunk">' + e + '</span>';
        return e;
      }).join('\\n');
      document.getElementById('diff-output').innerHTML = lines;
    </script>`,
    ""
  );
  return c.html(html);
});

// GET /:id — view paste (public)
paste.get("/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM paste WHERE id = ?")
    .bind(id)
    .first<{ id: string; body: string; language: string; title: string | null; created_at: number; parent_id: string | null; shared: number }>();

  if (!row) {
    return c.html(htmlPage("Not Found", `<h1>Not found</h1><p class="meta" style="margin-top:1rem">This paste doesn't exist.</p>`), 404);
  }

  const date = new Date(row.created_at).toISOString().split("T")[0];
  const title = row.title || "Untitled";

  const ogMeta: PasteMeta = {
    ogTitle: title,
    ogDescription: excerpt(row.body, 200) || "A paste on tantaman.com",
    ogImage: `${SITE_URL}/paste/${row.id}/splash.png`,
    ogUrl: `${SITE_URL}/paste/${row.id}`,
  };

  // Fetch revision chain (ancestors + children)
  const [ancestorRows, childRows] = await Promise.all([
    row.parent_id
      ? c.env.DB.prepare(`
          WITH RECURSIVE ancestors(id, title, parent_id, depth) AS (
            SELECT id, title, parent_id, 0 FROM paste WHERE id = ?
            UNION ALL
            SELECT p.id, p.title, p.parent_id, a.depth + 1
            FROM paste p JOIN ancestors a ON p.id = a.parent_id
            WHERE a.depth < 20
          )
          SELECT id, title FROM ancestors WHERE id != ? ORDER BY depth DESC
        `).bind(id, id).all<{ id: string; title: string | null }>()
      : Promise.resolve({ results: [] as { id: string; title: string | null }[] }),
    c.env.DB.prepare("SELECT id, title, created_at FROM paste WHERE parent_id = ? ORDER BY created_at ASC")
      .bind(id)
      .all<{ id: string; title: string | null; created_at: number }>(),
  ]);

  const ancestors = ancestorRows.results;
  const children = childRows.results;

  let revisionBarHtml = "";
  if (ancestors.length > 0 || children.length > 0) {
    let bar = '<div class="revision-bar">';
    if (ancestors.length > 0) {
      const crumbs = ancestors
        .map((a) => `<a href="/paste/${escapeHtml(a.id)}">${escapeHtml(a.title || "Untitled")}</a>`)
        .join(" › ");
      bar += `${crumbs} › <span class="current">${escapeHtml(title)}</span>`;
    }
    if (children.length > 0) {
      const forks = children
        .map((ch) => `<a href="/paste/${escapeHtml(ch.id)}">${escapeHtml(ch.title || "Untitled")}</a>`)
        .join(", ");
      if (ancestors.length > 0) bar += "<br>";
      bar += `forks: ${forks}`;
    }
    bar += "</div>";
    revisionBarHtml = bar;
  }

  const authed = isAuthed(c);

  if (row.language === "jsx" || row.language === "tsx") {
    const shareBtn = authed
      ? `<form method="POST" action="/paste/${escapeHtml(row.id)}/share" style="display:inline;margin:0"><button type="submit" style="background:none;border:none;color:var(--text-muted);padding:0;font:inherit;cursor:pointer;text-decoration:underline">${row.shared ? "unshare" : "share"}</button></form>`
      : "";
    const runnerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — paste</title>
  ${metaTagsHtml(ogMeta)}
  <style>
    ${PAGE_STYLE}
    body { max-width: none; padding: 0; }
  </style>
  <script>${THEME_SCRIPT}</script>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="f2e3a69c-3f8b-4eef-9619-75b2677c4ee6"></script>
  <style>
    #root { min-height: 100vh; padding: 2rem; }
    .paste-toolbar {
      position: fixed; bottom: 1rem; right: 1rem;
      font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, monospace; font-size: 0.75rem;
      background: var(--bg-soft); border: 1px solid var(--border);
      border-radius: 3px; padding: 0.35rem 0.75rem;
      color: var(--text-muted); z-index: 9999;
      display: flex; gap: 0.75rem; align-items: center;
    }
    .paste-toolbar a { color: var(--text-muted); text-decoration: underline; }
    .paste-toolbar a:hover { color: var(--text); }
    .paste-error { color: var(--text); padding: 2rem; font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, monospace; font-size: 0.875rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div class="paste-toolbar">
    <span>${escapeHtml(row.language)}</span>
    <a href="/paste/${escapeHtml(row.id)}/raw">source</a>
    <a href="/paste/fork/${escapeHtml(row.id)}">fork</a>
    ${shareBtn}
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
      font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, monospace; font-size: 0.75rem;
      background: #1a1a1a; border: 1px solid #333;
      border-radius: 3px; padding: 0.35rem 0.75rem;
      color: #999; z-index: 9999;
      display: flex; gap: 0.75rem; align-items: center;
    "><span>html</span><a href="/paste/${escapeHtml(row.id)}/raw" style="color:#e0e0e0;text-decoration:none">source</a><a href="/paste/fork/${escapeHtml(row.id)}" style="color:#e0e0e0;text-decoration:none">fork</a></div>`;

    const isFullDocument = /<!DOCTYPE|<html/i.test(row.body);
    if (isFullDocument) {
      // Inject toolbar before </body> and OG tags before </head> (if present).
      let html = row.body.replace(/<\/body>/i, `${toolbar}</body>`);
      if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, `${metaTagsHtml(ogMeta)}\n</head>`);
      }
      return c.html(html);
    }

    // Wrap fragment in minimal shell
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — paste</title>
  ${metaTagsHtml(ogMeta)}
  <script defer src="https://cloud.umami.is/script.js" data-website-id="f2e3a69c-3f8b-4eef-9619-75b2677c4ee6"></script>
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
    // Strip leading heading if it matches the extracted title to avoid duplication
    let mdBody = row.body;
    if (title && /^#{1,6}\s+/.test(mdBody.trimStart())) {
      mdBody = mdBody.trimStart().replace(/^#{1,6}\s+.+\n?/, "");
    }
    let parsedMd = await marked.parse(mdBody);
    const hasMermaid = parsedMd.includes('class="language-mermaid"');
    if (hasMermaid) {
      parsedMd = parsedMd.replace(
        /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
        (_, code) => `<div class="mermaid">${code}</div>`
      );
    }
    rendered = `<div class="content">${parsedMd}</div>${hasMermaid ? `<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';mermaid.initialize({ startOnLoad: true, theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default' });</script>` : ''}`;
  } else {
    rendered = `<div class="content"><pre><code class="language-${escapeHtml(row.language)}">${escapeHtml(row.body)}</code></pre></div>`;
  }

  const diffLink = row.parent_id ? `<a href="/paste/${escapeHtml(row.id)}/diff">diff</a>` : "";
  const shareToggle = authed
    ? `<form method="POST" action="/paste/${escapeHtml(row.id)}/share" style="display:inline"><button type="submit" style="background:none;color:var(--text-muted);padding:0;font-weight:400;letter-spacing:normal;font-size:0.8125rem">${row.shared ? "unshare" : "share"}</button></form>`
    : "";
  const sharedIndicator = row.shared ? ` · <span style="color:var(--text-muted)">shared</span>` : "";

  const html = htmlPage(
    title,
    `<h1>${escapeHtml(title)}</h1>
    <p class="meta">${date} · ${escapeHtml(row.language)}${sharedIndicator}</p>
    ${revisionBarHtml}
    <div class="actions">
      <a href="/paste/${escapeHtml(row.id)}/raw">raw</a>
      <a href="/paste/fork/${escapeHtml(row.id)}">fork</a>${diffLink ? `
      ${diffLink}` : ""}${shareToggle ? `
      ${shareToggle}` : ""}
    </div>
    <hr class="rule">
    ${rendered}
    <div class="actions">
      <a href="/paste/${escapeHtml(row.id)}/raw">raw</a>
      <a href="/paste/fork/${escapeHtml(row.id)}">fork</a>${diffLink ? `
      ${diffLink}` : ""}${shareToggle ? `
      ${shareToggle}` : ""}${row.language === "markdown" ? `
      <button id="play-btn" style="display:inline-block;vertical-align:middle;padding:0.35rem 1rem;font-size:0.75rem">listen</button>
      <audio id="audio-player" preload="none" style="display:none;height:2rem;vertical-align:middle"></audio>
      <span id="audio-status" class="meta" style="margin-left:0.5rem"></span>
      <script>
      (function() {
        const pasteId = ${JSON.stringify(row.id)};
        const btn = document.getElementById('play-btn');
        const audio = document.getElementById('audio-player');
        const statusEl = document.getElementById('audio-status');

        btn.addEventListener('click', async function onClick() {
          btn.removeEventListener('click', onClick);
          btn.style.display = 'none';
          statusEl.textContent = 'loading...';

          try {
            const res = await fetch('/paste/' + pasteId + '/audio');
            const ct = res.headers.get('content-type') || '';

            if (ct.includes('audio/mpeg')) {
              const blob = await res.blob();
              audio.src = URL.createObjectURL(blob);
              audio.controls = true;
              audio.style.display = 'inline-block';
              audio.play();
              statusEl.textContent = '';
              return;
            }

            const data = await res.json();
            if (data.status !== 'generating') {
              statusEl.textContent = data.error || 'error';
              return;
            }

            const { instanceId, totalChunks } = data;
            const chunkUrls = [];

            for (let i = 0; i < totalChunks; i++) {
              statusEl.textContent = 'generating ' + (i + 1) + '/' + totalChunks + '...';
              let chunkBlob = null;
              while (!chunkBlob) {
                const cr = await fetch('/paste/' + pasteId + '/audio/chunk/' + i);
                if (cr.ok) {
                  chunkBlob = await cr.blob();
                } else {
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

              if (i === 0) {
                audio.src = chunkUrls[0];
                audio.controls = true;
                audio.style.display = 'inline-block';
                audio.play();
              }
            }

            statusEl.textContent = '';

            let currentChunk = 0;
            audio.addEventListener('ended', function advance() {
              currentChunk++;
              if (currentChunk < chunkUrls.length) {
                audio.src = chunkUrls[currentChunk];
                audio.play();
              } else {
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
    </div>`,
    undefined,
    ogMeta
  );

  return c.html(html);
});

// GET /:id/splash.png — auto-generated splash card (public, lazy R2 cache)
paste.get("/:id/splash.png", async (c) => {
  const id = c.req.param("id");
  const r2Key = `paste-cards/${id}.png`;

  const cached = await c.env.BUCKET.get(r2Key);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const row = await c.env.DB.prepare(
    "SELECT id, title, body, language FROM paste WHERE id = ?",
  )
    .bind(id)
    .first<{ id: string; title: string | null; body: string; language: string }>();

  if (!row) return c.text("Not found", 404);

  try {
    const png = await renderPasteCard(c.env.KV, {
      id: row.id,
      title: row.title,
      language: row.language,
      body: row.body,
    });
    await c.env.BUCKET.put(r2Key, png, {
      httpMetadata: { contentType: "image/png" },
    });
    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error(`[paste-splash] error rendering ${id}:`, err);
    return c.text("Failed to render splash", 500);
  }
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
