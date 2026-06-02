-- Stable-row thought versioning.
--
-- Replaces the old self-referential chain model (version_of -> root,
-- superseded_by -> next) with a stable row whose id never changes across edits.
-- Superseded bodies are snapshotted into thought_history by a trigger fired on
-- every body change. To reconstruct version V: read `thought` if V is current,
-- otherwise read thought_history.
--
-- This migration is additive only. The one-time collapse of existing chains
-- into the new model lives in 0051. The legacy version_of / superseded_by
-- columns are left in place (NULL going forward) and can be dropped once the
-- new model is verified in production.

ALTER TABLE thought ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE thought ADD COLUMN updated_at INTEGER;

-- `timestamp` is the (now immutable) creation time. `updated_at` tracks the time
-- the current body was written; it starts equal to creation so that
-- "edited" == (updated_at > timestamp) and history version timestamps line up.
UPDATE thought SET updated_at = timestamp WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS thought_history (
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  version    INTEGER NOT NULL,
  body       TEXT NOT NULL,
  body_hash  TEXT,
  timestamp  INTEGER NOT NULL,   -- when this version became the current body
  created_at TEXT NOT NULL DEFAULT (datetime('now')),  -- when the snapshot was taken
  PRIMARY KEY (thought_id, version)
);

CREATE INDEX IF NOT EXISTS idx_thought_history_thought ON thought_history(thought_id);

-- Snapshot the prior body whenever a thought's body changes. The app bumps
-- thought.version and sets thought.updated_at in the same UPDATE; this captures
-- the OLD row at its OLD version number. `IS NOT` is the null-safe comparison.
CREATE TRIGGER IF NOT EXISTS thought_history_snapshot
AFTER UPDATE OF body ON thought
FOR EACH ROW
WHEN old.body IS NOT new.body
BEGIN
  INSERT INTO thought_history (thought_id, version, body, body_hash, timestamp, created_at)
  VALUES (old.id, old.version, old.body, old.body_hash, old.updated_at, datetime('now'));
END;
