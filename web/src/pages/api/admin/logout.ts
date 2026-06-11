import type { APIRoute } from 'astro';

// Clear the admin session cookie and return to the login screen.
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(null, {
    status: 303,
    headers: { Location: '/admin/login', 'Set-Cookie': 'sh_admin=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0' },
  });
