-- Standalone migration for the DB-driven campaign / landing pages feature.
-- Apply to LOCAL D1:   npx wrangler d1 execute safeharbours-jobs --local  --file=db/pages-schema.sql
-- Apply to REMOTE D1:  npx wrangler d1 execute safeharbours-jobs --remote --file=db/pages-schema.sql
-- (The same table also lives in db/content-schema.sql so a fresh DB gets it.)

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
