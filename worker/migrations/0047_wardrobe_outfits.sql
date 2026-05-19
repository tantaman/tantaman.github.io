CREATE TABLE wardrobe_outfit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'me',
  name TEXT NOT NULL,
  occasion TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_wardrobe_outfit_updated ON wardrobe_outfit(user_id, updated_at DESC);

CREATE TABLE wardrobe_outfit_item (
  outfit_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (outfit_id, item_id),
  FOREIGN KEY (outfit_id) REFERENCES wardrobe_outfit(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES wardrobe_item(id) ON DELETE CASCADE
);

CREATE INDEX idx_wardrobe_outfit_item_item ON wardrobe_outfit_item(item_id);
