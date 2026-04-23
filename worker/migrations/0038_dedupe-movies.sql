-- Dedup movies by normalized title.
-- Movies become persistent independent of any single thought; links live in thought_movie.

CREATE TABLE thought_movie (
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
  description TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (thought_id, movie_id)
);
CREATE INDEX idx_thought_movie_movie ON thought_movie(movie_id);

-- Seed join table from existing movie.thought_id (each movie currently has exactly one)
INSERT INTO thought_movie (thought_id, movie_id, description, created_at)
SELECT thought_id, id, description, created_at FROM movie;

-- Rebuild movie table: drop thought_id FK (no more CASCADE from thought), add normalized_title
CREATE TABLE movie_new (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  year TEXT,
  tmdb_id INTEGER,
  vote_average REAL,
  vote_count INTEGER,
  created_at INTEGER NOT NULL
);

INSERT INTO movie_new (id, title, normalized_title, description, poster_url, year, tmdb_id, vote_average, vote_count, created_at)
SELECT id, title, LOWER(TRIM(title)), description, poster_url, year, tmdb_id, vote_average, vote_count, created_at
FROM movie;

DROP TABLE movie;
ALTER TABLE movie_new RENAME TO movie;
CREATE INDEX idx_movie_normalized_title ON movie(normalized_title);

-- Auto-merge duplicates by normalized_title, keeping the oldest (lowest id) as canonical.
-- Repoint thought_movie of duplicates to the canonical. OR IGNORE drops rows that would collide
-- with an existing (thought_id, canonical_id) pair.
UPDATE OR IGNORE thought_movie
SET movie_id = (
  SELECT MIN(id) FROM movie
  WHERE normalized_title = (SELECT normalized_title FROM movie WHERE id = thought_movie.movie_id)
)
WHERE movie_id != (
  SELECT MIN(id) FROM movie
  WHERE normalized_title = (SELECT normalized_title FROM movie WHERE id = thought_movie.movie_id)
);

-- Remove any leftover links to duplicates (canonical already claimed that thought).
DELETE FROM thought_movie
WHERE movie_id NOT IN (SELECT MIN(id) FROM movie GROUP BY normalized_title);

-- Delete the duplicate movie rows.
DELETE FROM movie
WHERE id NOT IN (SELECT MIN(id) FROM movie GROUP BY normalized_title);
