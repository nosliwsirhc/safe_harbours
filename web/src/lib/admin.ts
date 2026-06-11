// Auth for /admin. Two mechanisms, checked in order:
//
//   1. Cloudflare Access (preferred) — when CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD
//      are set, each editor signs in with their own identity at the edge and
//      Cloudflare forwards a signed JWT (Cf-Access-Jwt-Assertion). We verify that
//      JWT here as defence-in-depth, so the app trusts the identity only when the
//      request genuinely came through Access (not, say, the *.workers.dev URL).
//   2. Shared password (fallback) — the ADMIN_TOKEN secret, set as an httpOnly
//      cookie on login. Used until Access is configured, then it can be removed.
//
// Access is INERT until its two env vars are set, so this is safe to ship before
// the Cloudflare Access application exists.
import { env } from 'cloudflare:workers';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const COOKIE = 'sh_admin';

interface AdminEnv {
  ADMIN_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string; // e.g. "safeharbours.cloudflareaccess.com"
  CF_ACCESS_AUD?: string; // the Access application's Audience (AUD) tag
}
const cfg = (): AdminEnv => env;

export function adminToken(): string {
  return cfg().ADMIN_TOKEN ?? '';
}

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(cookie);
  return m ? m[1] : null;
}

// --- Cloudflare Access -------------------------------------------------------

// One JWKS per team domain, cached across requests (jose refetches keys on
// rotation). Keyed so a config change can't serve a stale key set.
let jwksCache: { team: string; set: ReturnType<typeof createRemoteJWKSet> } | null = null;
function jwksFor(team: string): ReturnType<typeof createRemoteJWKSet> {
  if (jwksCache?.team !== team) {
    jwksCache = { team, set: createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`)) };
  }
  return jwksCache.set;
}

/**
 * Returns the verified Cloudflare Access email for this request, or null when
 * Access isn't configured / no valid token is present.
 */
export async function accessEmail(request: Request): Promise<string | null> {
  const { CF_ACCESS_TEAM_DOMAIN: team, CF_ACCESS_AUD: audRaw } = cfg();
  if (!team || !audRaw) return null; // Access not configured — fall back to password
  // /admin and /api/admin are protected by separate Access apps with separate
  // AUD tags; CF_ACCESS_AUD holds both, comma-separated.
  const aud = audRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (aud.length === 0) return null;
  // Cloudflare injects the Cf-Access-Jwt-Assertion header only on Access-covered
  // paths (/admin, /api/admin). For other pages the editor visits while logged
  // in — notably the public page the editor PREVIEW iframe loads as
  // `/page?preview=1` — that header is absent, but the domain-wide
  // `CF_Authorization` session cookie (the same signed JWT) is present. Accept
  // either, so a signed-in editor's draft preview works everywhere.
  const token = request.headers.get('Cf-Access-Jwt-Assertion') ?? readCookie(request, 'CF_Authorization');
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwksFor(team), {
      issuer: `https://${team}`,
      audience: aud,
    });
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null; // invalid/expired/forged token
  }
}

/** Cloudflare Access global logout URL, or null when Access isn't configured. */
export function accessLogoutUrl(): string | null {
  const team = cfg().CF_ACCESS_TEAM_DOMAIN;
  return team ? `https://${team}/cdn-cgi/access/logout` : null;
}

// --- Shared password (fallback) ----------------------------------------------

function hasValidPassword(request: Request): boolean {
  const tok = adminToken();
  if (!tok) return false; // no secret configured → password path closed
  const raw = readCookie(request, 'sh_admin');
  if (!raw) return false;
  try {
    return decodeURIComponent(raw) === tok;
  } catch {
    return false; // malformed cookie → fail closed (clean 401/redirect, not a 500)
  }
}

// --- Public API --------------------------------------------------------------

/** True when the request carries a valid Access identity OR the admin password. */
export async function isAuthed(request: Request): Promise<boolean> {
  if (await accessEmail(request)) return true;
  return hasValidPassword(request);
}

export function sessionCookie(token: string): string {
  // Session cookie (no Max-Age) — clears on browser close. Secure + httpOnly +
  // SameSite=Lax is plenty for a single-secret admin gate.
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}
