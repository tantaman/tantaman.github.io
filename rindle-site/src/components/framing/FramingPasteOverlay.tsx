// A paste maximized over the canvas. A paste card on the canvas shows only its title and excerpt;
// this renders the whole thing — markdown and diagrams, a live HTML/JSX runner, or source — at full
// size without leaving the framing.

import { createContext, useContext, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { pasteDate } from "../../lib/paste.ts";
import { pasteQuery, type PasteDetailRow } from "../Paste.queries.ts";
import { PasteBody } from "../PasteBody.tsx";

/** Handed down by the canvas so a card node can ask to maximize its paste without the node rows
 *  carrying a callback. Absent (null) where no overlay is mounted, e.g. the board. */
export const MaximizePasteContext = createContext<((pasteId: string) => void) | null>(null);

export function useMaximizePaste() {
  return useContext(MaximizePasteContext);
}

export function FramingPasteOverlay({ pasteId, onClose }: { pasteId: string; onClose: () => void }) {
  const [paste, { status }] = useRoot(pasteQuery, pasteId);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const row = paste as PasteDetailRow | undefined;
  return (
    <div className="framing-paste-overlay" role="dialog" aria-modal="true" aria-label={row?.title || "Paste"}>
      <header className="framing-paste-overlay-header">
        <div>
          {row ? <p>{pasteDate(row.createdAt)} · {row.language}{row.shared === 1 ? "" : " · unlisted"}</p> : null}
          <h2>{row?.title || "Untitled"}</h2>
        </div>
        <Link to="/paste/$id" params={{ id: pasteId }} className="framing-detail-open">Open paste ↗</Link>
        <button type="button" className="framing-detail-close" onClick={onClose} aria-label="Close paste">×</button>
      </header>
      <div className="framing-paste-overlay-body">
        {row
          ? <PasteBody paste={row} />
          : <p className="framing-detail-status">{status === "complete" ? "Paste not found." : "Loading…"}</p>}
      </div>
    </div>
  );
}
