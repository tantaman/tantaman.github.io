-- 0002_posts — the blog post table (static markdown posts ported from ../content/*.md).
--
-- Additive DDL: this is the SINGLE SOURCE OF TRUTH for the post schema. `rindle up --migrate --gen`
-- (and `pnpm dev`) applies it to the daemon and regenerates shared/schema.gen.ts, so the @rindle/client
-- TypeScript can't drift from this DDL.
--
-- A post is a rendered static markdown file: frontmatter → the scalar/array columns, the markdown body
-- → both `body` (the source, kept in the DB) and `html` (pre-rendered at seed time — MDX/live rendering
-- come later). Array frontmatter (tags/concern/author) is stored as a JSON STRING in a TEXT column
-- (parsed in app code) rather than a JSON column, keeping this first port off the less-exercised json()
-- read path. Column ORDER matters — the IVM engine reads it back with PRAGMA table_info.
--
-- Columns:
--   id          slug = URL path segment (frontmatter `slug` override, else filename sans date/ext)
--   title       post title
--   date        ISO date (YYYY-MM-DD) from filename or frontmatter; NULL when undated
--   publishedAt epoch ms derived from `date` (0 when undated) — the total order the index uses
--   description meta description (may be empty)
--   tags        JSON-encoded string[]
--   concern     JSON-encoded string[]
--   author      JSON-encoded string[]
--   form        essay | story | chat | interactive | meditation | prophecy (nullable)
--   kind        original | survey (nullable)
--   image       hero/card image path (nullable)
--   html        rendered article HTML (pre-rendered at seed time)
--   body        raw markdown source (kept so posts can be re-rendered later)
CREATE TABLE IF NOT EXISTS post (id TEXT NOT NULL, title TEXT NOT NULL, date TEXT, publishedAt REAL NOT NULL, description TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', concern TEXT NOT NULL DEFAULT '[]', author TEXT NOT NULL DEFAULT '[]', form TEXT, kind TEXT, image TEXT, html TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY (id));

-- The blog index orders newest-first over the whole table; the reverse tiebreak keeps it a total order.
CREATE INDEX IF NOT EXISTS post_published ON post (publishedAt DESC, id);
