import { marked } from "marked";
import type { Env } from "./index";

interface Thought {
  id: number;
  body: string;
  timestamp: number;
}

interface Paste {
  id: string;
  title: string | null;
  body: string;
  language: string;
  shared_at: number;
}

interface Post {
  slug: string;
  title: string;
  description: string | null;
  date: string;
  thesis: string | null;
}

const THIRTY_DAYS = 30 * 24 * 60 * 60;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function excerpt(body: string, maxLen = 240): string {
  const plain = body.replace(/[#*_`~\[\]()>]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

async function pickThoughts(db: D1Database, n: number): Promise<Thought[]> {
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS;
  const res = await db
    .prepare(
      `SELECT id, body, timestamp FROM thought
       WHERE private = 0 AND parent_id IS NULL
         AND timestamp < ? AND length(body) > 80
       ORDER BY RANDOM() LIMIT ?`
    )
    .bind(cutoff, n)
    .all<Thought>();
  return res.results;
}

async function pickPaste(db: D1Database): Promise<Paste | null> {
  const cutoff = Date.now() - THIRTY_DAYS * 1000;
  const res = await db
    .prepare(
      `SELECT id, title, body, language, shared_at FROM paste
       WHERE shared = 1 AND shared_at < ?
       ORDER BY RANDOM() LIMIT 1`
    )
    .bind(cutoff)
    .first<Paste>();
  return res ?? null;
}

async function pickPosts(n: number): Promise<Post[]> {
  try {
    const res = await fetch("https://tantaman.com/posts-manifest.json", {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) return [];
    const all = (await res.json()) as Post[];
    const cutoff = new Date(Date.now() - THIRTY_DAYS * 1000)
      .toISOString()
      .slice(0, 10);
    const eligible = all.filter(
      (p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date < cutoff
    );
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    return eligible.slice(0, n);
  } catch {
    return [];
  }
}

function ageLabel(tsSeconds: number): string {
  const days = Math.floor((Date.now() / 1000 - tsSeconds) / 86400);
  if (days < 60) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months}mo ago`;
  const years = (days / 365).toFixed(1);
  return `${years}y ago`;
}

async function buildHtml(env: Env): Promise<{ html: string; text: string; subject: string } | null> {
  const [thoughts, paste, posts] = await Promise.all([
    pickThoughts(env.DB, 2),
    pickPaste(env.DB),
    pickPosts(2),
  ]);

  if (thoughts.length === 0 && !paste && posts.length === 0) return null;

  const parts: string[] = [];
  const textParts: string[] = [];

  if (thoughts.length > 0) {
    parts.push(`<h2 style="font-size:0.75rem;letter-spacing:0.05em;text-transform:lowercase;color:#6b6b6b;margin:2rem 0 0.75rem">echoes</h2>`);
    textParts.push("\n— echoes —\n");
    for (const t of thoughts) {
      const html = await marked.parse(t.body);
      const url = `https://tantaman.com/thoughts/t/${t.id}`;
      parts.push(`<div style="padding:1rem 0;border-bottom:1px solid #e5e5e5">
        <div style="line-height:1.7">${html}</div>
        <div style="margin-top:0.5rem;font-size:0.8125rem;color:#6b6b6b">
          <a href="${url}" style="color:#6b6b6b">${ageLabel(t.timestamp)}</a>
        </div>
      </div>`);
      textParts.push(`${excerpt(t.body, 400)}\n[${ageLabel(t.timestamp)}] ${url}\n`);
    }
  }

  if (paste) {
    const ageDays = Math.floor((Date.now() - paste.shared_at) / 86400000);
    const url = `https://tantaman.com/paste/${paste.id}`;
    const title = paste.title || "(untitled)";
    parts.push(`<h2 style="font-size:0.75rem;letter-spacing:0.05em;text-transform:lowercase;color:#6b6b6b;margin:2rem 0 0.75rem">a paste from the past</h2>`);
    parts.push(`<div style="padding:1rem 0;border-bottom:1px solid #e5e5e5">
      <div><a href="${url}" style="color:#1a1a1a;font-weight:500">${escapeHtml(title)}</a></div>
      <div style="font-size:0.8125rem;color:#6b6b6b;margin-top:0.25rem">${escapeHtml(paste.language)} · ${ageDays}d ago</div>
      <div style="margin-top:0.5rem;color:#444;font-size:0.875rem">${escapeHtml(excerpt(paste.body, 240))}</div>
    </div>`);
    textParts.push(`\n— a paste from the past —\n${title} (${paste.language}, ${ageDays}d ago)\n${excerpt(paste.body, 300)}\n${url}\n`);
  }

  if (posts.length > 0) {
    parts.push(`<h2 style="font-size:0.75rem;letter-spacing:0.05em;text-transform:lowercase;color:#6b6b6b;margin:2rem 0 0.75rem">from the archive</h2>`);
    textParts.push("\n— from the archive —\n");
    for (const p of posts) {
      const url = `https://tantaman.com/${p.slug}.html`;
      const blurb = p.thesis || p.description || "";
      parts.push(`<div style="padding:1rem 0;border-bottom:1px solid #e5e5e5">
        <div><a href="${url}" style="color:#1a1a1a;font-weight:500">${escapeHtml(p.title)}</a> <span style="color:#6b6b6b;font-size:0.8125rem">· ${escapeHtml(p.date)}</span></div>
        ${blurb ? `<div style="margin-top:0.35rem;color:#444;font-size:0.875rem">${escapeHtml(excerpt(blurb, 220))}</div>` : ""}
      </div>`);
      textParts.push(`${p.title} (${p.date})\n${excerpt(blurb, 220)}\n${url}\n`);
    }
  }

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.7;max-width:640px;margin:0 auto;padding:2rem 1.5rem;color:#1a1a1a">
    <div style="font-size:0.9375rem;letter-spacing:0.05em;text-transform:lowercase;color:#6b6b6b;margin-bottom:0.5rem">tantaman · digest</div>
    <div style="font-size:0.8125rem;color:#6b6b6b;margin-bottom:1.5rem">A handful of older notes, surfaced for re-reading.</div>
    ${parts.join("\n")}
    <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e5e5;font-size:0.75rem;color:#6b6b6b">
      <a href="https://tantaman.com/now?mode=random" style="color:#6b6b6b">/now?mode=random</a> · <a href="https://tantaman.com" style="color:#6b6b6b">tantaman.com</a>
    </div>
  </body></html>`;

  const text = `tantaman · digest\nA handful of older notes, surfaced for re-reading.\n${textParts.join("\n")}`;
  const subject = `Digest · ${new Date().toISOString().slice(0, 10)}`;
  return { html, text, subject };
}

export async function sendDigest(env: Env): Promise<{ ok: boolean; reason?: string }> {
  const to = (env as Env & { DIGEST_EMAIL_TO?: string }).DIGEST_EMAIL_TO;
  if (!to) return { ok: false, reason: "DIGEST_EMAIL_TO not set" };
  if (!env.RESEND_API_KEY) return { ok: false, reason: "RESEND_API_KEY not set" };

  const built = await buildHtml(env);
  if (!built) return { ok: false, reason: "no content" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Tantamanlands <noreply@tantaman.com>",
      to: [to],
      subject: built.subject,
      html: built.html,
      text: built.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, reason: `resend ${res.status}: ${body.slice(0, 200)}` };
  }
  return { ok: true };
}
