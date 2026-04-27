import satori from "satori/standalone";
import { Resvg } from "@resvg/resvg-wasm";
import { ensureWasm, loadInterBold } from "./satori-wasm.js";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

const CODE_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "python",
  "rust",
  "html",
  "css",
  "json",
  "sql",
  "plaintext",
]);

const LANGUAGE_LABELS: Record<string, string> = {
  markdown: "markdown",
  plaintext: "plain text",
  javascript: "javascript",
  typescript: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  python: "python",
  rust: "rust",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
};

function hashId(id: string): number {
  // djb2
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function paletteForId(id: string): { from: string; to: string; accent: string } {
  const h = hashId(id);
  const hueA = h % 360;
  const hueB = (hueA + 40 + ((h >>> 8) % 80)) % 360;
  const from = `hsl(${hueA}, 65%, 22%)`;
  const to = `hsl(${hueB}, 60%, 12%)`;
  const accent = `hsl(${hueA}, 70%, 70%)`;
  return { from, to, accent };
}

function buildSnippet(body: string, title: string | null, language: string): string[] {
  const lines = body.split("\n");
  const out: string[] = [];
  let skippedTitle = false;
  const titleNorm = (title ?? "").trim();

  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ").trimEnd();
    if (!line.trim()) continue;

    if (!skippedTitle) {
      // Skip leading markdown heading or a line that matches the extracted title
      if (language === "markdown" && /^#{1,6}\s+/.test(line)) {
        skippedTitle = true;
        continue;
      }
      if (titleNorm && line.trim() === titleNorm) {
        skippedTitle = true;
        continue;
      }
      skippedTitle = true;
    }

    const truncated = line.length > 70 ? line.slice(0, 67) + "…" : line;
    out.push(truncated);
    if (out.length >= 3) break;
  }
  return out;
}

function truncateTitle(title: string): { text: string; size: number } {
  const t = title.length > 100 ? title.slice(0, 97) + "…" : title;
  const size = t.length > 70 ? 44 : t.length > 40 ? 56 : 72;
  return { text: t, size };
}

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

function buildCard(args: {
  id: string;
  title: string;
  language: string;
  snippet: string[];
}): unknown {
  const { from, to, accent } = paletteForId(args.id);
  const isCode = CODE_LANGUAGES.has(args.language);
  const langLabel = LANGUAGE_LABELS[args.language] ?? args.language;
  const { text: titleText, size: titleSize } = truncateTitle(args.title);
  const monoFamily =
    "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

  const background = h("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    },
  });

  const langPill = h(
    "div",
    {
      style: {
        position: "absolute",
        top: 56,
        left: 64,
        padding: "10px 22px",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.10)",
        color: accent,
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: "0.04em",
        display: "flex",
      },
    },
    `# ${langLabel}`,
  );

  const titleEl = h(
    "div",
    {
      style: {
        fontSize: titleSize,
        fontWeight: 700,
        color: "white",
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
        marginBottom: 28,
      },
    },
    titleText,
  );

  const snippetEl = args.snippet.length
    ? h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            fontFamily: isCode ? monoFamily : "Inter, system-ui, sans-serif",
            fontSize: isCode ? 24 : 26,
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.5,
            whiteSpace: "pre",
          },
        },
        ...args.snippet.map((line) =>
          h(
            "div",
            { style: { display: "flex", whiteSpace: "pre" } },
            line || " ",
          ),
        ),
      )
    : null;

  const content = h(
    "div",
    {
      style: {
        position: "absolute",
        top: 150,
        left: 64,
        right: 64,
        bottom: 110,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      },
    },
    titleEl,
    snippetEl,
  );

  const footer = h(
    "div",
    {
      style: {
        position: "absolute",
        bottom: 48,
        left: 64,
        right: 64,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 22,
        color: "rgba(255,255,255,0.55)",
        letterSpacing: "0.05em",
      },
    },
    h("div", { style: { display: "flex" } }, "tantaman.com"),
    h("div", { style: { display: "flex" } }, `paste · ${args.id}`),
  );

  return h(
    "div",
    {
      style: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        position: "relative",
        display: "flex",
        backgroundColor: to,
        fontFamily: "Inter, system-ui, sans-serif",
      },
    },
    background,
    langPill,
    content,
    footer,
  );
}

export async function renderPasteCard(
  kv: KVNamespace,
  args: {
    id: string;
    title: string | null;
    language: string;
    body: string;
  },
): Promise<Uint8Array> {
  await ensureWasm();
  const fontData = await loadInterBold(kv);

  const snippet = buildSnippet(args.body, args.title, args.language);
  const element = buildCard({
    id: args.id,
    title: args.title?.trim() || "Untitled paste",
    language: args.language,
    snippet,
  });

  const svg = await satori(element as Parameters<typeof satori>[0], {
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

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
  });
  return resvg.render().asPng();
}
