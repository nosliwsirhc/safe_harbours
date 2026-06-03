// PostingID ownership: <DEPT>-<YYYYMMDD>-<seq4> (e.g. RES-20260603-0001).
// HR leaves PostingID blank; the worker derives a stable id and writes it back to
// SharePoint (validateUpdateListItem). Uniqueness is owned here (the D1 row), so the
// SharePoint column is intentionally not unique. Once set, the id is stable.
import type { Env } from './types';
import { setItemFields, text } from './sp';
import { todayInOrg } from './project';

const DEPT_CODES: Record<string, string> = {
  Residential: 'RES',
  Clinical: 'CLI',
  Administration: 'ADM',
  'Relief-Casual': 'REL',
  'Relief/Casual': 'REL',
  'Foster Care': 'FOS',
};

function deptCode(programDepartment: string | null): string {
  if (!programDepartment) return 'GEN';
  return DEPT_CODES[programDepartment] ?? (programDepartment.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN');
}

/** YYYYMMDD from the posting's OpenDate, else today in the org timezone. */
function ymd(openDateIso: any, env: Env): string {
  const d = openDateIso ? new Date(openDateIso) : null;
  const iso = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : todayInOrg(env);
  return iso.replace(/-/g, '');
}

/** Allocates the next per-prefix sequence, seeded from existing D1 ids, monotonic within a run. */
export class IdAllocator {
  private next = new Map<string, number>();
  constructor(private db: D1Database) {}

  async reserve(prefix: string): Promise<number> {
    if (!this.next.has(prefix)) {
      const rows = await this.db
        .prepare('SELECT posting_id FROM postings WHERE posting_id LIKE ?')
        .bind(prefix + '%')
        .all<{ posting_id: string }>();
      let max = 0;
      for (const r of rows.results ?? []) {
        const n = parseInt(r.posting_id.slice(prefix.length), 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
      this.next.set(prefix, max);
    }
    const seq = this.next.get(prefix)! + 1;
    this.next.set(prefix, seq);
    return seq;
  }
}

/** Existing PostingID if SharePoint already has one; otherwise derive, write back, and return it. */
export async function resolvePostingId(env: Env, alloc: IdAllocator, raw: Record<string, any>): Promise<string> {
  const existing = text(raw.PostingID);
  if (existing) return existing;

  const prefix = `${deptCode(text(raw.ProgramDepartment))}-${ymd(raw.OpenDate, env)}-`;
  const seq = await alloc.reserve(prefix);
  const id = `${prefix}${String(seq).padStart(4, '0')}`;

  // Write it back so it's stable and HR can see it. If the write fails, still use the
  // id for this projection (next run re-derives the same prefix; the seq could drift,
  // so a failed write is logged by the caller).
  await setItemFields(env, env.POSTINGS_LIST, Number(raw.Id), [{ FieldName: 'PostingID', FieldValue: id }]);
  return id;
}
