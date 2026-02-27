ALTER TABLE thought ADD COLUMN version_of INTEGER REFERENCES thought(id);
ALTER TABLE thought ADD COLUMN superseded_by INTEGER REFERENCES thought(id);
CREATE INDEX idx_thought_version_of ON thought(version_of);
CREATE INDEX idx_thought_superseded_by ON thought(superseded_by) WHERE superseded_by IS NOT NULL;
