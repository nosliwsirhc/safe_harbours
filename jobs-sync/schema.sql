-- Public job board state. Contains ONLY the gated, override-resolved public
-- projection of a SharePoint Job Posting. No internal HR columns, no PII.
-- The public careers board reads this; only the jobs-sync worker writes it.

CREATE TABLE IF NOT EXISTS postings (
  -- SharePoint list item Id — the stable match key (present before a PostingID
  -- has been assigned/written back).
  sp_item_id         INTEGER PRIMARY KEY,
  -- Public id / URL slug: <DEPT>-<YYYYMMDD>-<seq4>, e.g. RES-20260603-0001.
  -- Owned by the worker (derived, then written back to SharePoint).
  posting_id         TEXT NOT NULL UNIQUE,
  -- The full normalized public payload (see src/types.ts PublicPosting) as JSON.
  data               TEXT NOT NULL,
  -- Indexed scalars pulled out of `data` for cheap filtering/ordering + the sweep.
  title              TEXT NOT NULL,
  program_department TEXT,
  region             TEXT,
  closing_date       TEXT NOT NULL,        -- YYYY-MM-DD (calendar date)
  open_date          TEXT,                 -- YYYY-MM-DD
  published_at       TEXT,                 -- ISO datetime
  updated_at         TEXT NOT NULL         -- ISO datetime of last projection write
);

CREATE INDEX IF NOT EXISTS idx_postings_closing ON postings(closing_date);
CREATE INDEX IF NOT EXISTS idx_postings_dept ON postings(program_department);

-- Small key/value for sync bookkeeping: last_sync, source_hash, version
-- (bumped when the visible set changes — used as the public board's cache key).
CREATE TABLE IF NOT EXISTS sync_meta (
  k TEXT PRIMARY KEY,
  v TEXT
);
