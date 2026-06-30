-- Standalone migration for DB-driven redirects.
-- Apply to LOCAL D1:   npx wrangler d1 execute safeharbours-jobs --local  --file=db/redirects-schema.sql
-- Apply to REMOTE D1:  npx wrangler d1 execute safeharbours-jobs --remote --file=db/redirects-schema.sql
-- (The same table also lives in db/content-schema.sql so a fresh DB gets it.)

CREATE TABLE IF NOT EXISTS redirects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_path  TEXT NOT NULL UNIQUE,
  to_path    TEXT NOT NULL,
  status     INTEGER NOT NULL DEFAULT 301,  -- 301 (permanent) | 302 (temporary)
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_redirects_from ON redirects(from_path);
