ALTER TABLE thought ADD COLUMN parent_id INTEGER REFERENCES thought(id) ON DELETE CASCADE;
CREATE INDEX idx_thought_parent ON thought(parent_id);
