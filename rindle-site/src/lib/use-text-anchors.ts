import { useEffect, useRef, useState, type RefObject } from "react";

import { collectText, locateAnchor, rangeFromOffsets, type TextAnchor, type TextMap } from "./text-anchor.ts";

export interface LocatedAnchor {
  start: number;
  end: number;
  range: Range;
}

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}
type HighlightConstructor = new (...ranges: Range[]) => unknown;

function highlightApi(): { registry: HighlightRegistry; Highlight: HighlightConstructor } | null {
  const registry = (globalThis.CSS as { highlights?: HighlightRegistry } | undefined)?.highlights;
  const Highlight = (globalThis as { Highlight?: HighlightConstructor }).Highlight;
  return registry && Highlight ? { registry, Highlight } : null;
}

export const HIGHLIGHT_ANCHORED = "paste-comment";
export const HIGHLIGHT_ACTIVE = "paste-comment-active";

/** Resolve each anchor against the container's current text and paint them with the CSS Custom
 *  Highlight API. Painting never touches the DOM, so the rendered body (owned by React and by the
 *  Mermaid effect) stays exactly as they left it; when either rewrites it, the anchors re-resolve.
 *  `activeId` (or a `draft` range not yet saved) is painted more strongly. */
export function useTextAnchors(
  rootRef: RefObject<HTMLElement | null>,
  anchors: ReadonlyArray<{ id: string; anchor: TextAnchor }>,
  activeId: string | null,
  draft: Range | null,
): { located: ReadonlyMap<string, LocatedAnchor>; textMap: RefObject<TextMap | null> } {
  const [located, setLocated] = useState<ReadonlyMap<string, LocatedAnchor>>(() => new Map());
  const textMap = useRef<TextMap | null>(null);
  const anchorsRef = useRef(anchors);
  anchorsRef.current = anchors;
  const anchorsKey = anchors.map(({ id }) => id).join(",");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const resolve = () => {
      frame = 0;
      const map = collectText(root);
      textMap.current = map;
      const next = new Map<string, LocatedAnchor>();
      for (const { id, anchor } of anchorsRef.current) {
        const at = locateAnchor(map.text, anchor);
        const range = at && rangeFromOffsets(map, at.start, at.end);
        if (at && range) next.set(id, { ...at, range });
      }
      setLocated(next);
    };
    resolve();
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(resolve);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootRef, anchorsKey]);

  useEffect(() => {
    const api = highlightApi();
    if (!api) return;
    const quiet: Range[] = [];
    const loud: Range[] = draft ? [draft] : [];
    for (const [id, { range }] of located) (id === activeId ? loud : quiet).push(range);
    api.registry.set(HIGHLIGHT_ANCHORED, new api.Highlight(...quiet));
    api.registry.set(HIGHLIGHT_ACTIVE, new api.Highlight(...loud));
    return () => {
      api.registry.delete(HIGHLIGHT_ANCHORED);
      api.registry.delete(HIGHLIGHT_ACTIVE);
    };
  }, [located, activeId, draft]);

  return { located, textMap };
}
