import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { setSettings } from '../../../lib/content';
import { validatePixels } from '../../../lib/pixel-ids';
import { isGa4Id, isGtmId } from '../../../lib/tag-ids';
import { validateFormConversions } from '../../../lib/form-conversions';

// On-demand: save the site-wide settings (Google tag ids + marketing pixels). JSON
// in, JSON out, so the Settings screen can autosave the same way the page editor
// does. Marketing-pixel IDs are validated before storage (they're injected into
// the page) — a malformed ID is rejected with a clear message, never stored.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { ga4_id?: string; gtm_id?: string; marketing_pixels?: unknown; form_conversions?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  // Validate the Google tag ids before storing — gtm_id is injected raw into an
  // inline <script> in ThemeLayout, so an unchecked value is a stored-XSS vector.
  // Empty is allowed (turns that tag off); a non-empty value must match the format.
  const ga4_id = (payload.ga4_id ?? '').trim();
  const gtm_id = (payload.gtm_id ?? '').trim();
  if (ga4_id && !isGa4Id(ga4_id)) {
    return json({ ok: false, error: 'That doesn’t look like a GA4 measurement ID — it should look like G-XXXXXXXXXX.' }, 400);
  }
  if (gtm_id && !isGtmId(gtm_id)) {
    return json({ ok: false, error: 'That doesn’t look like a Tag Manager container ID — it should look like GTM-XXXXXXX.' }, 400);
  }

  const updates: Record<string, string> = { ga4_id, gtm_id };

  // Only touch marketing_pixels when the field is sent, so a partial save can't
  // wipe configured pixels. Reject malformed (non-empty) IDs with a clear message.
  if (payload.marketing_pixels !== undefined) {
    const { clean, invalid } = validatePixels(payload.marketing_pixels);
    if (invalid.length) {
      return json({ ok: false, error: `These IDs don’t look right: ${invalid.join(', ')}. Check the format and try again.`, invalid }, 400);
    }
    updates.marketing_pixels = JSON.stringify(clean);
  }

  // Same for per-form conversion config (event name + thank-you URL).
  if (payload.form_conversions !== undefined) {
    const { clean, invalid } = validateFormConversions(payload.form_conversions);
    if (invalid.length) {
      return json({ ok: false, error: `Some conversion settings aren’t valid: ${invalid.join(', ')}. Event names use letters/numbers/underscores; thank-you links must be a path on this site (e.g. /thank-you).`, invalid }, 400);
    }
    updates.form_conversions = JSON.stringify(clean);
  }

  try {
    await setSettings(updates);
  } catch (err) {
    console.error('admin/settings: save failed', err);
    return json({ ok: false, error: 'Could not save settings. Please try again.' }, 500);
  }

  return json({ ok: true });
};
