export interface OgMetadata {
  title: string | null;
  imageUrl: string | null;
  description: string | null;
  siteName: string | null;
  priceCents?: number | null;
  priceCurrency?: string | null;
}

export async function fetchOgMetadata(
  url: string,
): Promise<OgMetadata | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Twitterbot/1.0",
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

    const ogTitle =
      extractMeta(html, "og:title") ??
      extractNameMeta(html, "twitter:title") ??
      extractTitle(html);
    const ogImage =
      extractMeta(html, "og:image") ?? extractNameMeta(html, "twitter:image");
    const ogDesc =
      extractMeta(html, "og:description") ??
      extractNameMeta(html, "twitter:description") ??
      extractNameMeta(html, "description");
    const ogSiteName = extractMeta(html, "og:site_name");

    // Product price — try OG product tags, then schema.org/JSON-LD price fields.
    // Conservative: only return if we can confidently parse a number.
    const priceRaw =
      extractMeta(html, "product:price:amount") ??
      extractMeta(html, "og:price:amount") ??
      extractItemPropContent(html, "price") ??
      extractJsonLdPrice(html);
    const currencyRaw =
      extractMeta(html, "product:price:currency") ??
      extractMeta(html, "og:price:currency") ??
      extractItemPropContent(html, "priceCurrency");

    let priceCents: number | null = null;
    if (priceRaw) {
      // Strip currency symbols and thousands separators; allow comma decimal.
      const cleaned = priceRaw.replace(/[^\d.,-]/g, "").replace(/,(\d{2})$/, ".$1").replace(/,/g, "");
      const n = parseFloat(cleaned);
      if (Number.isFinite(n) && n > 0 && n < 1_000_000) {
        priceCents = Math.round(n * 100);
      }
    }

    if (!ogImage && !ogDesc && !ogTitle && !ogSiteName && priceCents == null) return null;

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
      priceCents,
      priceCurrency: currencyRaw,
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

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]{1,400})<\/title>/i);
  if (!m) return null;
  return decodeEntities(m[1].trim()) || null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract content from <... itemprop="..." content="..."> or text node */
function extractItemPropContent(html: string, prop: string): string | null {
  const re1 = new RegExp(
    `<[^>]*itemprop=["']${escapeRegex(prop)}["'][^>]*content=["']([^"']+?)["']`,
    "i",
  );
  const m1 = html.match(re1);
  if (m1) return m1[1];
  const re2 = new RegExp(
    `<[^>]*itemprop=["']${escapeRegex(prop)}["'][^>]*>([^<]{1,40})<`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? m2[1].trim() : null;
}

/** Best-effort JSON-LD price extraction (Product / Offer schema). */
function extractJsonLdPrice(html: string): string | null {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1].trim());
      const price = findPrice(data);
      if (price) return price;
    } catch {
      // skip malformed blocks
    }
  }
  return null;
}

function findPrice(node: unknown): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const p = findPrice(item);
      if (p) return p;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  if (obj.price != null) {
    const v = obj.price;
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  if (obj.offers) {
    const p = findPrice(obj.offers);
    if (p) return p;
  }
  // Walk one level for nested products
  for (const v of Object.values(obj)) {
    if (typeof v === "object" && v !== null) {
      const p = findPrice(v);
      if (p) return p;
    }
  }
  return null;
}
