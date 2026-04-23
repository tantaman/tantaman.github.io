import type { OgMetadata } from "./opengraph";

const NOTE_URL_RE = /^https?:\/\/(?:[^/]*\.)?substack\.com\/(?:@[^/]+\/note|home\/post|notes\/note)\/([cp])-(\d+)/i;

export function isSubstackNoteUrl(url: string): boolean {
  return NOTE_URL_RE.test(url);
}

export function parseSubstackNoteId(
  url: string,
): { kind: "c" | "p"; id: string } | null {
  const m = url.match(NOTE_URL_RE);
  if (!m) return null;
  return { kind: m[1].toLowerCase() as "c" | "p", id: m[2] };
}

/**
 * Fetches Substack metadata via the reader/post APIs.
 *  - c-{id} (notes)           → /api/v1/reader/comment/{id}
 *  - p-{id} (restacked posts) → /api/v1/posts/by-id/{id}
 * Needed because Substack renders the client-side HTML with generic OG shell when fetched
 * from a Cloudflare Worker, so we can't rely on the shared OG scraper.
 */
export async function fetchSubstackNoteMetadata(
  url: string,
): Promise<OgMetadata | null> {
  const parsed = parseSubstackNoteId(url);
  if (!parsed) return null;
  if (parsed.kind === "c") return fetchSubstackComment(parsed.id);
  return fetchSubstackPost(parsed.id);
}

async function fetchSubstackComment(id: string): Promise<OgMetadata | null> {
  try {
    const res = await fetch(
      `https://substack.com/api/v1/reader/comment/${id}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TantamanBot/1.0",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as SubstackReaderResponse;

    const comment = data.item?.comment;
    if (!comment) return null;

    const title = comment.name ? `${comment.name}${comment.handle ? ` (@${comment.handle})` : ""}` : null;
    const description = comment.body ? truncate(comment.body, 280) : null;
    const imageUrl = firstImage(comment) ?? comment.photo_url ?? null;

    if (!title && !description && !imageUrl) return null;

    return {
      title,
      description,
      imageUrl,
      siteName: "Substack Notes",
    };
  } catch {
    return null;
  }
}

async function fetchSubstackPost(id: string): Promise<OgMetadata | null> {
  try {
    const res = await fetch(
      `https://substack.com/api/v1/posts/by-id/${id}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TantamanBot/1.0",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as SubstackPostResponse;

    const post = data.post;
    if (!post) return null;

    const title = post.title || post.social_title || null;
    const description =
      post.description ||
      post.subtitle ||
      post.search_engine_description ||
      (post.truncated_body_text ? truncate(post.truncated_body_text, 280) : null) ||
      null;
    const imageUrl = post.cover_image || null;
    const siteName = data.publication?.name || "Substack";

    if (!title && !description && !imageUrl) return null;

    return { title, description, imageUrl, siteName };
  } catch {
    return null;
  }
}

interface SubstackReaderResponse {
  item?: {
    comment?: {
      body?: string;
      name?: string;
      handle?: string;
      photo_url?: string;
      attachments?: SubstackAttachment[];
    };
  };
}

interface SubstackPostResponse {
  post?: {
    title?: string;
    social_title?: string;
    subtitle?: string;
    description?: string;
    search_engine_description?: string;
    truncated_body_text?: string;
    cover_image?: string;
    canonical_url?: string;
  };
  publication?: {
    name?: string;
  };
}

interface SubstackAttachment {
  type?: string;
  imageUrl?: string;
  image_url?: string;
  url?: string;
}

function firstImage(comment: NonNullable<SubstackReaderResponse["item"]>["comment"]): string | null {
  const attachments = comment?.attachments ?? [];
  for (const a of attachments) {
    const u = a.imageUrl ?? a.image_url ?? (a.type === "image" ? a.url : undefined);
    if (u) return u;
  }
  return null;
}

function truncate(s: string, n: number): string {
  const collapsed = s.replace(/\s+/g, " ").trim();
  if (collapsed.length <= n) return collapsed;
  return collapsed.slice(0, n - 1).trimEnd() + "…";
}
