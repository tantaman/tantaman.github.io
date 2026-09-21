-- A framing is a set of items plus an arrangement of them. The canvas arrangement is spatial (x/y
-- and drawn edges); a board arrangement is a sequence. Both describe the same membership rows, so
-- the board is a second VIEW over `framingNode` rather than a second table -- which is what makes
-- promoting a quick pile into a drawn canvas a view flip instead of an export and re-import.

-- A fractional index: dropping an item between two neighbours takes the midpoint, so a reorder
-- writes one row. Renumbering siblings instead would dirty every row of every subscribed window on
-- each drag.
ALTER TABLE framingNode ADD COLUMN position REAL NOT NULL DEFAULT 0;

-- Nodes that predate the board all tie at 0, and `(position, id)` is still a total order, so an
-- existing framing opens as a board in stable creation order rather than an arbitrary one.
CREATE INDEX framing_node_by_board ON framingNode (framingId, position, id);

-- Which view a framing opens in. Every framing that predates the board keeps opening on the canvas
-- it was drawn on.
ALTER TABLE framing ADD COLUMN defaultView TEXT NOT NULL DEFAULT 'canvas';
