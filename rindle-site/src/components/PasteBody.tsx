import { useEffect, useMemo, useRef } from "react";

import { renderMarkdown } from "../lib/markdown.ts";
import type { PasteDetailRow } from "./Paste.queries.ts";

/** The fields a paste needs to render. A narrow view (a framing's full-size overlay) can pass a
 *  row from any query that selects them. */
export type PasteBodyRow = Pick<PasteDetailRow, "id" | "body" | "language" | "title">;

/** A paste's rendered body: markdown (with Mermaid diagrams), a sandboxed HTML or JSX/TSX runner,
 *  or highlighted source. Shared by the paste page and a framing's maximized paste. */
export function PasteBody({ paste }: { paste: PasteBodyRow }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const markdown = useMemo(() => {
    if (paste.language !== "markdown") return "";
    const withoutLeadingTitle = paste.body.trimStart().replace(/^#{1,6}\s+.+\r?\n?/, "");
    return renderMarkdown(withoutLeadingTitle);
  }, [paste.body, paste.language]);

  useEffect(() => {
    const content = contentRef.current;
    if (paste.language !== "markdown" || !content) return;

    // This effect is the only owner of the diagrams. React may re-apply the markdown HTML at any
    // time (a hydration mismatch elsewhere client-renders the whole tree), so every run starts from
    // the fenced blocks it finds and renders into containers it created itself.
    const diagrams = [...content.querySelectorAll<HTMLElement>("pre > code.language-mermaid")]
      .map((code) => {
        const container = document.createElement("div");
        container.className = "mermaid";
        container.dataset.source = code.textContent ?? "";
        container.textContent = container.dataset.source;
        code.parentElement?.replaceWith(container);
        return container;
      });
    if (diagrams.length === 0) return;

    // A theme flip re-renders while an earlier pass may still be in flight; only the latest pass
    // writes. Ids are unique per pass because Mermaid deletes any existing element with the id it
    // is about to render, and its default ids are timestamps that can collide.
    let generation = 0;
    const render = async () => {
      const pass = ++generation;
      const mermaidUrl = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      const { default: mermaid } = await import(/* @vite-ignore */ mermaidUrl);
      if (pass !== generation) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "default",
      });
      for (const [index, diagram] of diagrams.entries()) {
        const source = diagram.dataset.source ?? "";
        try {
          const { svg, bindFunctions } = await mermaid.render(`paste-mermaid-${pass}-${index}`, source);
          if (pass !== generation) return;
          diagram.innerHTML = svg;
          bindFunctions?.(diagram);
        } catch {
          if (pass !== generation) return;
          diagram.textContent = source;
        }
      }
    };

    const renderDiagrams = () => void render().catch(() => {});
    renderDiagrams();
    const themeObserver = new MutationObserver(renderDiagrams);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      generation = -1;
      themeObserver.disconnect();
    };
  }, [markdown, paste.language]);

  if (paste.language === "markdown") {
    return (
      <div
        ref={contentRef}
        className="paste-content thought-markdown"
        dangerouslySetInnerHTML={{ __html: markdown }}
      />
    );
  }

  if (paste.language === "html") {
    return (
      <iframe
        className="paste-runner"
        title={paste.title || "HTML paste"}
        srcDoc={paste.body}
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
      />
    );
  }

  if (paste.language === "jsx" || paste.language === "tsx") {
    const moduleUrl = `/paste/${encodeURIComponent(paste.id)}/module`;
    const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><pre id="error" style="white-space:pre-wrap"></pre><script type="module">try{const mod=await import(${JSON.stringify(moduleUrl)});if(mod.default&&typeof mod.default==='function'){const [{createRoot},{createElement}]=await Promise.all([import('https://esm.sh/react-dom/client'),import('https://esm.sh/react')]);createRoot(document.getElementById('root')).render(createElement(mod.default));}}catch(error){document.getElementById('error').textContent=error?.stack||String(error);}</script></body></html>`;
    return (
      <iframe
        className="paste-runner"
        title={paste.title || `${paste.language.toUpperCase()} paste`}
        srcDoc={srcDoc}
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
      />
    );
  }

  return (
    <pre className="paste-code"><code className={`language-${paste.language}`}>{paste.body}</code></pre>
  );
}
