-- Public, account-authored discussion attached to published posts. Replies point back into this
-- same table; deleting a comment tombstones it in place so its reply subtree stays readable.
CREATE TABLE IF NOT EXISTS postComment (
  id TEXT NOT NULL,
  postId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  authorName TEXT NOT NULL,
  parentId TEXT,
  body TEXT NOT NULL,
  createdAt REAL NOT NULL,
  deletedAt REAL,
  PRIMARY KEY (id)
);

-- Named subscriptions read a bounded, oldest-first post window. Parent lookup supports the
-- replay-safe reply guard without depending on insertion order.
CREATE INDEX IF NOT EXISTS post_comment_thread ON postComment (postId, createdAt, id);
CREATE INDEX IF NOT EXISTS post_comment_parent ON postComment (parentId, createdAt, id);
