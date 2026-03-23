ALTER TABLE paste ADD COLUMN parent_id TEXT REFERENCES paste(id);
CREATE INDEX idx_paste_parent_id ON paste(parent_id);
