CREATE TABLE notification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commenter_id INTEGER NOT NULL REFERENCES commenter(id),
  comment_id INTEGER NOT NULL REFERENCES comment(id),
  slug TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_notification_commenter ON notification(commenter_id, read, created_at DESC);
