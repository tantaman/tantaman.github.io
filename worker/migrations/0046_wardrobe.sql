-- Wardrobe curation tables. Single-user for now; user_id reserved
-- as a column so multi-user can be added without a schema change.

CREATE TABLE wardrobe_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'me',
  name TEXT,
  brand TEXT,
  notes TEXT NOT NULL DEFAULT '',
  facets TEXT NOT NULL DEFAULT '{}',          -- JSON: { category, sleeve, season, ... }
  links TEXT NOT NULL DEFAULT '[]',           -- JSON: [{ url, title, image, price_cents }]
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'candidate',   -- candidate | shortlist | keep | own | cut
  rating INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_wardrobe_item_status ON wardrobe_item(user_id, status);
CREATE INDEX idx_wardrobe_item_updated ON wardrobe_item(user_id, updated_at DESC);

CREATE TABLE wardrobe_photo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  attachment_key TEXT NOT NULL,
  attachment_type TEXT NOT NULL,
  attachment_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES wardrobe_item(id) ON DELETE CASCADE
);

CREATE INDEX idx_wardrobe_photo_item ON wardrobe_photo(item_id, position);

CREATE TABLE wardrobe_facet_schema (
  user_id TEXT NOT NULL DEFAULT 'me',
  schema TEXT NOT NULL,                       -- JSON: [{ key, label, options: [{value, label}] }]
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id)
);

CREATE TABLE wardrobe_target (
  user_id TEXT NOT NULL DEFAULT 'me',
  category TEXT NOT NULL,
  min_count INTEGER NOT NULL,
  max_count INTEGER NOT NULL,
  PRIMARY KEY (user_id, category)
);

-- Seed default facet schema and targets for the primary user.
INSERT INTO wardrobe_facet_schema (user_id, schema, updated_at) VALUES (
  'me',
  '[
    {"key":"category","label":"Category","options":[
      {"value":"shirt","label":"Shirt"},
      {"value":"tee","label":"T-Shirt"},
      {"value":"pants","label":"Pants"},
      {"value":"shorts","label":"Shorts"},
      {"value":"jacket","label":"Jacket"},
      {"value":"sweater","label":"Sweater"},
      {"value":"shoes","label":"Shoes"},
      {"value":"accessory","label":"Accessory"}
    ]},
    {"key":"style","label":"Style","options":[
      {"value":"casual","label":"Casual"},
      {"value":"smart-casual","label":"Smart casual"},
      {"value":"formal","label":"Formal"},
      {"value":"athletic","label":"Athletic"}
    ]},
    {"key":"sleeve","label":"Sleeve","options":[
      {"value":"short","label":"Short"},
      {"value":"long","label":"Long"},
      {"value":"sleeveless","label":"Sleeveless"}
    ]},
    {"key":"season","label":"Season","options":[
      {"value":"summer","label":"Summer"},
      {"value":"winter","label":"Winter"},
      {"value":"transitional","label":"Transitional"},
      {"value":"all-season","label":"All-season"}
    ]},
    {"key":"fit","label":"Fit","options":[
      {"value":"slim","label":"Slim"},
      {"value":"regular","label":"Regular"},
      {"value":"relaxed","label":"Relaxed"},
      {"value":"oversized","label":"Oversized"}
    ]},
    {"key":"color","label":"Color","options":[
      {"value":"white","label":"White"},
      {"value":"cream","label":"Cream"},
      {"value":"grey","label":"Grey"},
      {"value":"navy","label":"Navy"},
      {"value":"black","label":"Black"},
      {"value":"brown","label":"Brown"},
      {"value":"olive","label":"Olive"},
      {"value":"earth","label":"Earth"},
      {"value":"blue","label":"Blue"}
    ]}
  ]',
  strftime('%s', 'now')
);

INSERT INTO wardrobe_target (user_id, category, min_count, max_count) VALUES
  ('me', 'shirt', 6, 10),
  ('me', 'pants', 2, 3),
  ('me', 'shorts', 2, 3);
