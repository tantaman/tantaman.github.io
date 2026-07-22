// Server-only compatibility endpoints for the paste app. Raw and JSX/TSX module reads resolve the
// same registered named query as the SPA; no route reaches into D1 or accepts a client-supplied AST.

import type { ApiContext } from "@rindle/api-server";
import { transform } from "sucrase";

import { createAppApi, httpErrorOf, resolveRindle, type User } from "./app-api.ts";

interface PasteReadRow {
  id: string;
  body: string;
  language: string;
}

async function readPaste(id: string, request: Request): Promise<PasteReadRow | null> {
  const api = createAppApi(resolveRindle(process.env));
  const context: ApiContext<User> = { user: undefined, request };
  try {
    const result = await api.handleReadJson({ name: "paste", args: id }, context);
    const cols = result.rows[0]?.cols;
    if (!cols || typeof cols.id !== "string" || typeof cols.body !== "string" || typeof cols.language !== "string") {
      return null;
    }
    return { id: cols.id, body: cols.body, language: cols.language };
  } finally {
    api.close();
  }
}

function rewriteBareImports(code: string): string {
  return code.replace(
    /((?:import|export)\s[^'"]*?from\s+['"])([^'".\/][^'"]*?)(['"])/g,
    (match, before: string, specifier: string, after: string) => {
      if (specifier.startsWith("http://") || specifier.startsWith("https://")) return match;
      return `${before}https://esm.sh/${specifier}${after}`;
    },
  );
}

function compilePasteModule(source: string, language: "jsx" | "tsx"): string {
  const transforms: Array<"jsx" | "typescript"> = language === "tsx" ? ["jsx", "typescript"] : ["jsx"];
  const { code } = transform(source, {
    transforms,
    jsxRuntime: "automatic",
    jsxImportSource: "https://esm.sh/react",
    production: true,
  });
  return rewriteBareImports(code);
}

export async function handlePasteRaw(request: Request, id: string): Promise<Response> {
  try {
    const paste = await readPaste(id, request);
    if (!paste) return new Response("Not found", { status: 404 });
    return new Response(paste.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    const { status, message } = httpErrorOf(error);
    return new Response(message, { status });
  }
}

export async function handlePasteModule(request: Request, id: string): Promise<Response> {
  try {
    const paste = await readPaste(id, request);
    if (!paste || (paste.language !== "jsx" && paste.language !== "tsx")) {
      return new Response("Not found", { status: 404 });
    }
    let module: string;
    try {
      module = compilePasteModule(paste.body, paste.language);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Compilation failed.";
      module = `throw new Error(${JSON.stringify(`Compile error: ${message}`)});`;
    }
    return new Response(module, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    const { status, message } = httpErrorOf(error);
    return new Response(`throw new Error(${JSON.stringify(message)});`, {
      status,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
}
