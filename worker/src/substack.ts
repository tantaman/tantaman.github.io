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
 * Fetches Substack Note (comment) metadata via the reader API.
 * Returns OG-shaped data for the caller to persist in the same columns as regular OG fetches.
 * Handles:
 *  - c-{id} URLs → /api/v1/reader/comment/{id} — returns the note body + author
 *  - p-{id} URLs → let the caller fall through to OG fetch (those redirect to the SSR'd post page)
 */
export async function fetchSubstackNoteMetadata(
  url: string,
): Promise<OgMetadata | null> {
  const parsed = parseSubstackNoteId(url);
  if (!parsed || parsed.kind !== "c") return null;

  try {
    const res = await fetch(
      `https://substack.com/api/v1/reader/comment/${parsed.id}`,
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
