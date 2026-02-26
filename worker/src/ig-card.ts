import { Hono } from "hono";
import type { Env } from "./index";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
// @ts-expect-error -- WASM module import handled by wrangler bundler
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

const SITE_URL = "https://tantaman.com";
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const MANIFEST_KV_KEY = "ig-card:posts-manifest";
const FONT_KV_KEY = "font:inter-bold";
const MANIFEST_TTL = 3600;
const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@700";

type ManifestEntry = {
  slug: string;
  title: string;
  thesis: string | null;
  image: string | null;
  color: string | null;
};

let wasmInitialized = false;

async function ensureWasm() {
  if (!wasmInitialized) {
    await initWasm(resvgWasm);
    wasmInitialized = true;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(
      String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunkSize) as unknown as number[],
      ),
    );
  }
  return btoa(chunks.join(""));
}

async function loadFont(kv: KVNamespace): Promise<ArrayBuffer> {
  const cached = await kv.get(FONT_KV_KEY, "arrayBuffer");
  if (cached) return cached;

  // Fetch Google Fonts CSS with a User-Agent that returns .ttf format
  const css = await fetch(FONT_CSS_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  }).then((r) => r.text());

  const urlMatch = css.match(/src:\s*url\(([^)]+)\)/);
  if (!urlMatch) throw new Error("Could not parse font URL from Google Fonts");

  const fontData = await fetch(urlMatch[1]).then((r) => r.arrayBuffer());
  await kv.put(FONT_KV_KEY, fontData, {
    expirationTtl: 60 * 60 * 24 * 365,
  });
  return fontData;
}

async function fetchManifest(kv: KVNamespace, bypassCache = false): Promise<ManifestEntry[]> {
  if (!bypassCache) {
    const cached = await kv.get(MANIFEST_KV_KEY, "json");
    if (cached) return cached as ManifestEntry[];
  }

  const resp = await fetch(`${SITE_URL}/posts-manifest.json`);
  if (!resp.ok) throw new Error(`Failed to fetch manifest: ${resp.status}`);
  const data = (await resp.json()) as ManifestEntry[];
  await kv.put(MANIFEST_KV_KEY, JSON.stringify(data), {
    expirationTtl: MANIFEST_TTL,
  });
  return data;
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TantamanBot/1.0)",
      },
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "image/png";
    if (contentType.includes("webp") || contentType.includes("svg"))
      return null;
    const buffer = await resp.arrayBuffer();
    // Skip images > 2MB to avoid memory issues
    if (buffer.byteLength > 2 * 1024 * 1024) return null;
    return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
  } catch {
    return null;
  }
}

// Simple React-compatible element builder for satori (no JSX needed)
function h(
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): unknown {
  const flat = children.flat().filter((c) => c != null);
  return {
    type,
    props: {
      ...(props || {}),
      children:
        flat.length === 1 ? flat[0] : flat.length === 0 ? undefined : flat,
    },
  };
}

function buildCard(
  entry: ManifestEntry,
  bgDataUri: string | null,
): unknown {
  const thesis = entry.thesis || entry.title;
  const showTitle = !!entry.thesis;
  const thesisSize = thesis.length > 120 ? 56 : thesis.length > 80 ? 64 : 72;

  const background = bgDataUri
    ? h("img", {
        src: bgDataUri,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          objectFit: "cover",
        },
      })
    : h("div", {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)",
        },
      });

  const overlay = h("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
  });

  const contentChildren: unknown[] = [
    h(
      "div",
      {
        style: {
          fontSize: thesisSize,
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: "90%",
        },
      },
      thesis,
    ),
  ];

  if (showTitle) {
    contentChildren.push(
      h("div", {
        style: {
          width: 200,
          height: 2,
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          marginTop: 48,
          marginBottom: 48,
        },
      }),
    );
    contentChildren.push(
      h(
        "div",
        {
          style: {
            fontSize: 36,
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            maxWidth: "85%",
            lineHeight: 1.4,
          },
        },
        entry.title,
      ),
    );
  }

  const content = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        width: "100%",
        height: "100%",
        padding: "80px 60px",
      },
    },
    ...contentChildren,
  );

  const attribution = h(
    "div",
    {
      style: {
        position: "absolute",
        bottom: 80,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        fontSize: 28,
        color: "rgba(255, 255, 255, 0.5)",
      },
    },
    "tantaman.com",
  );

  return h(
    "div",
    {
      style: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: "flex",
        position: "relative",
        backgroundColor: "#1a1a2e",
      },
    },
    background,
    overlay,
    content,
    attribution,
  );
}

export const igCard = new Hono<{ Bindings: Env }>();

igCard.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const r2Key = `ig-cards/${slug}.png`;

  // Check R2 cache
  const cached = await c.env.BUCKET.get(r2Key);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Fetch manifest and find post (retry with fresh manifest on cache miss)
  let manifest = await fetchManifest(c.env.EMBEDDINGS);
  let entry = manifest.find((p) => p.slug === slug);
  if (!entry) {
    manifest = await fetchManifest(c.env.EMBEDDINGS, true);
    entry = manifest.find((p) => p.slug === slug);
  }
  if (!entry) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (!entry.thesis) {
    return c.json({ error: "Post has no thesis — card cannot be generated" }, 404);
  }

  // Fetch background image if available
  let bgDataUri: string | null = null;
  if (entry.image) {
    const imageUrl = entry.image.startsWith("http")
      ? entry.image
      : `${SITE_URL}${entry.image}`;
    bgDataUri = await fetchImageAsDataUri(imageUrl);
  }

  // Load font
  const fontData = await loadFont(c.env.EMBEDDINGS);

  // Render SVG via satori
  const element = buildCard(entry, bgDataUri);
  const svg = await satori(element as React.ReactNode, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: [
      {
        name: "Inter",
        data: fontData,
        weight: 700 as const,
        style: "normal" as const,
      },
    ],
  });

  // Convert SVG to PNG via resvg-wasm
  await ensureWasm();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
  });
  const pngData = resvg.render().asPng();

  // Store in R2
  await c.env.BUCKET.put(r2Key, pngData, {
    httpMetadata: { contentType: "image/png" },
  });

  return new Response(pngData, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
