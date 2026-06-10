import type { APIRoute } from 'astro';
import { adminToken, sessionCookie } from '../../../lib/admin';

// On-demand: the admin login. Accepts the shared secret from a plain form POST
// and, on a match, sets the session cookie and redirects into /admin.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const field = form.get('password');
  const password = typeof field === 'string' ? field : '';
  const tok = adminToken();

  if (!tok || password !== tok) {
    return new Response(null, { status: 303, headers: { Location: '/admin/login?e=1' } });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin', 'Set-Cookie': sessionCookie(tok) },
  });
};
