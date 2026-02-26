CREATE TABLE commenter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE otp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_otp_email ON otp(email);

CREATE TABLE comment_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  commenter_id INTEGER NOT NULL REFERENCES commenter(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_comment_session_token ON comment_session(token);

CREATE TABLE comment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  commenter_id INTEGER NOT NULL REFERENCES commenter(id),
  parent_id INTEGER REFERENCES comment(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_comment_slug ON comment(slug);
CREATE INDEX idx_comment_parent ON comment(parent_id);

CREATE TABLE post_like (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(slug, visitor_id)
);
CREATE INDEX idx_post_like_slug ON post_like(slug);
