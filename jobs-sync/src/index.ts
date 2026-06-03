// jobs-sync worker — projects the HR Job Postings lists to the public-board D1.
//
// Triggers:
//   - scheduled() : every 6h (wrangler.toml) — full reconcile + expiry backstop.
//   - fetch()     : POST /refresh (Power Automate webhook, shared secret) — reconcile now.
//                   GET  /health  — liveness + last sync summary.
//
// Security boundary: this worker holds the SharePoint cert + writes D1. The public
// site worker only READS the D1; it has no SharePoint credentials.
import type { Env } from './types';
import { loadTemplates, loadPostings, gatePasses, buildPublic, todayInOrg } from './project';
import { IdAllocator, resolvePostingId } from './postingId';
import { upsertPostings, deleteExcept, deleteExpired, setMeta, getMeta } from './d1';

interface SyncResult { published: number; expiredSwept: number; removed: number; errors: string[]; }

async function sync(env: Env): Promise<SyncResult> {
  const errors: string[] = [];
  // 1) SharePoint-independent backstop: drop anything already past its closing date.
  const expiredSwept = await deleteExpired(env.DB, todayInOrg(env));

  // 2) Read SharePoint and resolve the gated, override-resolved public set.
  const [templates, rawPostings] = await Promise.all([loadTemplates(env), loadPostings(env)]);
  const candidates = rawPostings.filter((p) => gatePasses(p, env));

  const alloc = new IdAllocator(env.DB);
  const published = [];
  for (const raw of candidates) {
    try {
      const id = await resolvePostingId(env, alloc, raw);
      const templateId = Number(raw.RoleTemplate?.Id ?? raw.RoleTemplateId);
      published.push(await buildPublic(raw, templates.get(templateId), id));
    } catch (e) {
      errors.push(`posting ${raw.Id}: ${(e as Error).message}`);
    }
  }

  // 3) Upsert the published set; remove anything no longer published.
  await upsertPostings(env.DB, published);
  const removed = await deleteExcept(env.DB, published.map((p) => p.spItemId));

  // 4) Bookkeeping: last sync + a version stamp the public board can cache on.
  const version = `${Date.now()}-${published.length}`;
  await setMeta(env.DB, 'last_sync', new Date().toISOString());
  await setMeta(env.DB, 'version', version);
  await setMeta(env.DB, 'published_count', String(published.length));
  if (errors.length) await setMeta(env.DB, 'last_errors', errors.slice(0, 10).join(' | '));

  return { published: published.length, expiredSwept, removed, errors };
}

/** Constant-time string compare (avoid leaking the secret via timing). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      sync(env)
        .then((r) => console.log('[scheduled] sync', JSON.stringify(r)))
        .catch((e) => console.error('[scheduled] sync failed', (e as Error).message)),
    );
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/health') {
      const [last, count] = await Promise.all([getMeta(env.DB, 'last_sync'), getMeta(env.DB, 'published_count')]);
      return json({ ok: true, last_sync: last, published: count ? Number(count) : null });
    }

    if (req.method === 'POST' && url.pathname === '/refresh') {
      const provided = req.headers.get('x-refresh-secret') ?? '';
      if (!env.REFRESH_SECRET || !safeEqual(provided, env.REFRESH_SECRET)) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }
      // Run in the background so Power Automate gets a fast ack; the sync is idempotent.
      ctx.waitUntil(
        sync(env)
          .then((r) => console.log('[refresh] sync', JSON.stringify(r)))
          .catch((e) => console.error('[refresh] sync failed', (e as Error).message)),
      );
      return json({ ok: true, accepted: true }, 202);
    }

    return json({ ok: false, error: 'not found' }, 404);
  },
};
