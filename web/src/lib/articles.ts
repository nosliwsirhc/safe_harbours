// Reads/writes resource articles from D1 (binding: DB). Same draft/published
// model as lib/content.ts: one row per (slug, state). The public /resources
// pages read 'published'; the admin writes/reads 'draft' and Publish copies
// draft → published. Every read is wrapped so a page can never 500.
import { env } from 'cloudflare:workers';

export type State = 'draft' | 'published';

export interface Article {
  slug: string;
  title: string;
  heroImage: string;
  thumbnail: string;
  excerpt: string;
  author: string;
  date: Date;
  category: string;
  related: string[];
  indexOrder: number | null;
  featured: boolean;
  body: string;
}

/** A compact row for the admin list (one entry per article, with its status). */
export interface AdminArticle {
  slug: string;
  title: string;
  date: Date;
  category: string;
  published: boolean;
  hasDraft: boolean;
}

interface Row {
  slug: string;
  title: string;
  hero_image: string;
  thumbnail: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  related: string;
  index_order: number | null;
  featured: number;
  body: string;
}

function db(): D1Database | null {
  const d = (env as unknown as { DB?: D1Database }).DB;
  return d ?? null;
}

const COLS = 'slug, title, hero_image AS hero_image, thumbnail, excerpt, author, date, category, related, index_order, featured, body';

function toArticle(r: Row): Article {
  let related: string[] = [];
  try {
    const p: unknown = JSON.parse(r.related);
    if (Array.isArray(p)) related = p.filter((x): x is string => typeof x === 'string');
  } catch {
    related = [];
  }
  return {
    slug: r.slug,
    title: r.title,
    heroImage: r.hero_image,
    thumbnail: r.thumbnail,
    excerpt: r.excerpt,
    author: r.author,
    date: new Date(r.date),
    category: r.category,
    related,
    indexOrder: r.index_order,
    featured: r.featured === 1,
    body: r.body,
  };
}

function isoDate(d: Date): string {
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** All articles in a state, off-index ones last, otherwise by index order. */
export async function listArticles(state: State = 'published'): Promise<Article[]> {
  const d = db();
  if (!d) return [];
  try {
    const { results } = await d
      .prepare(`SELECT ${COLS} FROM articles WHERE state = ? ORDER BY (index_order IS NULL), index_order ASC, date DESC`)
      .bind(state)
      .all<Row>();
    return results.map(toArticle);
  } catch {
    return [];
  }
}

export async function getArticle(slug: string, state: State = 'published'): Promise<Article | null> {
  const d = db();
  if (!d) return null;
  try {
    const r = await d.prepare(`SELECT ${COLS} FROM articles WHERE slug = ? AND state = ?`).bind(slug, state).first<Row>();
    return r ? toArticle(r) : null;
  } catch {
    return null;
  }
}

/** Draft if previewing and one exists, else published. */
export async function getArticleForView(slug: string, preview: boolean): Promise<Article | null> {
  if (preview) {
    const draft = await getArticle(slug, 'draft');
    if (draft) return draft;
  }
  return getArticle(slug, 'published');
}

/** One entry per article for the admin list, newest first, with status flags. */
export async function listAdminArticles(): Promise<AdminArticle[]> {
  const d = db();
  if (!d) return [];
  try {
    // 'published' before 'draft' so draft fields (the latest edit) win on display.
    const { results } = await d
      .prepare('SELECT slug, state, title, date, category FROM articles ORDER BY state DESC')
      .all<{ slug: string; state: string; title: string; date: string; category: string }>();
    const map = new Map<string, AdminArticle>();
    for (const r of results) {
      const cur: AdminArticle = map.get(r.slug) ?? { slug: r.slug, title: '', date: new Date(0), category: '', published: false, hasDraft: false };
      if (r.state === 'published') cur.published = true;
      if (r.state === 'draft') cur.hasDraft = true;
      cur.title = r.title;
      cur.date = new Date(r.date);
      cur.category = r.category;
      map.set(r.slug, cur);
    }
    return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    return [];
  }
}

async function upsert(state: State, a: Article): Promise<void> {
  const d = db();
  if (!d) return;
  await d
    .prepare(
      `INSERT INTO articles (slug, state, title, hero_image, thumbnail, excerpt, author, date, category, related, index_order, featured, body, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug, state) DO UPDATE SET
         title = excluded.title, hero_image = excluded.hero_image, thumbnail = excluded.thumbnail,
         excerpt = excluded.excerpt, author = excluded.author, date = excluded.date, category = excluded.category,
         related = excluded.related, index_order = excluded.index_order, featured = excluded.featured,
         body = excluded.body, updated_at = excluded.updated_at`,
    )
    .bind(
      a.slug,
      state,
      a.title,
      a.heroImage,
      a.thumbnail,
      a.excerpt,
      a.author,
      isoDate(a.date),
      a.category,
      JSON.stringify(a.related),
      a.indexOrder,
      a.featured ? 1 : 0,
      a.body,
      new Date().toISOString(),
    )
    .run();
}

/** Save the editing draft for an article (creates it if new). */
export async function saveArticleDraft(a: Article): Promise<void> {
  await upsert('draft', a);
}

/** Promote the draft to published. Keeps a single featured article live. */
export async function publishArticle(slug: string): Promise<void> {
  const draft = await getArticle(slug, 'draft');
  if (!draft) return;
  await upsert('published', draft);
  if (draft.featured) {
    const d = db();
    if (d) await d.prepare("UPDATE articles SET featured = 0 WHERE slug != ? AND state = 'published'").bind(slug).run();
  }
}

/** Remove an article entirely (both states). */
export async function deleteArticle(slug: string): Promise<void> {
  const d = db();
  if (!d) return;
  try {
    await d.prepare('DELETE FROM articles WHERE slug = ?').bind(slug).run();
  } catch {
    /* ignore */
  }
}

/** True if the draft differs from the published version. */
export async function hasUnpublishedChanges(slug: string): Promise<boolean> {
  const [draft, published] = await Promise.all([getArticle(slug, 'draft'), getArticle(slug, 'published')]);
  if (!draft) return false;
  const norm = (a: Article | null) =>
    a ? JSON.stringify([a.title, a.heroImage, a.thumbnail, a.excerpt, a.author, isoDate(a.date), a.category, a.related, a.indexOrder, a.featured, a.body]) : '';
  return norm(draft) !== norm(published);
}

export function slugify(s: string): string {
  const out = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return out || 'article';
}

/** A slug not yet used by any article (appends -2, -3, … on collision). */
export async function uniqueSlug(base: string): Promise<string> {
  const d = db();
  if (!d) return base;
  let slug = base;
  let n = 2;
  for (;;) {
    const hit = await d.prepare('SELECT 1 FROM articles WHERE slug = ? LIMIT 1').bind(slug).first();
    if (!hit) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}
