import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { setSettings } from '../../../lib/content';
import { validatePixels } from '../../../lib/pixel-ids';

// On-demand: save the site-wide settings (Google tag ids + marketing pixels). JSON
// in, JSON out, so the Settings screen can autosave the same way the page editor
// does. Marketing-pixel IDs are validated before storage (they're injected into
// the page) — a malformed ID is rejected with a clear message, never stored.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { ga4_id?: string; gtm_id?: string; marketing_pixels?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const updates: Record<string, string> = {
    ga4_id: (payload.ga4_id ?? '').trim(),
    gtm_id: (payload.gtm_id ?? '').trim(),
  };

  // Only touch marketing_pixels when the field is sent, so a partial save can't
  // wipe configured pixels. Reject malformed (non-empty) IDs with a clear message.
  if (payload.marketing_pixels !== undefined) {
    const { clean, invalid } = validatePixels(payload.marketing_pixels);
    if (invalid.length) {
      return json({ ok: false, error: `These IDs don’t look right: ${invalid.join(', ')}. Check the format and try again.`, invalid }, 400);
    }
    updates.marketing_pixels = JSON.stringify(clean);
  }

  try {
    await setSettings(updates);
  } catch (err) {
    console.error('admin/settings: save failed', err);
    return json({ ok: false, error: 'Could not save settings. Please try again.' }, 500);
  }

  return json({ ok: true });
};
