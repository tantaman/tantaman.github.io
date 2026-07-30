// The shortcut listener stays in the root bundle; the palette and its search/query graph are fetched
// only after the first Mod+K. Keeping the lazy boundary here makes the loading behavior explicit even
// though the standalone /search route is independently split by TanStack Start.

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

const SearchPalette = lazy(() => import("./SearchPalette.tsx"));

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key === "Escape" && open && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }

      if (
        event.defaultPrevented
        || event.isComposing
        || event.key.toLowerCase() !== "k"
        || (!event.metaKey && !event.ctrlKey)
        || event.altKey
        || event.shiftKey
      ) return;

      event.preventDefault();
      event.stopPropagation();

      if (open) {
        const input = document.querySelector<HTMLInputElement>("#site-search-palette-input");
        input?.focus();
        input?.select();
        return;
      }

      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    }

    // Capture first so editors cannot consume Mod+K before the global site shortcut sees it.
    window.addEventListener("keydown", handleShortcut, { capture: true });
    return () => window.removeEventListener("keydown", handleShortcut, { capture: true });
  }, [close, open]);

  if (!open) return null;
  return (
    <Suspense fallback={<SearchPaletteFallback />}>
      <SearchPalette onClose={close} />
    </Suspense>
  );
}

function SearchPaletteFallback() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "min(14vh, 112px) 18px 24px",
        background: "color-mix(in srgb, var(--ink) 34%, transparent)",
        backdropFilter: "blur(5px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Loading search"
        style={{
          display: "flex",
          width: "min(680px, 100%)",
          minHeight: 64,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          border: "1px solid var(--line-2)",
          borderRadius: 14,
          background: "var(--raise)",
          color: "var(--ink-3)",
          boxShadow: "0 28px 90px color-mix(in srgb, var(--ink) 30%, transparent)",
        }}
      >
        <span aria-hidden="true" style={{ color: "var(--accent)", fontSize: 22 }}>⌕</span>
        <p style={{ margin: 0, fontSize: 13 }}>Opening search…</p>
      </section>
    </div>
  );
}
