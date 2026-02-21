CREATE TABLE commenter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE email_verification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_email_verification_email ON email_verification(email);
CREATE INDEX idx_commenter_session ON commenter(session_token);

ALTER TABLE comment ADD COLUMN commenter_id INTEGER REFERENCES commenter(id);
