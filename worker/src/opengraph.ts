export interface OgMetadata {
  title: string | null;
  imageUrl: string | null;
  description: string | null;
  siteName: string | null;
}

export async function fetchOgMetadata(
  url: string,
): Promise<OgMetadata | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Tantamanlands/1.0; +https://tantaman.com)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    // Read only the first ~50KB — OG tags live in <head>
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const MAX_BYTES = 50_000;
    while (totalBytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }
    reader.cancel().catch(() => {});

    const html = new TextDecoder().decode(
      chunks.length === 1
        ? chunks[0]
        : concatUint8Arrays(chunks, totalBytes),
    );

    const ogTitle = extractMeta(html, "og:title");
    const ogImage = extractMeta(html, "og:image");
    const ogDesc =
      extractMeta(html, "og:description") ?? extractNameMeta(html, "description");
    const ogSiteName = extractMeta(html, "og:site_name");

    if (!ogImage && !ogDesc && !ogTitle && !ogSiteName) return null;

    // Resolve relative og:image URLs
    let resolvedImage = ogImage;
    if (resolvedImage && !/^https?:\/\//i.test(resolvedImage)) {
      try {
        resolvedImage = new URL(resolvedImage, url).href;
      } catch {
        // leave as-is if URL parsing fails
      }
    }

    return {
      title: ogTitle,
      imageUrl: resolvedImage,
      description: ogDesc,
      siteName: ogSiteName,
    };
  } catch {
    return null;
  }
}

function concatUint8Arrays(
  arrays: Uint8Array[],
  totalLength: number,
): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/** Extract content from <meta property="..." content="..."> */
function extractMeta(html: string, property: string): string | null {
  // Match both property="..." content="..." and content="..." property="..."
  const re = new RegExp(
    `<meta\\s+[^>]*(?:property=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*?)["']|content=["']([^"']*?)["'][^>]*property=["']${escapeRegex(property)}["'])`,
    "i",
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

/** Extract content from <meta name="..." content="..."> */
function extractNameMeta(html: string, name: string): string | null {
  const re = new RegExp(
    `<meta\\s+[^>]*(?:name=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*?)["']|content=["']([^"']*?)["'][^>]*name=["']${escapeRegex(name)}["'])`,
    "i",
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
