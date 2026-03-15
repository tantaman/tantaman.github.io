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
  .thought-body a { color: var(--accent); }
  .thought-body code { font-size: 0.9em; font-family: var(--mono); }
  .thought-body blockquote {
    border-left: 2px solid var(--accent);
    padding-left: 1.25rem;
    margin: 0.75em 0;
    color: var(--fg-dim);
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
  .item-meta { flex-shrink: 0; font-size: 0.75rem; color: var(--fg-dim); }

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
    background: var(--bg-surface);
  }
  .media-card .media-label {
    font-size: 0.75rem;
    margin-top: 0.35rem;
    color: var(--fg);
    line-height: 1.4;
  }
  .media-card .media-sublabel {
    font-size: 0.6875rem;
    color: var(--fg-dim);
  }

  footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    font-size: 0.75rem;
    color: var(--fg-dim);
  }
  footer a { color: var(--fg-dim); }
  footer a:hover { color: var(--accent); }
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

now.get("/", async (c) => {
  const db = c.env.DB;
  const nowEpoch = Date.now();

  const [thoughts, tasks, events, books, movies] = await Promise.all([
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
          : `<div style="width:100%;aspect-ratio:2/3;background:var(--bg-surface);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--fg-dim);padding:0.5rem;text-align:center">${escapeHtml(b.title)}</div>`;
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
          : `<div style="width:100%;aspect-ratio:2/3;background:var(--bg-surface);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--fg-dim);padding:0.5rem;text-align:center">${escapeHtml(m.title)}</div>`;
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

  const updatedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>now — tantaman</title>
  <meta name="description" content="What Matt is up to right now.">
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <header class="topbar">
    <span class="topbar-title"><a href="https://tantaman.com">tantaman</a></span>
    <span class="topbar-nav"><a href="https://tantaman.com/thoughts/">thoughts</a></span>
  </header>
  <h1>now</h1>
  <p class="meta" style="margin-bottom:2.5rem">A living snapshot of what I'm up to.</p>
  ${sections.join("\n<hr class=\"rule\">\n")}
  <footer>
    last updated ${updatedAt} · <a href="https://tantaman.com/thoughts/">thoughts</a> · <a href="https://tantaman.com">tantaman.com</a>
  </footer>
</body>
</html>`;

  return c.html(html, 200, {
    "Cache-Control": "public, max-age=300",
  });
});
