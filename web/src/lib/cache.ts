import { env } from 'cloudflare:workers';
import { flushCacheKey } from './cache-key';

// Flush edge-cached public pages after a publish, so anonymous visitors see the
// change without waiting out the cache TTL. (Authed editors already bypass the
// cache — see src/middleware.ts — so they always see changes immediately.)
//
// Two layers, both best-effort:
//   1. caches.default.delete() — purges the Cloudflare data centre handling this
//      request. Needs no credentials; instant in the editor's own region.
//   2. Purge-by-URL via the Cloudflare API — flushes every data centre globally.
//      Only runs if a scoped token is configured (CF_PURGE_TOKEN + CF_ZONE_ID as
//      Worker secrets). Without it, global staleness is bounded by the TTL.
export async function flushPublicPages(origin: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const urls = paths.map((p) => `${origin}${p}`);

  // 1. Per-data-centre Cache API delete. Uses the SAME key builder as the
  //    middleware (lib/cache-key.ts) so the delete always targets the entry a
  //    visit warmed — including campaign URLs that arrived with tracking params.
  const cache = (globalThis.caches as unknown as { default?: Cache } | undefined)?.default;
  if (cache) {
    await Promise.all(
      paths.map((p) => cache.delete(flushCacheKey(origin, p)).catch(() => false)),
    );
  }

  // 2. Global purge by URL, if a purge token is configured.
  const e = env as unknown as { CF_ZONE_ID?: string; CF_PURGE_TOKEN?: string };
  if (e.CF_ZONE_ID && e.CF_PURGE_TOKEN) {
    try {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${e.CF_ZONE_ID}/purge_cache`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${e.CF_PURGE_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      });
    } catch {
      // Best-effort: the cache TTL still bounds how long staleness can last.
    }
  }
}
