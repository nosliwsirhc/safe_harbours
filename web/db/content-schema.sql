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

-- Resource articles. One row per (slug, state): a published row is live, a draft
-- row is in-progress editing (same draft/published model as content_blocks).
-- Authored from /admin/articles; read by /resources + /resources/[slug] in SSR.
CREATE TABLE IF NOT EXISTS articles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'published', -- 'published' (live) | 'draft' (editing)
  title       TEXT NOT NULL DEFAULT '',
  hero_image  TEXT NOT NULL DEFAULT '',
  thumbnail   TEXT NOT NULL DEFAULT '',
  excerpt     TEXT NOT NULL DEFAULT '',
  author      TEXT NOT NULL DEFAULT 'Safe Harbours',
  date        TEXT NOT NULL DEFAULT '',           -- ISO date (yyyy-mm-dd)
  category    TEXT NOT NULL DEFAULT '',
  related     TEXT NOT NULL DEFAULT '[]',         -- JSON array of slugs
  index_order INTEGER,                            -- position on /resources (null = off-index)
  featured    INTEGER NOT NULL DEFAULT 0,         -- 0/1: the index "Featured Post"
  body        TEXT NOT NULL DEFAULT '',           -- article HTML
  updated_at  TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_state ON articles(slug, state);
CREATE INDEX IF NOT EXISTS idx_articles_state ON articles(state, index_order);

-- DB-driven campaign / landing pages. Same draft/published model as articles:
-- one row per (slug, state). The whole page lives in the row — `blocks` is a JSON
-- array of {kind, body} rendered through the existing block engine (BlockRenderer)
-- by the catch-all route src/pages/[...slug].astro. Authored from /admin/pages.
-- New pages default to noindex + out-of-nav so a half-built campaign page can't
-- leak into search or the site nav before it's ready.
CREATE TABLE IF NOT EXISTS pages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'published',  -- 'published' (live) | 'draft' (editing)
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  blocks      TEXT NOT NULL DEFAULT '[]',         -- JSON array of {kind, body}
  noindex     INTEGER NOT NULL DEFAULT 1,         -- 1 = emit <meta robots noindex>
  in_nav      INTEGER NOT NULL DEFAULT 0,         -- 1 = eligible for site nav (not wired yet)
  updated_at  TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug_state ON pages(slug, state);
CREATE INDEX IF NOT EXISTS idx_pages_state ON pages(state);

-- DB-driven redirects, applied in the middleware before the cache lookup so a
-- retired/moved URL 301s straight from the edge. `from_path` is a normalised
-- same-origin path (leading slash, no trailing slash); `to_path` is validated
-- same-origin at write time (NOT via lib/sanitize.sanitizeUrl, which allows any
-- external host → open redirect). Cycles are rejected at write time.
CREATE TABLE IF NOT EXISTS redirects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_path  TEXT NOT NULL UNIQUE,
  to_path    TEXT NOT NULL,
  status     INTEGER NOT NULL DEFAULT 301,  -- 301 (permanent) | 302 (temporary)
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_redirects_from ON redirects(from_path);

-- Seed the known setting keys (empty = not configured). Page content is seeded
-- separately from the current site copy — run db/seed-hero.sql and
-- db/seed-zigzag.sql after this schema.
INSERT OR IGNORE INTO settings (k, v) VALUES ('ga4_id', ''), ('gtm_id', ''), ('marketing_pixels', '{}'), ('form_conversions', '{}');
