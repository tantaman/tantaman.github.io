-- Albums (music). Designed dedup-from-day-one like post-0038 movies:
-- albums are persistent and many-to-many with thoughts via thought_album.

CREATE TABLE album (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  artist TEXT,
  year TEXT,
  cover_url TEXT,
  itunes_id INTEGER,
  genre TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_album_normalized_title ON album(normalized_title);
CREATE INDEX idx_album_itunes_id ON album(itunes_id);

CREATE TABLE thought_album (
  thought_id INTEGER NOT NULL REFERENCES thought(id) ON DELETE CASCADE,
  album_id INTEGER NOT NULL REFERENCES album(id) ON DELETE CASCADE,
  description TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (thought_id, album_id)
);
CREATE INDEX idx_thought_album_album ON thought_album(album_id);
