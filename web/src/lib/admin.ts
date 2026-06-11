// Minimal auth for the /admin spike. A single shared secret (env ADMIN_TOKEN)
// is the password; on a correct login we set it as an httpOnly cookie and every
// admin route checks for it. This is intentionally small — the production answer
// is to put /admin behind Cloudflare Access (SSO, zero app code) and drop this.
import { env } from 'cloudflare:workers';

const COOKIE = 'sh_admin';

export function adminToken(): string {
  return (env as unknown as { ADMIN_TOKEN?: string }).ADMIN_TOKEN ?? '';
}

export function isAuthed(request: Request): boolean {
  const tok = adminToken();
  if (!tok) return false; // no secret configured → admin is closed
  const cookie = request.headers.get('cookie') ?? '';
  const m = /(?:^|;\s*)sh_admin=([^;]+)/.exec(cookie);
  return !!m && decodeURIComponent(m[1]) === tok;
}

export function sessionCookie(token: string): string {
  // Session cookie (no Max-Age) — clears on browser close. Secure + httpOnly +
  // SameSite=Lax is plenty for a single-secret admin gate.
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}
