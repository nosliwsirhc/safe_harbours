import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { saveRedirect, deleteRedirect, wouldCreateCycle } from '../../../lib/redirects';
import { isRedirectableFrom, isSameOriginTarget, normalizePath } from '../../../lib/redirect-target';

// On-demand write API for DB-driven redirects. POST adds/updates a redirect;
// DELETE removes one. Mirrors the admin-write hardening: validate every value,
// and never let a D1 write throw uncaught. The redirect TARGET is validated as
// same-origin here (NOT via sanitizeUrl) so the admin can't become an open
// redirect, and loops are rejected at write time.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { from?: string; to?: string; status?: number };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const from = normalizePath(payload.from ?? '');
  const to = (payload.to ?? '').trim();
  const status = payload.status === 302 ? 302 : 301;

  if (!isRedirectableFrom(from)) {
    return json({ ok: false, error: 'The “from” address must be a path on this site (e.g. /old-page) and not an app or asset path.' }, 400);
  }
  if (!isSameOriginTarget(to)) {
    return json({ ok: false, error: 'The “to” address must be a path on this site (e.g. /new-page). External links aren’t allowed here.' }, 400);
  }

  try {
    if (await wouldCreateCycle(from, to)) {
      return json({ ok: false, error: 'That would create a redirect loop. Point it at a page that isn’t itself redirected.' }, 400);
    }
    await saveRedirect(from, to, status);
  } catch (err) {
    console.error('admin/redirects: save failed', err);
    return json({ ok: false, error: 'Could not save the redirect. Please try again.' }, 500);
  }

  return json({ ok: true, from, to, status });
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!(await isAuthed(request))) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { from?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  const from = normalizePath(payload.from ?? '');
  if (!from || from === '/') return json({ ok: false, error: 'from required' }, 400);

  try {
    await deleteRedirect(from);
  } catch (err) {
    console.error('admin/redirects: delete failed', err);
    return json({ ok: false, error: 'Could not delete the redirect. Please try again.' }, 500);
  }

  return json({ ok: true });
};
