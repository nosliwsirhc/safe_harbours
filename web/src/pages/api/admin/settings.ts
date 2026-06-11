import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { setSettings } from '../../../lib/content';

// On-demand: save the site-wide settings (Google tag ids). JSON in, JSON out, so
// the Settings screen can autosave the same way the page editor does.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthed(request)) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { ga4_id?: string; gtm_id?: string };
  try {
    payload = (await request.json());
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  await setSettings({
    ga4_id: (payload.ga4_id ?? '').trim(),
    gtm_id: (payload.gtm_id ?? '').trim(),
  });

  return json({ ok: true });
};
