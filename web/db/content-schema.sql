-- Lightweight CMS storage for the editable-content spike. Lives in the SAME D1
-- the careers board uses (binding: DB). The public site READS these tables in
-- SSR; only the /admin routes WRITE them. Mirrors the jobs-sync schema style:
-- a small key/value table + one indexed content table.

-- Site-wide key/value settings (Google tag ids, etc.). Edited in /admin.
CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL DEFAULT ''
);

-- Editable content blocks, grouped by (page, slot) and ordered by `position`.
-- `kind` selects how the block renders: heading | text | html.
CREATE TABLE IF NOT EXISTS content_blocks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  page       TEXT NOT NULL,                 -- e.g. "our-story"
  slot       TEXT NOT NULL,                 -- e.g. "top"
  kind       TEXT NOT NULL DEFAULT 'text',  -- heading | text | html | hero | zigzag
  body       TEXT NOT NULL DEFAULT '',
  position   INTEGER NOT NULL DEFAULT 0,
  state      TEXT NOT NULL DEFAULT 'published', -- 'published' (live) | 'draft' (editing)
  updated_at TEXT NOT NULL DEFAULT ''       -- ISO datetime of last write
);

CREATE INDEX IF NOT EXISTS idx_blocks_slot ON content_blocks(page, slot, state, position);

-- Seed the known setting keys (empty = not configured). Page content is seeded
-- separately from the current site copy — run db/seed-hero.sql and
-- db/seed-zigzag.sql after this schema.
INSERT OR IGNORE INTO settings (k, v) VALUES ('ga4_id', ''), ('gtm_id', '');
