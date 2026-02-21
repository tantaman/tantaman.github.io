CREATE TABLE comment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  parent_id INTEGER REFERENCES comment(id) ON DELETE CASCADE
);

CREATE INDEX idx_comment_post_slug ON comment(post_slug);
CREATE INDEX idx_comment_parent_id ON comment(parent_id);
