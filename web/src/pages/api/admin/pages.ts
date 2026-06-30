import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { getPage, savePageDraft, deletePage, type Page, type PageBlock } from '../../../lib/landing-pages';
import { isValidCampaignSlug } from '../../../lib/reserved-slugs';
import { cleanBlock } from '../../../lib/clean-block';
import { toPlainText } from '../../../lib/sanitize';
import { flushPublicPages } from '../../../lib/cache';

// On-demand write API for DB-driven campaign pages. POST saves the DRAFT (create
// or update — metadata and/or blocks); DELETE removes the page entirely. Mirrors
// the admin-write hardening: validate every editor-authored value that gets
// rendered/injected, and never let a D1 write throw uncaught.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Normalise an incoming blocks[] into clean {kind, body} entries (or null if not an array). */
function cleanBlocks(input: unknown): PageBlock[] | null {
  if (!Array.isArray(input)) return null;
  return input.map((b) => {
    const o = (b ?? {}) as { kind?: unknown; body?: unknown };
    const kind = typeof o.kind === 'string' ? o.kind : 'text';
    const body = typeof o.body === 'string' ? o.body : '';
    return { kind, body: cleanBlock(kind, body) };
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { slug?: string; title?: string; description?: string; noindex?: boolean; in_nav?: boolean; blocks?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const slug = (payload.slug ?? '').trim().toLowerCase();
  // The slug becomes a live URL — reject reserved/malformed values up front (this
  // also stops a page being authored onto an app route or asset prefix).
  if (!isValidCampaignSlug(slug)) {
    return json({ ok: false, error: 'That web address can’t be used. Use lowercase letters, numbers and dashes — and not a reserved name.' }, 400);
  }

  // Merge onto the existing draft (or the published copy if no draft yet) so a
  // metadata-only save keeps the blocks, and a blocks-only save keeps the metadata.
  let existing: Page | null;
  try {
    existing = (await getPage(slug, 'draft')) ?? (await getPage(slug, 'published'));
  } catch (err) {
    console.error('admin/pages: read existing failed', err);
    return json({ ok: false, error: 'Could not load the page. Please try again.' }, 500);
  }

  const blocks = cleanBlocks(payload.blocks);
  const merged: Page = {
    slug,
    // title/description are injected into <title> / <meta> — strip to plain text.
    title: payload.title !== undefined ? toPlainText(payload.title) : (existing?.title ?? ''),
    description: payload.description !== undefined ? toPlainText(payload.description) : (existing?.description ?? ''),
    noindex: typeof payload.noindex === 'boolean' ? payload.noindex : (existing?.noindex ?? true),
    inNav: typeof payload.in_nav === 'boolean' ? payload.in_nav : (existing?.inNav ?? false),
    blocks: blocks ?? existing?.blocks ?? [],
  };

  try {
    await savePageDraft(merged);
  } catch (err) {
    console.error('admin/pages: save failed', err);
    return json({ ok: false, error: 'Could not save. Please try again.' }, 500);
  }

  return json({ ok: true, slug, created: !existing });
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { slug?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  const slug = (payload.slug ?? '').trim().toLowerCase();
  if (!slug) return json({ ok: false, error: 'slug required' }, 400);

  try {
    await deletePage(slug);
    // The page is gone — flush any edge-cached copy of its URL.
    await flushPublicPages(new URL(request.url).origin, [`/${slug}`]);
  } catch (err) {
    console.error('admin/pages: delete failed', err);
    return json({ ok: false, error: 'Could not delete. Please try again.' }, 500);
  }

  return json({ ok: true });
};
