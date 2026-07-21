-- The short, poster-like statement used by the three featured home cards. The legacy importer
-- sources it from .meme-cache.json; live-authored posts can populate it directly later.
ALTER TABLE post ADD COLUMN thesis TEXT;
