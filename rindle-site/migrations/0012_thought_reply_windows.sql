-- Flat reply subscriptions assemble arbitrary-depth trees in the client. These indexes maintain
-- their oldest-first window boundaries without scanning the parent-grouped index on every write.
CREATE INDEX IF NOT EXISTS thought_reply_window ON thought (createdAt, id);
CREATE INDEX IF NOT EXISTS thought_public_reply_window ON thought (private, createdAt, id);
