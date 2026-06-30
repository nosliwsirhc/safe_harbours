// Validation for editor-authored redirects. This is a SECURITY control, not a
// convenience: a redirect target the site sends a `Location:` header to must be
// same-origin, or the admin becomes an open-redirect generator (phishing: a
// trusted safeharbours.ca link that bounces to an attacker's site).
//
// We deliberately do NOT reuse lib/sanitize.sanitizeUrl — it allows any http(s)
// host (it's for <a href> link fields, where external links are fine). Redirect
// targets must stay on our own origin, so they're validated here instead.

// A same-origin path: starts with a single '/', and the char right after is NOT
// '/' or '\' — browsers treat a leading '//' as protocol-relative (→ other host)
// and normalise a leading '/\' the same way. No whitespace or backslashes
// anywhere (a backslash mid-path can be re-read as '/'). Query/hash are allowed,
// so /new?ref=x#top is valid; other hosts and schemes are not.
const SAME_ORIGIN_PATH = /^\/(?![/\\])[^\s\\]*$/;

/** Normalise a path for storage/matching: trimmed, leading slash, no trailing slash. */
export function normalizePath(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

/** True if `to` is a safe same-origin redirect target (a path, never another host). */
export function isSameOriginTarget(to: string): boolean {
  const v = to.trim();
  if (v.length === 0 || v.length > 2048) return false;
  if (v.includes('://')) return false; // belt-and-braces: no scheme anywhere
  return SAME_ORIGIN_PATH.test(v);
}

// First-path-segment prefixes a redirect must NOT capture — redirecting these
// would break the app or its assets (and could lock an editor out of /admin).
const PROTECTED_FROM_PREFIXES = new Set([
  'admin',
  'api',
  'media',
  'assets',
  'wp',
  'wp-content',
  'wp-includes',
  'wp-json',
  'cdn-cgi',
  '_astro',
  '_image',
]);

/** True if `from` is a path we may legitimately redirect (a public content URL). */
export function isRedirectableFrom(from: string): boolean {
  const v = from.trim();
  if (!v.startsWith('/') || v.length > 2048) return false;
  if (v.includes('://') || /[\s\\]/.test(v)) return false;
  if (/[?#]/.test(v)) return false; // a source is just a path — we match on pathname
  if (normalizePath(v) === '/') return false; // never redirect the home page from here
  const firstSegment = normalizePath(v).slice(1).split('/')[0];
  return !PROTECTED_FROM_PREFIXES.has(firstSegment);
}

/** The path portion of a target (drops ?query/#hash) — used for cycle detection. */
export function targetPath(to: string): string {
  return normalizePath(to.split(/[?#]/)[0]);
}
