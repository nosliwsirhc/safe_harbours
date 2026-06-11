import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { saveArticleDraft, deleteArticle, getArticle, uniqueSlug, slugify, type Article } from '../../../lib/articles';
import { sanitizeRich, toPlainText, sanitizeUrl } from '../../../lib/sanitize';
import { flushPublicPages } from '../../../lib/cache';

// Article authoring writes. The admin editor posts JSON (same-origin, so safe
// from cross-site forms). Everything is sanitized per field before it touches D1.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function cleanArticle(slug: string, raw: Record<string, unknown>): Article {
  const related = Array.isArray(raw.related) ? raw.related.filter((x): x is string => typeof x === 'string') : [];
  const io = raw.indexOrder;
  const order = typeof io === 'number' ? io : io === null || io === undefined || io === '' ? null : Number(io);
  return {
    slug,
    title: toPlainText(str(raw.title)),
    heroImage: sanitizeUrl(str(raw.heroImage)),
    thumbnail: sanitizeUrl(str(raw.thumbnail)),
    excerpt: toPlainText(str(raw.excerpt)),
    author: toPlainText(str(raw.author)) || 'Safe Harbours',
    date: new Date(str(raw.date) || new Date().toISOString().slice(0, 10)),
    category: toPlainText(str(raw.category)),
    related,
    indexOrder: order !== null && Number.isNaN(order) ? null : order,
    featured: raw.featured === true,
    body: sanitizeRich(str(raw.body)),
  };
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  if (typeof raw !== 'object' || raw === null) return json({ ok: false, error: 'Invalid JSON' }, 400);
  const payload: Record<string, unknown> = raw as Record<string, unknown>;
  const action = str(payload.action);

  if (action === 'create') {
    const title = toPlainText(str(payload.title)) || 'Untitled article';
    const slug = await uniqueSlug(slugify(title));
    const today = new Date().toISOString().slice(0, 10);
    await saveArticleDraft({
      slug,
      title,
      heroImage: '',
      thumbnail: '',
      excerpt: '',
      author: 'Safe Harbours',
      date: new Date(today),
      category: '',
      related: [],
      indexOrder: null,
      featured: false,
      body: '<p></p>',
    });
    return json({ ok: true, slug });
  }

  if (action === 'save') {
    const slug = str(payload.slug);
    if (!slug) return json({ ok: false, error: 'Missing slug' }, 400);
    await saveArticleDraft(cleanArticle(slug, payload));
    return json({ ok: true });
  }

  if (action === 'delete') {
    const slug = str(payload.slug);
    if (!slug) return json({ ok: false, error: 'Missing slug' }, 400);
    await deleteArticle(slug);
    // Drop the removed article and the index from the edge cache.
    await flushPublicPages(new URL(request.url).origin, [`/resources/${slug}`, '/resources']);
    return json({ ok: true });
  }

  if (action === 'exists') {
    const slug = str(payload.slug);
    const a = await getArticle(slug, 'draft');
    const p = await getArticle(slug, 'published');
    return json({ ok: true, exists: Boolean(a ?? p) });
  }

  return json({ ok: false, error: 'Unknown action' }, 400);
};
