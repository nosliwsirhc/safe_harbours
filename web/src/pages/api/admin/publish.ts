import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { publish } from '../../../lib/content';
import { findPage, isEditableArea } from '../../../lib/pages';
import { flushPublicPages } from '../../../lib/cache';

// On-demand: promote the current draft to live. Copies the (page, slot) draft
// over the published version. Nothing reaches the public site until this runs.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { page?: string; slot?: string };
  try {
    payload = (await request.json());
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  if (!payload.page || !payload.slot) return json({ ok: false, error: 'page and slot required' }, 400);
  if (!isEditableArea(payload.page, payload.slot)) return json({ ok: false, error: 'Unknown page' }, 400);

  try {
    await publish(payload.page, payload.slot);

    // Flush the now-stale public page from the edge cache so visitors see the
    // change without waiting out the TTL.
    const path = findPage(payload.page)?.path;
    if (path) await flushPublicPages(new URL(request.url).origin, [path]);
  } catch (err) {
    console.error('admin/publish: publish failed', err);
    return json({ ok: false, error: 'Could not publish. Please try again.' }, 500);
  }

  return json({ ok: true });
};
