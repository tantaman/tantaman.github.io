import { Hono } from "hono";
import { marked } from "marked";
import type { Env } from "./index";

export const now = new Hono<{ Bindings: Env }>();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function excerpt(body: string, maxLen = 150): string {
  const plain = body.replace(/[#*_`~\[\]()>]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
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

  section { margin-bottom: 2.5rem; }

  .thought {
    margin-bottom: 1.25rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  .thought:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
  .thought-body { line-height: 1.8; }
  .thought-body p { margin: 0.5em 0; }
  .thought-body p:first-child { margin-top: 0; }
  .thought-body a { color: var(--text); text-decoration: underline; }
  .thought-body code { font-size: 0.9em; font-family: ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, monospace; }
  .thought-body blockquote {
    border-left: 2px solid var(--border-heavy);
    padding-left: 1.25rem;
    margin: 0.75em 0;
    color: var(--text-muted);
    font-style: italic;
  }
  .thought-meta { margin-top: 0.35rem; }

  .item-list { list-style: none; padding: 0; }
  .item-list li {
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }
  .item-list li:last-child { border-bottom: none; }
  .item-title { flex: 1; min-width: 0; }
  .item-meta { flex-shrink: 0; font-size: 0.75rem; color: var(--text-muted); }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }
  .media-card { text-align: center; }
  .media-card img {
    width: 100%;
    aspect-ratio: 2/3;
    object-fit: cover;
    border-radius: 3px;
    background: var(--bg-soft);
  }
  .media-card .media-label {
    font-size: 0.75rem;
    margin-top: 0.35rem;
    color: var(--text);
    line-height: 1.4;
  }
  .media-card .media-sublabel {
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  /* Paste list */
  .paste-list { list-style: none; padding: 0; }
  .paste-list li {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  .paste-list li:last-child { border-bottom: none; }
  .paste-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .paste-meta { flex-shrink: 0; font-size: 0.75rem; color: var(--text-muted); }

  footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  footer a { color: var(--text-muted); }
  footer a:hover { color: var(--text); }
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

interface Thought {
  id: number;
  body: string;
  timestamp: number;
}

interface Task {
  title: string;
  created_at: number;
}

interface Event {
  title: string;
  date_text: string;
  date_epoch: number;
}

interface Book {
  title: string;
  author: string | null;
  cover_url: string | null;
}

interface Movie {
  title: string;
  poster_url: string | null;
  year: string | null;
}

interface Paste {
  id: string;
  title: string | null;
  body: string;
  language: string;
  shared_at: number;
}

now.get("/", async (c) => {
  const db = c.env.DB;
  const nowEpoch = Date.now();

  const [thoughts, tasks, events, books, movies, pastes] = await Promise.all([
    db
      .prepare(
        `SELECT id, body, timestamp FROM thought
         WHERE superseded_by IS NULL AND private = 0 AND parent_id IS NULL
         ORDER BY timestamp DESC LIMIT 10`
      )
      .all<Thought>(),
    db
      .prepare(
        `SELECT title, created_at FROM task
         WHERE completed_at IS NULL AND deprioritized_at IS NULL
         ORDER BY created_at DESC LIMIT 10`
      )
      .all<Task>(),
    db
      .prepare(
        `SELECT title, date_text, date_epoch FROM event
         WHERE date_epoch >= ?
         ORDER BY date_epoch ASC LIMIT 10`
      )
      .bind(nowEpoch)
      .all<Event>(),
    db
      .prepare(
        `SELECT title, author, cover_url FROM book
         ORDER BY created_at DESC LIMIT 5`
      )
      .all<Book>(),
    db
      .prepare(
        `SELECT title, poster_url, year FROM movie
         ORDER BY created_at DESC LIMIT 5`
      )
      .all<Movie>(),
    db
      .prepare(
        `SELECT id, title, body, language, shared_at FROM paste
         WHERE shared = 1
         ORDER BY shared_at DESC LIMIT 10`
      )
      .all<Paste>(),
  ]);

  const sections: string[] = [];

  // Thoughts
  if (thoughts.results.length > 0) {
    const items = await Promise.all(
      thoughts.results.map(async (t) => {
        const html = await marked.parse(t.body);
        const time = relativeTime(t.timestamp);
        return `<div class="thought">
          <div class="thought-body">${html}</div>
          <div class="thought-meta meta">${time}</div>
        </div>`;
      })
    );
    sections.push(`<section>
      <h2>thinking about</h2>
      ${items.join("\n")}
    </section>`);
  }

  // Tasks
  if (tasks.results.length > 0) {
    const items = tasks.results
      .map(
        (t) =>
          `<li><span class="item-title">${escapeHtml(t.title)}</span><span class="item-meta">${relativeTime(t.created_at)}</span></li>`
      )
      .join("\n");
    sections.push(`<section>
      <h2>working on</h2>
      <ul class="item-list">${items}</ul>
    </section>`);
  }

  // Events
  if (events.results.length > 0) {
    const items = events.results
      .map(
        (e) =>
          `<li><span class="item-title">${escapeHtml(e.title)}</span><span class="item-meta">${escapeHtml(e.date_text)}</span></li>`
      )
      .join("\n");
    sections.push(`<section>
      <h2>upcoming</h2>
      <ul class="item-list">${items}</ul>
    </section>`);
  }

  // Books
  if (books.results.length > 0) {
    const items = books.results
      .map((b) => {
        const img = b.cover_url
          ? `<img src="${escapeHtml(b.cover_url)}" alt="${escapeHtml(b.title)}" loading="lazy">`
          : `<div style="width:100%;aspect-ratio:2/3;background:var(--bg-soft);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-muted);padding:0.5rem;text-align:center">${escapeHtml(b.title)}</div>`;
        const author = b.author
          ? `<div class="media-sublabel">${escapeHtml(b.author)}</div>`
          : "";
        return `<div class="media-card">${img}<div class="media-label">${escapeHtml(b.title)}</div>${author}</div>`;
      })
      .join("\n");
    sections.push(`<section>
      <h2>reading</h2>
      <div class="media-grid">${items}</div>
    </section>`);
  }

  // Movies
  if (movies.results.length > 0) {
    const items = movies.results
      .map((m) => {
        const img = m.poster_url
          ? `<img src="${escapeHtml(m.poster_url)}" alt="${escapeHtml(m.title)}" loading="lazy">`
          : `<div style="width:100%;aspect-ratio:2/3;background:var(--bg-soft);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-muted);padding:0.5rem;text-align:center">${escapeHtml(m.title)}</div>`;
        const year = m.year
          ? `<div class="media-sublabel">${escapeHtml(m.year)}</div>`
          : "";
        return `<div class="media-card">${img}<div class="media-label">${escapeHtml(m.title)}</div>${year}</div>`;
      })
      .join("\n");
    sections.push(`<section>
      <h2>watching</h2>
      <div class="media-grid">${items}</div>
    </section>`);
  }

  // Pastes
  if (pastes.results.length > 0) {
    const items = pastes.results
      .map((p) => {
        const date = new Date(p.shared_at).toISOString().split("T")[0];
        const title = escapeHtml(p.title || "Untitled");
        const desc = escapeHtml(excerpt(p.body));
        return `<li>
          <span style="display:flex;justify-content:space-between;width:100%;align-items:baseline;gap:1rem"><span class="paste-title"><a href="/paste/${escapeHtml(p.id)}">${title}</a></span><span class="paste-meta">${date}</span></span>
          <span class="meta" style="font-size:0.75rem">${desc}</span>
        </li>`;
      })
      .join("\n      ");
    sections.push(`<section>
      <h2>shared</h2>
      <ul class="paste-list">${items}</ul>
    </section>`);
  }

  const updatedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>now — tantaman</title>
  <meta name="description" content="What Matt is up to right now.">
  <style>${PAGE_STYLE}</style>
  <script>${THEME_SCRIPT}</script>
</head>
<body>
  <header class="topbar">
    <span class="topbar-title"><a href="https://tantaman.com">tantaman</a></span>
    <span class="topbar-nav">
      <a href="https://tantaman.com/thoughts/">thoughts</a>
      <a href="/paste">paste</a>
      <button class="theme-toggle" aria-label="Toggle theme"></button>
    </span>
  </header>
  <h1>now</h1>
  <p class="meta" style="margin-bottom:2.5rem">A living snapshot of what I'm up to.</p>
  ${sections.join("\n<hr class=\"rule\">\n")}
  <footer>
    last updated ${updatedAt} · <a href="https://tantaman.com/thoughts/">thoughts</a> · <a href="/paste">paste</a> · <a href="https://tantaman.com">tantaman.com</a>
  </footer>
</body>
</html>`;

  return c.html(html, 200, {
    "Cache-Control": "public, max-age=300",
  });
});
