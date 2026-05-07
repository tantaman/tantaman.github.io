import { Hono } from "hono";
import type { Env } from "./index";

export const thoughtOg = new Hono<{ Bindings: Env }>();

const KV_KEY = "thought-spa-shell";
const KV_TTL = 3600; // 1 hour

function stripMarkdown(md: string): string {
  return md
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[\[(\d+)(?:\|([^\]|]+))?\]\]/g, (_, id, title) => (title ? title.trim() : `#${id}`))
    .replace(/[*_~`]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function getSpaShell(kv: KVNamespace): Promise<string | null> {
  let html = await kv.get(KV_KEY);
  if (html) return html;

  const res = await fetch("https://tantaman.com/thoughts/index.html");
  if (!res.ok) return null;
  html = await res.text();
  await kv.put(KV_KEY, html, { expirationTtl: KV_TTL });
  return html;
}

thoughtOg.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  if (isNaN(id)) return c.redirect("/thoughts/");

  const thought = await c.env.DB.prepare(
    "SELECT id, body, private, superseded_by FROM thought WHERE id = ?"
  ).bind(id).first<{ id: number; body: string; private: number; superseded_by: number | null }>();

  if (!thought || thought.private) return c.redirect("/thoughts/");
  if (thought.superseded_by != null) return c.redirect(`/thoughts/t/${thought.superseded_by}`);

  const attachment = await c.env.DB.prepare(
    "SELECT attachment_key, attachment_type FROM thought_attachment WHERE thought_id = ? AND attachment_type LIKE 'image/%' LIMIT 1"
  ).bind(id).first<{ attachment_key: string; attachment_type: string }>();

  const plain = stripMarkdown(thought.body);
  const title = escapeAttr(plain.length > 60 ? plain.slice(0, 57) + "..." : plain);
  const description = escapeAttr(plain.length > 200 ? plain.slice(0, 197) + "..." : plain);
  const imageUrl = attachment
    ? `https://tantaman.com/api/attachments/${attachment.attachment_key}`
    : "https://tantaman.com/img/avatar-icon.png";
  const canonicalUrl = `https://tantaman.com/thoughts/t/${id}`;

  const shell = await getSpaShell(c.env.KV);
  if (!shell) return c.redirect("/thoughts/");

  const html = shell
    .replace(
      '<meta property="og:title" content="Thoughts - Tantamanlands">',
      `<meta property="og:title" content="${title}">`
    )
    .replace(
      '<meta property="og:description" content="Quick thoughts and ideas">',
      `<meta property="og:description" content="${description}">`
    )
    .replace(
      '<meta property="og:image" content="https://tantaman.com/img/avatar-icon.png">',
      `<meta property="og:image" content="${imageUrl}">`
    )
    .replace(
      '<meta name="twitter:image" content="https://tantaman.com/img/avatar-icon.png">',
      `<meta name="twitter:image" content="${imageUrl}">`
    )
    .replace(
      "</head>",
      `<meta property="og:url" content="${canonicalUrl}">` +
      `<script>(function(){var m=location.pathname.match(/\\/thoughts\\/t\\/(\\d+)/);if(m&&!location.hash)history.replaceState(null,'','/thoughts/#thought-'+m[1])})()</script>` +
      "</head>"
    );

  return c.html(html);
});
