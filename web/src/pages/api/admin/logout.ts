import type { APIRoute } from 'astro';
import { accessLogoutUrl } from '../../../lib/admin';

// Log out. Clears the password cookie and, when Cloudflare Access is in front of
// /admin, sends the user to Access's logout so the SSO session ends too —
// otherwise "Log out" would only drop the (shadowed) password cookie and the
// editor would still be signed in via Access.
export const prerender = false;

export const GET: APIRoute = () => {
  const dest = accessLogoutUrl() ?? '/admin/login';
  return new Response(null, {
    status: 303,
    headers: {
      Location: dest,
      'Set-Cookie': 'sh_admin=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
    },
  });
};
