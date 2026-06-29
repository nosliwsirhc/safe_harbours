import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { setSettings } from '../../../lib/content';
import { isGa4Id, isGtmId } from '../../../lib/tag-ids';

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

  // Validate before storing: these IDs are injected into inline <script> in
  // ThemeLayout, so an unchecked value is a stored-XSS vector. Empty is allowed
  // (turns that tag off); a non-empty value must match the Google ID format.
  const ga4_id = (payload.ga4_id ?? '').trim();
  const gtm_id = (payload.gtm_id ?? '').trim();
  if (ga4_id && !isGa4Id(ga4_id)) {
    return json({ ok: false, error: 'That doesn’t look like a GA4 measurement ID — it should look like G-XXXXXXXXXX.' }, 400);
  }
  if (gtm_id && !isGtmId(gtm_id)) {
    return json({ ok: false, error: 'That doesn’t look like a Tag Manager container ID — it should look like GTM-XXXXXXX.' }, 400);
  }

  try {
    await setSettings({ ga4_id, gtm_id });
  } catch (err) {
    console.error('admin/settings: save failed', err);
    return json({ ok: false, error: 'Could not save settings. Please try again.' }, 500);
  }

  return json({ ok: true });
};
