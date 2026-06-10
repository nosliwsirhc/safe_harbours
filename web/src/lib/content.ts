// Reads/writes the editable site content from D1 (binding: DB — the same
// database the careers board uses). Every read is wrapped so a page can never
// 500: on any error it falls back to empty, like lib/jobs.ts.
//
// DRAFT vs PUBLISHED: every row has a `state`. The public site reads 'published';
// the admin writes/reads 'draft'. Editors can change drafts freely without
// affecting the live site, then hit Publish (copies draft → published).
import { env } from 'cloudflare:workers';

export type State = 'draft' | 'published';

export interface Block {
  id: number;
  page: string;
  slot: string;
  kind: string;
  body: string;
  position: number;
}

export interface Hero {
  lead: string;
  heading: string;
  intro: string;
  bg: string;
}

export interface ZigImage {
  // Uploaded images (resized in the Worker): a fallback jpg + WebP/JPEG srcsets.
  webpset?: string;
  jpgset?: string;
  // Build-time variants for committed images (srcset strings).
  avif?: string;
  webp?: string;
  jpg?: string;
  w?: string | number;
  h?: string | number;
}

export interface ZigRow {
  reverse?: boolean;
  heading?: string;
  body?: string;
  img?: ZigImage;
}

export interface CtaData {
  heading?: string;
  body?: string;
  label?: string;
  href?: string;
  variant?: 'light' | 'dark';
}

// --- Richer page-section blocks (used on the fully-composed pages) ---

/** banner-bar: a heading + paragraph in the white rounded band. */
export interface BannerData {
  heading?: string;
  body?: string;
  shorten?: boolean; // the narrow "shorten" variant (default true)
}

/** page-text-block: a wide single column of long-form content (privacy, terms). */
export interface TextBlockData {
  heading?: string;
  body?: string;
}

/** faqs: a heading + an accordion of question/answer items. */
export interface FaqItem {
  q?: string;
  a?: string;
}
export interface FaqsData {
  heading?: string;
  items?: FaqItem[];
}

/** The Contact Us hero: contact details beside the website contact form. */
export interface ContactHeroData {
  heading?: string;
  phone?: string;
  email?: string;
  address?: string;
  bg?: string;
}

/** A full-width Google Maps embed. */
export interface MapData {
  embed?: string;
}

/** icon-item-row: a heading + a grid of coloured icon cards. */
export interface ValueCard {
  img?: ZigImage;
  title?: string;
  text?: string;
  style?: 'navy' | 'darknavy' | 'pink' | 'lightpink'; // preset colour scheme
}

/** Map a value-card style preset → its text + background colours. */
export const VALUE_CARD_STYLES: Record<string, { color: string; bg: string }> = {
  navy: { color: '#ffffff', bg: '#394254' },
  darknavy: { color: '#ffffff', bg: '#2d3648' },
  pink: { color: '#394254', bg: '#f88e8a' },
  lightpink: { color: '#2d3648', bg: '#f9a5a2' },
};
export interface ValueCardsData {
  heading?: string;
  cards?: ValueCard[];
  // Layout variants (set per page, preserved through edits — not editor-exposed).
  bg?: string; // section background-image (CSS image-set/url)
  alt?: boolean; // the alt-background tint variant (default true)
  large?: boolean; // the large card variant
  cols?: 2 | 3; // cards per row on large screens (default 3)
}

/** large-image-block: a big image beside a heading + rich body. */
export interface ImageBlockData {
  img?: ZigImage;
  heading?: string;
  body?: string;
}

/** team-members: a heading + headshot cards + a button. Headshots are CSS bg. */
export interface TeamMember {
  bg?: string; // full CSS background-image value (image-set(...) or url(...))
  name?: string;
  role?: string;
}
export interface TeamData {
  heading?: string;
  members?: TeamMember[];
  label?: string;
  href?: string;
}

/** testimonial cards: quote + author + role. */
export interface Testimonial {
  quote?: string;
  author?: string;
  role?: string;
}
export interface TestimonialsData {
  items?: Testimonial[];
}

/** logos strip: a heading + a row of logo images. */
export interface LogoItem {
  img?: ZigImage;
}
export interface LogosData {
  heading?: string;
  logos?: LogoItem[];
}

/** large-list: a heading + term/description list + a button. */
export interface ListItem {
  heading?: string;
  text?: string;
}
export interface LargeListData {
  heading?: string;
  items?: ListItem[];
  label?: string;
  href?: string;
}

/** "How it Works": a heading + a list of zig-zag step rows (auto-numbered). */
export interface StepsData {
  heading?: string;
  steps?: ZigRow[];
}

/** page-hero with the recruitment form beside it. */
export interface HeroFormData {
  heading?: string;
  intro?: string;
  bg?: string;
}

/** safety section: intro + support cards + an "important" callout. */
export interface SafetyCard {
  text?: string;
}
export interface SafetyData {
  content?: string;
  cards?: SafetyCard[];
  important?: string;
}

function db(): D1Database | null {
  const d = (env as unknown as { DB?: D1Database }).DB;
  return d ?? null;
}

/** All settings as a flat record. Empty object on any error / missing binding. */
export async function getSettings(): Promise<Record<string, string>> {
  const d = db();
  if (!d) return {};
  try {
    const { results } = await d.prepare('SELECT k, v FROM settings').all<{ k: string; v: string }>();
    const out: Record<string, string> = {};
    for (const r of results) out[r.k] = r.v;
    return out;
  } catch {
    return {};
  }
}

/** Upsert a batch of settings. No-op if the binding is missing. */
export async function setSettings(entries: Record<string, string>): Promise<void> {
  const d = db();
  if (!d) return;
  const stmt = d.prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v');
  const batch = Object.entries(entries).map(([k, v]) => stmt.bind(k, v));
  if (batch.length) await d.batch(batch);
}

/** Ordered blocks for a (page, slot) in a given state. Empty list on any error. */
export async function getBlocks(page: string, slot: string, state: State = 'published'): Promise<Block[]> {
  const d = db();
  if (!d) return [];
  try {
    const { results } = await d
      .prepare('SELECT id, page, slot, kind, body, position FROM content_blocks WHERE page = ? AND slot = ? AND state = ? ORDER BY position ASC')
      .bind(page, slot, state)
      .all<Block>();
    return results;
  } catch {
    return [];
  }
}

/**
 * Blocks for rendering. `preview` (admin, authed) shows the draft if one exists,
 * otherwise the published version. The public site always passes preview=false.
 */
export async function getBlocksForView(page: string, slot: string, preview: boolean): Promise<Block[]> {
  if (preview) {
    const draft = await getBlocks(page, slot, 'draft');
    if (draft.length) return draft;
  }
  return getBlocks(page, slot, 'published');
}

function parseHero(b: Block | undefined): Hero | null {
  if (!b) return null;
  try {
    const d = JSON.parse(b.body) as Partial<Hero>;
    return { lead: d.lead ?? '', heading: d.heading ?? '', intro: d.intro ?? '', bg: d.bg ?? '' };
  } catch {
    return null;
  }
}

/** A page's hero in a given state. */
export async function getHero(page: string, state: State = 'published'): Promise<Hero | null> {
  const blocks = await getBlocks(page, 'hero', state);
  return parseHero(blocks.find((x) => x.kind === 'hero') ?? blocks[0]);
}

/** A page's hero for rendering (draft-or-published in preview, else published). */
export async function getHeroForView(page: string, preview: boolean): Promise<Hero | null> {
  const blocks = await getBlocksForView(page, 'hero', preview);
  return parseHero(blocks.find((x) => x.kind === 'hero') ?? blocks[0]);
}

/**
 * Replace every block in a (page, slot, state) with the supplied list, in order.
 * Positions come from array index. The admin always writes the 'draft' state.
 */
export async function replaceBlocks(
  page: string,
  slot: string,
  blocks: { kind: string; body: string }[],
  state: State = 'draft',
): Promise<void> {
  const d = db();
  if (!d) return;
  const now = new Date().toISOString();
  const stmts = [d.prepare('DELETE FROM content_blocks WHERE page = ? AND slot = ? AND state = ?').bind(page, slot, state)];
  blocks.forEach((b, i) => {
    stmts.push(
      d
        .prepare('INSERT INTO content_blocks (page, slot, kind, body, position, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(page, slot, b.kind || 'text', b.body || '', i, state, now),
    );
  });
  await d.batch(stmts);
}

/** Promote the current draft to published (copies draft rows over published). */
export async function publish(page: string, slot: string): Promise<void> {
  const draft = await getBlocks(page, slot, 'draft');
  await replaceBlocks(page, slot, draft.map((b) => ({ kind: b.kind, body: b.body })), 'published');
}

/** True if the draft differs from the published version (there's something to publish). */
export async function hasUnpublishedChanges(page: string, slot: string): Promise<boolean> {
  const [draft, published] = await Promise.all([getBlocks(page, slot, 'draft'), getBlocks(page, slot, 'published')]);
  if (!draft.length) return false; // no draft yet → nothing pending
  const norm = (bs: Block[]) => JSON.stringify(bs.map((b) => [b.kind, b.body]));
  return norm(draft) !== norm(published);
}
