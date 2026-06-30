import type { APIRoute } from 'astro';
import { isAuthed } from '../../../../lib/admin';
import { publishPage, getPage } from '../../../../lib/landing-pages';
import { flushPublicPages } from '../../../../lib/cache';

// On-demand: promote a campaign page's draft to live, then flush its edge-cached
// URL so anonymous visitors see the change without waiting out the cache TTL.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
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
    const draft = await getPage(slug, 'draft');
    if (!draft) return json({ ok: false, error: 'There is no draft to publish.' }, 400);
    await publishPage(slug);
    await flushPublicPages(new URL(request.url).origin, [`/${slug}`]);
  } catch (err) {
    console.error('admin/pages/publish: publish failed', err);
    return json({ ok: false, error: 'Could not publish. Please try again.' }, 500);
  }

  return json({ ok: true });
};
