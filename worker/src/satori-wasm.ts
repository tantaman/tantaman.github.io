import { init as initSatori } from "satori/standalone";
// @ts-expect-error -- WASM module import handled by wrangler bundler
import yogaWasm from "satori/yoga.wasm";
import { initWasm } from "@resvg/resvg-wasm";
// @ts-expect-error -- WASM module import handled by wrangler bundler
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

const FONT_KV_KEY = "font:inter-bold";
const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@700";

let wasmInitialized = false;

export async function ensureWasm(): Promise<void> {
  if (wasmInitialized) return;
  await initSatori(yogaWasm);
  await initWasm(resvgWasm);
  wasmInitialized = true;
}

export async function loadInterBold(kv: KVNamespace): Promise<ArrayBuffer> {
  const cached = await kv.get(FONT_KV_KEY, "arrayBuffer");
  if (cached) return cached;

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
