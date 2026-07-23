import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";

import { currentQueryContext } from "../../rindle-client.ts";
import { ThoughtCard, type ThoughtCardData } from "../ThoughtCard.tsx";
import { thoughtQuery } from "../ThoughtCard.queries.ts";

export function FramingDetailPane({
  thoughtId,
  isAdmin,
  onClose,
}: {
  thoughtId: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [thought, { status }] = useRoot(thoughtQuery, thoughtId, currentQueryContext());

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <aside className="framing-detail-pane" aria-label="Thought detail">
      <div className="framing-detail-header">
        <Link to="/thoughts/$id" params={{ id: thoughtId }} className="framing-detail-open">Open thread ↗</Link>
        <button type="button" className="framing-detail-close" onClick={onClose} aria-label="Close detail pane">×</button>
      </div>
      <div className="framing-detail-body">
        {thought ? (
          <ThoughtCard thought={thought as ThoughtCardData} isAdmin={isAdmin} variant="parent" />
        ) : (
          <p className="framing-detail-status">{status === "complete" ? "Thought not found." : "Loading…"}</p>
        )}
      </div>
    </aside>
  );
}
