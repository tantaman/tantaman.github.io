ALTER TABLE thought ADD COLUMN body_hash TEXT;
CREATE INDEX idx_thought_body_hash ON thought(body_hash);
