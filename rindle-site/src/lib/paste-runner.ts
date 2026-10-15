/** Shared HTML shell for embedded and standalone JSX/TSX artifacts. */
export function pasteJsxDocument(pasteId: string, contentRevision = ""): string {
  const moduleUrl = `/paste/${encodeURIComponent(pasteId)}/module?v=${encodeURIComponent(contentRevision)}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><pre id="error" style="white-space:pre-wrap"></pre><script type="module">try{const mod=await import(${JSON.stringify(moduleUrl)});if(mod.default&&typeof mod.default==='function'){const [{createRoot},{createElement}]=await Promise.all([import('https://esm.sh/react-dom/client'),import('https://esm.sh/react')]);createRoot(document.getElementById('root')).render(createElement(mod.default));}}catch(error){document.getElementById('error').textContent=error?.stack||String(error);}</script></body></html>`;
}
