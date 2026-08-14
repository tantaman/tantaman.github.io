-- Adopt the normalized name as every tag's identity.
--
-- The legacy D1 import (scripts/import-thoughts.mjs) carried each tag's NUMERIC legacy id into
-- `tag.id` while writing the lower-cased name into `normalizedName`. The app's identity convention
-- is `id == normalizedName` — createThought/editThought reject any other shape at the arg boundary
-- ("tagId must be the normalized tag name", shared/app-def.ts) and then write the tag with
-- `insertIgnore`.
--
-- Those two facts collide on every imported tag. `insertIgnore` renders
-- `INSERT ... ON CONFLICT (<primary key>) DO NOTHING`, which suppresses an `id` collision ONLY: a
-- new thought tagged `#m` inserts id 'm' — no primary-key conflict against the imported id '52' —
-- and trips the `tag_normalized_name` unique index instead. The daemon's constraint error is
-- classified as INFRA rather than a business rejection, so the mutation 500s, `lmid` never advances,
-- and the client's pending queue retries the same mid forever.
--
-- Every structured capture marker is an imported tag (#m #t #b #e #q #l #a), so this wedged every
-- movie, book, task, event, question, location, and album capture.
--
-- Repoint the junction rows first, then adopt the normalized name as the tag's identity. The remap
-- is injective (`normalizedName` is unique), so `thought_tag_unique` cannot gain a duplicate.

UPDATE thoughtTag
SET tagId = (SELECT t.normalizedName FROM tag t WHERE t.id = thoughtTag.tagId)
WHERE tagId IN (SELECT id FROM tag WHERE id <> normalizedName);

UPDATE tag SET id = normalizedName WHERE id <> normalizedName;
