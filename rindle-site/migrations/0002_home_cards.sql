-- Metadata needed by the bounded home-card query. The source markdown remains authoritative; the
-- seed script derives these values deterministically on every import.
ALTER TABLE post ADD COLUMN cardImage TEXT;
ALTER TABLE post ADD COLUMN pinned REAL NOT NULL DEFAULT 0;
ALTER TABLE post ADD COLUMN readingMinutes REAL NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS post_home ON post (pinned DESC, publishedAt DESC, id);
