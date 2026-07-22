-- The IVM window boundary is maintained by its root total order, independently of the equality
-- predicate's per-post index. Keep that boundary re-fetch indexed as comments enter the window.
CREATE INDEX IF NOT EXISTS post_comment_window ON postComment (createdAt, id);
