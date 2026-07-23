import { useMemo, useRef } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { authClient } from "../auth-client.ts";
import { pasteQuery, type PasteDetailRow } from "../components/Paste.queries.ts";
import { renderMarkdown } from "../lib/markdown.ts";
import { pasteDate } from "../lib/paste.ts";
import { app } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";
import { useHydrated } from "../lib/hydration.ts";

export const Route = createFileRoute("/paste/$id/")({
  loader: rindle.loader({ ssr: ({ params }) => pasteQuery(params.id) }),
  component: PasteDetail,
});

function PasteDetail() {
  const { id } = Route.useParams();
  const [paste, { status }] = useRoot(pasteQuery, id);
  const renderedRef = useRef({ id, paste });
  if (renderedRef.current.id !== id || paste || status === "complete") renderedRef.current = { id, paste };
  const rendered = renderedRef.current.paste;

  if (!rendered) {
    return (
      <section className="paste-missing">
        <h1>{status === "complete" ? "Paste not found." : "Loading paste…"}</h1>
        <Link to="/paste">← Back to paste</Link>
      </section>
    );
  }
  return <PasteDocument paste={rendered} />;
}

function PasteDocument({ paste }: { paste: PasteDetailRow }) {
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  const isAdmin = hydrated && session?.user.role === "admin";
  const title = paste.title || "Untitled";
  const parent = paste.parent[0] ?? null;

  function toggleShared() {
    const shared = paste.shared === 1 ? 0 : 1;
    app.mutate.setPasteShared({
      id: paste.id,
      shared,
      sharedAt: shared === 1 ? Date.now() : null,
    });
  }

  return (
    <article className="paste-document">
      <header className="paste-document-header">
        <div>
          <p>{pasteDate(paste.createdAt)} · {paste.language}{paste.shared === 1 ? " · shared" : ""}</p>
          <h1>{title}</h1>
        </div>
        <PasteActions paste={paste} isAdmin={isAdmin} onToggleShared={toggleShared} />
      </header>

      {parent || paste.children.length > 0 ? (
        <nav className="paste-revisions" aria-label="Paste revisions">
          {parent ? (
            <span>
              from <Link to="/paste/$id" params={{ id: parent.id }}>{parent.title || "Untitled"}</Link>
            </span>
          ) : null}
          {paste.children.length > 0 ? (
            <span>
              forks: {paste.children.map((child, index) => (
                <span key={child.id}>
                  {index > 0 ? ", " : ""}
                  <Link to="/paste/$id" params={{ id: child.id }}>{child.title || "Untitled"}</Link>
                </span>
              ))}
            </span>
          ) : null}
        </nav>
      ) : null}

      <div className="paste-rule" />
      <PasteBody paste={paste} />
      <footer className="paste-document-footer">
        <PasteActions paste={paste} isAdmin={isAdmin} onToggleShared={toggleShared} />
      </footer>
    </article>
  );
}

function PasteActions({
  paste,
  isAdmin,
  onToggleShared,
}: {
  paste: PasteDetailRow;
  isAdmin: boolean;
  onToggleShared: () => void;
}) {
  return (
    <div className="paste-actions">
      <a href={`/paste/${encodeURIComponent(paste.id)}/raw`}>raw</a>
      <Link to="/paste/fork/$id" params={{ id: paste.id }}>fork</Link>
      {paste.parentId ? <Link to="/paste/$id/diff" params={{ id: paste.id }}>diff</Link> : null}
      {isAdmin ? <button type="button" onClick={onToggleShared}>{paste.shared === 1 ? "unshare" : "share"}</button> : null}
    </div>
  );
}

function PasteBody({ paste }: { paste: PasteDetailRow }) {
  const markdown = useMemo(() => {
    if (paste.language !== "markdown") return "";
    const withoutLeadingTitle = paste.body.trimStart().replace(/^#{1,6}\s+.+\r?\n?/, "");
    return renderMarkdown(withoutLeadingTitle);
  }, [paste.body, paste.language]);

  if (paste.language === "markdown") {
    return <div className="paste-content thought-markdown" dangerouslySetInnerHTML={{ __html: markdown }} />;
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
