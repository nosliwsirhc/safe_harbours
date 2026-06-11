import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { publish } from '../../../lib/content';
import { isEditableArea } from '../../../lib/pages';

// On-demand: promote the current draft to live. Copies the (page, slot) draft
// over the published version. Nothing reaches the public site until this runs.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthed(request)) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { page?: string; slot?: string };
  try {
    payload = (await request.json());
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  if (!payload.page || !payload.slot) return json({ ok: false, error: 'page and slot required' }, 400);
  if (!isEditableArea(payload.page, payload.slot)) return json({ ok: false, error: 'Unknown page' }, 400);

  await publish(payload.page, payload.slot);
  return json({ ok: true });
};
