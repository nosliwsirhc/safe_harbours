// Reads/writes DB-driven campaign / landing pages from D1 (binding: DB). Same
// draft/published model as lib/articles.ts: one row per (slug, state). The public
// catch-all route src/pages/[...slug].astro reads 'published'; the admin writes/
// reads 'draft'; Publish copies draft → published. Every read is wrapped so a
// page can never 500 — on any error it falls back to null/empty, like lib/jobs.ts.
import { env } from 'cloudflare:workers';

export type State = 'draft' | 'published';

/** One composer block, stored as {kind, body} where body is per-kind JSON. */
export interface PageBlock {
  kind: string;
  body: string;
}

export interface Page {
  slug: string;
  title: string;
  description: string;
  blocks: PageBlock[];
  noindex: boolean;
  inNav: boolean;
}

/** A compact row for the admin list (one entry per page, with its status). */
export interface AdminPage {
  slug: string;
  title: string;
  published: boolean;
  hasDraft: boolean;
  noindex: boolean;
  inNav: boolean;
}

interface Row {
  slug: string;
  title: string;
  description: string;
  blocks: string;
  noindex: number;
  in_nav: number;
}

function db(): D1Database | null {
  const d = (env as unknown as { DB?: D1Database }).DB;
  return d ?? null;
}

const COLS = 'slug, title, description, blocks, noindex, in_nav';

function parseBlocks(s: string): PageBlock[] {
  try {
    const p: unknown = JSON.parse(s);
    if (!Array.isArray(p)) return [];
    return p
      .filter((b): b is { kind?: unknown; body?: unknown } => typeof b === 'object' && b !== null)
      .map((b) => ({ kind: typeof b.kind === 'string' ? b.kind : 'text', body: typeof b.body === 'string' ? b.body : '' }));
  } catch {
    return [];
  }
}

function toPage(r: Row): Page {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    blocks: parseBlocks(r.blocks),
    noindex: r.noindex === 1,
    inNav: r.in_nav === 1,
  };
}

export async function getPage(slug: string, state: State = 'published'): Promise<Page | null> {
  const d = db();
  if (!d) return null;
  try {
    const r = await d.prepare(`SELECT ${COLS} FROM pages WHERE slug = ? AND state = ?`).bind(slug, state).first<Row>();
    return r ? toPage(r) : null;
  } catch {
    return null;
  }
}

// --- Isolate-global published-lookup cache -------------------------------------
// The catch-all route runs for EVERY unmatched URL — including bot/404 traffic.
// Without a cache that's a D1 read per 404. We memoise the published lookup (slug
// → Page | null, INCLUDING misses) per isolate for a short TTL, mirroring the
// edge-cache window. A publish/delete clears the entry in the isolate that served
// it; other isolates self-heal within the TTL (same staleness model as the edge
// cache). Date.now() is fine here — this is Worker code, not a workflow script.
interface CacheEntry {
  page: Page | null;
  exp: number;
}
const PAGE_TTL_MS = 60_000;
const lookupCache = new Map<string, CacheEntry>();

/** Published page for the public catch-all, memoised per isolate (~60s, incl. misses). */
export async function getPublishedPageCached(slug: string): Promise<Page | null> {
  const now = Date.now();
  const hit = lookupCache.get(slug);
  if (hit && hit.exp > now) return hit.page;
  const page = await getPage(slug, 'published');
  lookupCache.set(slug, { page, exp: now + PAGE_TTL_MS });
  return page;
}

/** Drop a slug from the isolate lookup cache (call after a publish/delete). */
export function invalidatePageCache(slug: string): void {
  lookupCache.delete(slug);
}

/** Draft if previewing and one exists, else published. (Never uses the cache.) */
export async function getPageForView(slug: string, preview: boolean): Promise<Page | null> {
  if (preview) {
    const draft = await getPage(slug, 'draft');
    if (draft) return draft;
  }
  return getPage(slug, 'published');
}

/** One entry per page for the admin list, with status flags. */
export async function listAdminPages(): Promise<AdminPage[]> {
  const d = db();
  if (!d) return [];
  try {
    const { results } = await d
      .prepare('SELECT slug, state, title, noindex, in_nav FROM pages ORDER BY state DESC')
      .all<{ slug: string; state: string; title: string; noindex: number; in_nav: number }>();
    const map = new Map<string, AdminPage>();
    for (const r of results) {
      const cur: AdminPage = map.get(r.slug) ?? { slug: r.slug, title: '', published: false, hasDraft: false, noindex: true, inNav: false };
      if (r.state === 'published') cur.published = true;
      if (r.state === 'draft') cur.hasDraft = true;
      cur.title = r.title;
      cur.noindex = r.noindex === 1;
      cur.inNav = r.in_nav === 1;
      map.set(r.slug, cur);
    }
    return [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  } catch {
    return [];
  }
}

async function upsert(state: State, p: Page): Promise<void> {
  const d = db();
  if (!d) return;
  await d
    .prepare(
      `INSERT INTO pages (slug, state, title, description, blocks, noindex, in_nav, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug, state) DO UPDATE SET
         title = excluded.title, description = excluded.description, blocks = excluded.blocks,
         noindex = excluded.noindex, in_nav = excluded.in_nav, updated_at = excluded.updated_at`,
    )
    .bind(p.slug, state, p.title, p.description, JSON.stringify(p.blocks), p.noindex ? 1 : 0, p.inNav ? 1 : 0, new Date().toISOString())
    .run();
}

/** Save the editing draft for a page (creates it if new). */
export async function savePageDraft(p: Page): Promise<void> {
  await upsert('draft', p);
}

/** Promote the draft to published. Caller flushes the edge cache + invalidates the lookup cache. */
export async function publishPage(slug: string): Promise<void> {
  const draft = await getPage(slug, 'draft');
  if (!draft) return;
  await upsert('published', draft);
  invalidatePageCache(slug);
}

/** Remove a page entirely (both states). */
export async function deletePage(slug: string): Promise<void> {
  const d = db();
  if (!d) return;
  try {
    await d.prepare('DELETE FROM pages WHERE slug = ?').bind(slug).run();
    invalidatePageCache(slug);
  } catch {
    /* ignore */
  }
}

/** True if the draft differs from the published version (there's something to publish). */
export async function hasUnpublishedChanges(slug: string): Promise<boolean> {
  const [draft, published] = await Promise.all([getPage(slug, 'draft'), getPage(slug, 'published')]);
  if (!draft) return false;
  const norm = (p: Page | null) => (p ? JSON.stringify([p.title, p.description, p.blocks, p.noindex, p.inNav]) : '');
  return norm(draft) !== norm(published);
}

/** A slug not yet used by any page (appends -2, -3, … on collision). */
export async function uniquePageSlug(base: string): Promise<string> {
  const d = db();
  if (!d) return base;
  let slug = base;
  let n = 2;
  for (;;) {
    const hit = await d.prepare('SELECT 1 FROM pages WHERE slug = ? LIMIT 1').bind(slug).first();
    if (!hit) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}
