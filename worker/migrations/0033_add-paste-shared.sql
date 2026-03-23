ALTER TABLE paste ADD COLUMN shared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE paste ADD COLUMN shared_at INTEGER;
CREATE INDEX idx_paste_shared ON paste(shared, shared_at);
