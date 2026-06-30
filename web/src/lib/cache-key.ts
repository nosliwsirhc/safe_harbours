// Single source of truth for the edge cache key, shared by the middleware (which
// stores + reads entries) and lib/cache.ts (which deletes them on publish).
//
// The original cache bug was those two building the key independently and drifting:
// the middleware folded the query string in, the flush only ever targeted the bare
// path, so campaign URLs (?utm_*, gclid, …) were cached under keys the flush could
// never reach. Keeping both sides on these functions makes that class of bug
// structurally impossible — a flush always targets exactly what a visit warmed.

// Query params allowed to take part in the cache key. EMPTY by design: no public
// page varies its HTML by query string (?preview bypasses the cache entirely), and
// anything kept here would NOT be matched by flushPublicPages(), which deletes the
// bare path. If a feature ever needs a param in the key, add it here AND teach the
// flush to include it — never one side alone. (A/B variance rides a cookie in the
// key, set by the middleware, not a query param, precisely to avoid this.)
export const CACHE_KEY_ALLOWED_PARAMS: readonly string[] = [];

/** The allowlisted query suffix ('' when nothing is allowlisted/present), sorted for a stable key. */
function allowedSearch(url: URL): string {
  if (CACHE_KEY_ALLOWED_PARAMS.length === 0) return '';
  const kept = new URLSearchParams();
  for (const name of CACHE_KEY_ALLOWED_PARAMS) {
    for (const value of url.searchParams.getAll(name)) kept.append(name, value);
  }
  kept.sort();
  const s = kept.toString();
  return s ? `?${s}` : '';
}

/** Cache key for a live request — used by the middleware to read/store entries. */
export function publicCacheKey(url: URL): Request {
  return new Request(`${url.origin}${url.pathname}${allowedSearch(url)}`, { method: 'GET' });
}

/** Cache key for a path being flushed — used by lib/cache.ts on publish. */
export function flushCacheKey(origin: string, pathname: string): Request {
  return new Request(`${origin}${pathname}`, { method: 'GET' });
}
