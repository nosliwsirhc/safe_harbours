import { defineMiddleware } from 'astro:middleware';

// Edge caching for the server-rendered public pages.
//
// Every public page is rendered on demand in the Worker and reads its copy from
// D1. Cloudflare does NOT cache Worker-generated responses by default, so without
// this each visit re-runs the render + D1 query. We use the Cache API
// (`caches.default`) — the documented pattern for caching responses a Worker
// produces itself — to serve repeat hits straight from the edge with no D1 read.
//
// Scope and safety:
//   - Only GET responses that are 200 text/html and carry no Set-Cookie are
//     stored (so nothing per-user is ever cached).
//   - /admin and /api are never cached and are marked `private, no-store`.
//   - /media manages its own (immutable) caching in its route.
//   - The Cache API is per-data-centre, so a published edit goes live within the
//     short s-maxage window in each colo that has a cached copy. Bump EDGE_TTL
//     down for fresher publishes, or add a cache purge on publish for instant.
const EDGE_TTL = 60; // seconds a rendered page stays cached in a data centre

// Match the /admin and /api route trees on segment boundaries, so an unrelated
// public path like /apiary isn't accidentally forced private.
const isPrivate = (pathname: string): boolean => /^\/(admin|api)(\/|$)/.test(pathname);

// Query params that may take part in the edge cache key. Empty today (no public
// page varies its HTML by query string); extend deliberately — see the cache-key
// comment below for why tracking params must never appear here.
const CACHE_KEY_ALLOWED_PARAMS: readonly string[] = [];

// The cache-key query suffix: only allowlisted params, sorted for a stable key.
// Returns '' (bare path) when nothing is allowlisted or present.
const allowedSearch = (url: URL): string => {
  if (CACHE_KEY_ALLOWED_PARAMS.length === 0) return '';
  const kept = new URLSearchParams();
  for (const name of CACHE_KEY_ALLOWED_PARAMS) {
    for (const value of url.searchParams.getAll(name)) kept.append(name, value);
  }
  kept.sort();
  const s = kept.toString();
  return s ? `?${s}` : '';
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals } = context;
  const url = new URL(request.url);

  // Editor + API routes: dynamic and/or authed — never cache, anywhere.
  if (isPrivate(url.pathname)) {
    const res = await next();
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  }

  // Authed editors and draft previews must NEVER be cached, nor served a cached
  // copy: the admin preview loads the public page with `?preview=1` and renders
  // the unpublished draft, so caching it would (a) show editors a stale draft and
  // (b) leak that draft to anyone who hits the guessable preview URL. Bypassing
  // for the admin cookie also means editors always see live published content the
  // instant they publish, with no flush needed on their side.
  const authed = (request.headers.get('cookie') ?? '').includes('sh_admin=');
  const isPreview = url.searchParams.has('preview');
  if (authed || isPreview) {
    const res = await next();
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  }

  // The Cache API only exists in the Cloudflare runtime — skip in dev/build.
  // `caches.default` is Cloudflare's non-standard extension to CacheStorage.
  const cache = (globalThis.caches as unknown as { default?: Cache } | undefined)?.default;

  // Only public GET page requests are edge-cacheable (/media caches itself).
  if (!cache || request.method !== 'GET' || url.pathname.startsWith('/media')) {
    return next();
  }

  // Normalised key: scheme + path + an ALLOWLIST of query params only.
  //
  // Why drop the rest: campaign links arrive with tracking params (utm_*, gclid,
  // fbclid, …). If those folded into the key, every variant of /lp?utm_source=…
  // would be its own cache entry — so (a) the shared edge entry never warms, and
  // (b) flushPublicPages() can never purge them: it deletes the BARE path, so a
  // keyed-with-query entry would survive a publish and go stale. Stripping them
  // collapses every campaign URL onto the one entry for the path, which the
  // bare-path flush then matches.
  //
  // The allowlist is empty today on purpose: no public page varies its rendered
  // HTML by query string (?preview is handled above and bypasses the cache
  // entirely). A future feature that genuinely needs a param in the key adds it
  // here — but A/B variance is carried by the assigned-variant cookie below, not
  // by a query param, precisely so the bare-path flush keeps matching.
  const cacheKey = new Request(`${url.origin}${url.pathname}${allowedSearch(url)}`, { method: 'GET' });

  // Serve a cached copy if present. Cache API responses have IMMUTABLE headers,
  // and the runtime enforces that strictly (Miniflare/dev does not — which is
  // why this only surfaced in production): handing one back to Astro's pipeline,
  // which sets headers downstream, throws "Can't modify immutable headers" → 500.
  // So we copy it into a fresh, mutable response. All cache work is wrapped so a
  // cache failure can never break the page — it just falls through to a render.
  try {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set('x-edge-cache', 'HIT');
      return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
    }
  } catch {
    // fall through to a fresh render
  }

  const res = await next();

  try {
    const cacheable =
      res.status === 200 &&
      (res.headers.get('content-type') ?? '').includes('text/html') &&
      !res.headers.has('set-cookie');

    if (cacheable) {
      // max-age=0 → browsers always revalidate (so a published change is never
      // pinned in someone's browser); s-maxage → the edge caches for EDGE_TTL.
      res.headers.set('Cache-Control', `public, max-age=0, s-maxage=${EDGE_TTL}`);
      res.headers.set('x-edge-cache', 'MISS');
      const ctx = (locals as { cfContext?: { waitUntil(p: Promise<unknown>): void } }).cfContext;
      const stored = res.clone();
      if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, stored));
      else await cache.put(cacheKey, stored);
    }
  } catch {
    // caching is best-effort — never let it break the response
  }
  return res;
});
