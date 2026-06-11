import type { APIRoute } from 'astro';
import { isAuthed } from '../../../../lib/admin';
import { publishArticle } from '../../../../lib/articles';
import { flushPublicPages } from '../../../../lib/cache';

// Promote an article's draft to published (makes it live on /resources).
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  const slug = raw && typeof raw === 'object' && 'slug' in raw && typeof raw.slug === 'string' ? raw.slug : '';
  if (!slug) return json({ ok: false, error: 'Missing slug' }, 400);
  await publishArticle(slug);

  // The article page and the /resources index both change — flush both.
  await flushPublicPages(new URL(request.url).origin, [`/resources/${slug}`, '/resources']);

  return json({ ok: true });
};
