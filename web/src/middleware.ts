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

const isPrivate = (pathname: string): boolean =>
  pathname.startsWith('/admin') || pathname.startsWith('/api');

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals } = context;
  const url = new URL(request.url);

  // Editor + API routes: dynamic and/or authed — never cache, anywhere.
  if (isPrivate(url.pathname)) {
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

  // Normalised key: scheme + path + query only, so every visitor shares one
  // entry (these pages have no per-request variation).
  const cacheKey = new Request(`${url.origin}${url.pathname}${url.search}`, { method: 'GET' });

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const res = await next();

  const cacheable =
    res.status === 200 &&
    (res.headers.get('content-type') ?? '').includes('text/html') &&
    !res.headers.has('set-cookie');

  if (cacheable) {
    res.headers.set('Cache-Control', `public, s-maxage=${EDGE_TTL}, stale-while-revalidate=600`);
    const ctx = (locals as { cfContext?: { waitUntil(p: Promise<unknown>): void } }).cfContext;
    const stored = res.clone();
    if (ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, stored));
    else await cache.put(cacheKey, stored);
  }
  return res;
});
