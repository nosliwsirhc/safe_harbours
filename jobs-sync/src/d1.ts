// D1 access for the public job board. The worker is the only writer.
import type { PublicPosting } from './types';

export async function upsertPostings(db: D1Database, postings: PublicPosting[]): Promise<void> {
  if (!postings.length) return;
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO postings
       (sp_item_id, posting_id, data, title, program_department, region, closing_date, open_date, published_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(sp_item_id) DO UPDATE SET
       posting_id=excluded.posting_id, data=excluded.data, title=excluded.title,
       program_department=excluded.program_department, region=excluded.region,
       closing_date=excluded.closing_date, open_date=excluded.open_date,
       published_at=excluded.published_at, updated_at=excluded.updated_at`,
  );
  await db.batch(
    postings.map((p) =>
      stmt.bind(
        p.spItemId, p.postingId, JSON.stringify(p), p.title, p.programDepartment, p.region,
        p.closingDate, p.openDate, p.publishedAt, now,
      ),
    ),
  );
}

/** Delete any D1 rows whose sp_item_id is not in the current published set. */
export async function deleteExcept(db: D1Database, keepSpItemIds: number[]): Promise<number> {
  if (!keepSpItemIds.length) {
    const r = await db.prepare('DELETE FROM postings').run();
    return r.meta.changes ?? 0;
  }
  const placeholders = keepSpItemIds.map(() => '?').join(',');
  const r = await db.prepare(`DELETE FROM postings WHERE sp_item_id NOT IN (${placeholders})`).bind(...keepSpItemIds).run();
  return r.meta.changes ?? 0;
}

/** Cheap, SharePoint-independent backstop: drop rows past their closing date. */
export async function deleteExpired(db: D1Database, today: string): Promise<number> {
  const r = await db.prepare('DELETE FROM postings WHERE closing_date < ?').bind(today).run();
  return r.meta.changes ?? 0;
}

export async function setMeta(db: D1Database, k: string, v: string): Promise<void> {
  await db.prepare('INSERT INTO sync_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(k, v).run();
}

export async function getMeta(db: D1Database, k: string): Promise<string | null> {
  const row = await db.prepare('SELECT v FROM sync_meta WHERE k = ?').bind(k).first<{ v: string }>();
  return row?.v ?? null;
}
