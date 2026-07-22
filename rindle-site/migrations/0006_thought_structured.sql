-- Structured records extracted from thought bodies plus independently editable project tasks.
-- Network-derived fields are nullable projections: authoritative follow-up mutations populate them
-- only for the content revision they enriched.

CREATE TABLE task (
  id TEXT NOT NULL,
  thoughtId TEXT,
  projectId TEXT,
  title TEXT NOT NULL,
  description TEXT,
  createdAt REAL NOT NULL,
  completedAt REAL,
  deprioritizedAt REAL,
  position REAL,
  PRIMARY KEY (id)
);
CREATE INDEX task_by_thought ON task (thoughtId, createdAt, id);
CREATE INDEX task_by_project ON task (projectId, position, createdAt, id);

CREATE TABLE event (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  dateText TEXT NOT NULL,
  dateEpoch REAL NOT NULL,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX event_by_thought ON event (thoughtId, id);
CREATE INDEX event_by_date ON event (dateEpoch, id);

CREATE TABLE question (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  createdAt REAL NOT NULL,
  answeredAt REAL,
  PRIMARY KEY (id)
);
CREATE INDEX question_by_thought ON question (thoughtId, id);
CREATE INDEX question_by_answered ON question (answeredAt, createdAt DESC, id);

CREATE TABLE location (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  latitude REAL,
  longitude REAL,
  resolvedName TEXT,
  sourceRevision TEXT NOT NULL,
  resolutionRevision TEXT,
  resolutionStatus TEXT NOT NULL DEFAULT 'pending',
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX location_by_thought ON location (thoughtId, id);
CREATE INDEX location_by_status ON location (resolutionStatus, createdAt, id);

-- Movies and albums are normalized entities with explicit many-to-many mention rows, matching the
-- deduplicated final legacy model. Book extraction remains per-thought, matching its final semantics.
CREATE TABLE movie (
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  normalizedTitle TEXT NOT NULL,
  description TEXT,
  posterUrl TEXT,
  year TEXT,
  tmdbId REAL,
  voteAverage REAL,
  voteCount REAL,
  metadataStatus TEXT NOT NULL DEFAULT 'pending',
  metadataProjectionVersion TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX movie_normalized_title ON movie (normalizedTitle);
CREATE INDEX movie_by_tmdb ON movie (tmdbId, id);

CREATE TABLE thoughtMovie (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  movieId TEXT NOT NULL,
  description TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX thought_movie_unique ON thoughtMovie (thoughtId, movieId);
CREATE INDEX thought_movie_by_thought ON thoughtMovie (thoughtId, id);
CREATE INDEX thought_movie_by_movie ON thoughtMovie (movieId, thoughtId, id);

CREATE TABLE book (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  coverUrl TEXT,
  author TEXT,
  year TEXT,
  openLibraryKey TEXT,
  metadataStatus TEXT NOT NULL DEFAULT 'pending',
  metadataProjectionVersion TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE INDEX book_by_thought ON book (thoughtId, id);
CREATE INDEX book_by_open_library ON book (openLibraryKey, id);

CREATE TABLE album (
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  normalizedTitle TEXT NOT NULL,
  artist TEXT,
  year TEXT,
  coverUrl TEXT,
  itunesId REAL,
  genre TEXT,
  metadataStatus TEXT NOT NULL DEFAULT 'pending',
  metadataProjectionVersion TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX album_normalized_title ON album (normalizedTitle);
CREATE INDEX album_by_itunes ON album (itunesId, id);

CREATE TABLE thoughtAlbum (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  albumId TEXT NOT NULL,
  description TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX thought_album_unique ON thoughtAlbum (thoughtId, albumId);
CREATE INDEX thought_album_by_thought ON thoughtAlbum (thoughtId, id);
CREATE INDEX thought_album_by_album ON thoughtAlbum (albumId, thoughtId, id);

CREATE TABLE bookmark (
  id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  imageUrl TEXT,
  description TEXT,
  siteName TEXT,
  metadataStatus TEXT NOT NULL DEFAULT 'pending',
  metadataProjectionVersion TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX bookmark_url ON bookmark (url);

CREATE TABLE thoughtBookmark (
  id TEXT NOT NULL,
  thoughtId TEXT NOT NULL,
  bookmarkId TEXT NOT NULL,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX thought_bookmark_unique ON thoughtBookmark (thoughtId, bookmarkId);
CREATE INDEX thought_bookmark_by_thought ON thoughtBookmark (thoughtId, id);
CREATE INDEX thought_bookmark_by_bookmark ON thoughtBookmark (bookmarkId, thoughtId, id);

CREATE TABLE amplification (
  id TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  title TEXT,
  imageUrl TEXT,
  description TEXT,
  siteName TEXT,
  metadataStatus TEXT NOT NULL DEFAULT 'pending',
  metadataProjectionVersion TEXT,
  createdAt REAL NOT NULL,
  PRIMARY KEY (id)
);
CREATE UNIQUE INDEX amplification_url ON amplification (url);
CREATE INDEX amplification_by_source ON amplification (source, createdAt DESC, id);
CREATE INDEX amplification_by_created ON amplification (createdAt DESC, id);
