// DB-driven redirects (binding: DB). Applied in src/middleware.ts before the edge
// cache lookup, so a retired/moved URL 301s straight from the edge. The whole set
// is small and read on nearly every request, so it's held in an isolate-global
// ~60s map (one D1 read per isolate per window) rather than a query per request.
// Every read is wrapped so a failure can never break request handling.
import { env } from 'cloudflare:workers';
import { normalizePath, targetPath } from './redirect-target';

export interface Redirect {
  from: string;
  to: string;
  status: number;
}

interface Row {
  from_path: string;
  to_path: string;
  status: number;
}

function db(): D1Database | null {
  const d = (env as unknown as { DB?: D1Database }).DB;
  return d ?? null;
}

// --- Isolate-global redirect map -----------------------------------------------
interface CacheEntry {
  map: Map<string, { to: string; status: number }>;
  exp: number;
}
const MAP_TTL_MS = 60_000;
let cached: CacheEntry | null = null;

async function loadMap(): Promise<Map<string, { to: string; status: number }>> {
  const map = new Map<string, { to: string; status: number }>();
  const d = db();
  if (!d) return map;
  try {
    const { results } = await d.prepare('SELECT from_path, to_path, status FROM redirects').all<Row>();
    for (const r of results) map.set(r.from_path, { to: r.to_path, status: r.status === 302 ? 302 : 301 });
  } catch {
    // leave the map empty on any error — requests just fall through to normal routing
  }
  return map;
}

async function getMap(): Promise<Map<string, { to: string; status: number }>> {
  const now = Date.now();
  if (cached && cached.exp > now) return cached.map;
  const map = await loadMap();
  cached = { map, exp: now + MAP_TTL_MS };
  return map;
}

/** Drop the isolate redirect cache (call after a write in this isolate). */
export function invalidateRedirectCache(): void {
  cached = null;
}

/** The redirect for a request path, or null. Normalises the path before matching. */
export async function lookupRedirect(pathname: string): Promise<{ to: string; status: number } | null> {
  const map = await getMap();
  if (map.size === 0) return null;
  return map.get(normalizePath(pathname)) ?? null;
}

/** All redirects, for the admin list (sorted by source path). */
export async function listRedirects(): Promise<Redirect[]> {
  const d = db();
  if (!d) return [];
  try {
    const { results } = await d.prepare('SELECT from_path, to_path, status FROM redirects ORDER BY from_path').all<Row>();
    return results.map((r) => ({ from: r.from_path, to: r.to_path, status: r.status === 302 ? 302 : 301 }));
  } catch {
    return [];
  }
}

/** Upsert a redirect (keyed by from_path). Caller validates + cycle-checks first. */
export async function saveRedirect(from: string, to: string, status: number): Promise<void> {
  const d = db();
  if (!d) return;
  await d
    .prepare(
      `INSERT INTO redirects (from_path, to_path, status, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path, status = excluded.status, updated_at = excluded.updated_at`,
    )
    .bind(from, to, status === 302 ? 302 : 301, new Date().toISOString())
    .run();
  invalidateRedirectCache();
}

/** Remove a redirect by its source path. */
export async function deleteRedirect(from: string): Promise<void> {
  const d = db();
  if (!d) return;
  try {
    await d.prepare('DELETE FROM redirects WHERE from_path = ?').bind(normalizePath(from)).run();
    invalidateRedirectCache();
  } catch {
    /* ignore */
  }
}

/**
 * Would adding `from → to` create a redirect loop? Follows the chain from `to`
 * through the EXISTING redirects (plus the proposed edge) by path; a loop, or a
 * hop back to `from`, means a cycle. Cheap: the set is tiny and bounded by size.
 */
export async function wouldCreateCycle(from: string, to: string): Promise<boolean> {
  const f = normalizePath(from);
  const graph = new Map<string, string>();
  for (const r of await listRedirects()) graph.set(normalizePath(r.from), targetPath(r.to));
  graph.set(f, targetPath(to)); // apply the proposed edge

  let cur = targetPath(to);
  const seen = new Set<string>([f]);
  for (let i = 0; i <= graph.size; i++) {
    if (cur === f) return true; // chain leads back to the source
    if (seen.has(cur)) return true; // a loop elsewhere in the chain
    seen.add(cur);
    const next = graph.get(cur);
    if (next === undefined) return false; // chain ends at a non-redirected path → no cycle
    cur = next;
  }
  return true; // didn't terminate within the graph size → treat as a cycle
}
