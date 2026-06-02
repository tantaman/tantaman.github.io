-- One-time collapse of existing version chains into the stable-row model (0050).
--
-- Survivor of each chain = the current latest row (superseded_by IS NULL); this
-- is the id already in circulation (feed/share links all show the latest), so
-- collapsing onto it preserves live URLs and keeps its embedding (already the
-- latest body) valid. Dead members (superseded_by IS NOT NULL) are snapshotted
-- into thought_history, have their inbound references re-pointed to the survivor,
-- and are then deleted. Stale Vectorize vectors for the dead ids are removed
-- separately by scripts/collapse-thought-vectors.mjs.
--
-- No-op safe: on a database with no chains the map is empty and every statement
-- below touches zero rows.

-- Map each dead member -> its surviving row, carrying the dead body + its
-- position in the chain (root = version 1).
CREATE TABLE _chain_map AS
SELECT
  d.id        AS old_id,
  s.id        AS new_id,
  d.body      AS body,
  d.body_hash AS body_hash,
  d.timestamp AS timestamp,
  ROW_NUMBER() OVER (PARTITION BY COALESCE(d.version_of, d.id) ORDER BY d.id) AS version
FROM thought d
JOIN thought s
  ON COALESCE(s.version_of, s.id) = COALESCE(d.version_of, d.id)
 AND s.superseded_by IS NULL
WHERE d.superseded_by IS NOT NULL;

-- 1) Snapshot every superseded body into history.
INSERT OR IGNORE INTO thought_history (thought_id, version, body, body_hash, timestamp, created_at)
SELECT new_id, version, body, body_hash, timestamp, datetime('now') FROM _chain_map;

-- 2) Fix survivor metadata: version count, restore original creation time, drop
--    the now-defunct chain pointers. updated_at (set to the survivor's own
--    timestamp by 0050) is left as the last-edit time.
UPDATE thought
SET version = 1 + (SELECT COUNT(*) FROM _chain_map m WHERE m.new_id = thought.id),
    timestamp = (SELECT MIN(m.timestamp) FROM _chain_map m WHERE m.new_id = thought.id),
    version_of = NULL,
    superseded_by = NULL
WHERE id IN (SELECT DISTINCT new_id FROM _chain_map);

-- 3) Re-point structural references from dead members to their survivor.
-- Replies (and any thought whose parent_id pointed at a dead version).
UPDATE thought
SET parent_id = (SELECT new_id FROM _chain_map WHERE old_id = thought.parent_id)
WHERE parent_id IN (SELECT old_id FROM _chain_map);

-- Attachments move to the survivor (restores images dropped by the old
-- new-row-per-edit behavior).
UPDATE thought_attachment
SET thought_id = (SELECT new_id FROM _chain_map WHERE old_id = thought_attachment.thought_id)
WHERE thought_id IN (SELECT old_id FROM _chain_map);

-- Thought-to-thought links (both endpoints). OR IGNORE drops rows that would
-- collide with an existing edge; leftovers pointing at dead ids are cascaded
-- away when the dead rows are deleted in step 6.
UPDATE OR IGNORE thought_edge
SET source_id = (SELECT new_id FROM _chain_map WHERE old_id = thought_edge.source_id)
WHERE source_id IN (SELECT old_id FROM _chain_map);
UPDATE OR IGNORE thought_edge
SET target_id = (SELECT new_id FROM _chain_map WHERE old_id = thought_edge.target_id)
WHERE target_id IN (SELECT old_id FROM _chain_map);
DELETE FROM thought_edge WHERE source_id = target_id;

-- Framing canvas nodes (item_id is TEXT). Re-point, then drop any leftover
-- duplicates that couldn't be re-pointed (item_id is not an FK, so these would
-- otherwise dangle after the dead rows are deleted).
UPDATE OR IGNORE framing_node
SET item_id = CAST((SELECT new_id FROM _chain_map WHERE old_id = CAST(framing_node.item_id AS INTEGER)) AS TEXT)
WHERE node_type = 'thought' AND CAST(item_id AS INTEGER) IN (SELECT old_id FROM _chain_map);
DELETE FROM framing_node
WHERE node_type = 'thought' AND CAST(item_id AS INTEGER) IN (SELECT old_id FROM _chain_map);

-- 4) Drop the dead members' structured extractions; the survivor's own set
--    (re-extracted on every old edit) is canonical.
DELETE FROM thought_tag      WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM task             WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM event            WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM location         WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM question         WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM book             WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM thought_movie    WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM thought_album    WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM thought_bookmark WHERE thought_id IN (SELECT old_id FROM _chain_map);
DELETE FROM cluster_membership WHERE item_kind = 'thought' AND item_id IN (SELECT CAST(old_id AS TEXT) FROM _chain_map);

-- 5) Delete the dead rows. ON DELETE CASCADE sweeps any remaining child rows
--    that still reference them (e.g. collision-skipped thought_edge rows).
DELETE FROM thought WHERE id IN (SELECT old_id FROM _chain_map);

-- 6) Garbage-collect tags orphaned by the extraction deletes.
DELETE FROM tag WHERE id NOT IN (SELECT DISTINCT tag_id FROM thought_tag);

DROP TABLE _chain_map;
