-- An inline paste comment is a root comment anchored to a span of the paste's rendered text. Pastes
-- are immutable (an edit is a fork), so the anchor never drifts; it is still stored as a W3C-style
-- text-quote selector (quote + surrounding context + an offset hint) rather than a bare offset, so
-- a change in how a body renders (Mermaid, a markdown upgrade) re-finds the quote instead of
-- highlighting the wrong words. Replies hang off the root through parentId and carry no anchor.
ALTER TABLE pasteComment ADD COLUMN anchorQuote TEXT;
ALTER TABLE pasteComment ADD COLUMN anchorPrefix TEXT;
ALTER TABLE pasteComment ADD COLUMN anchorSuffix TEXT;
ALTER TABLE pasteComment ADD COLUMN anchorStart INTEGER;
