// The site's sitemap, built live from D1 on request (SSR).
//
// Why this isn't the @astrojs/sitemap integration: that integration can only
// enumerate routes that exist at BUILD time. Our three content routes —
// CMS pages (`[...slug].astro`), resource articles (`resources/[slug].astro`)
// and job postings (`careers/[postingId].astro`) — are all `prerender = false`
// and served on demand from D1, so a build-time crawl sees none of them. Worse,
// editors publish without a rebuild, so any build-time snapshot goes stale the
// moment content changes. A live endpoint is the only way to keep the sitemap
// both fulsome and current.
//
// Resilience: every list function below wraps its own D1 access and returns an
// empty array on any failure, so this endpoint can degrade to "just the static
// pages" but can never 500.
import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { listAdminPages } from '../lib/landing-pages';
import { listArticles } from '../lib/articles';
import { listJobs } from '../lib/jobs';
import { isReservedSlug } from '../lib/reserved-slugs';

export const prerender = false;

const origin = site.url.replace(/\/$/, '');

// Auto-discover the hand-authored static pages so this list never drifts when
// someone adds a new .astro page. Only the file paths (keys) are used — the
// modules themselves are never imported — so Vite inlines the key set at build
// and nothing here touches the filesystem at runtime.
const STATIC_PAGE_FILES = Object.keys(import.meta.glob('./**/*.astro'));

/** './our-story.astro' → '/our-story', './index.astro' → '/', or null to skip. */
function fileToPath(file: string): string | null {
  let p = file.replace(/^\.\//, '').replace(/\.astro$/, '');
  if (p.startsWith('admin/')) return null; // authed editor UI — never indexed
  if (p.includes('[')) return null; // dynamic routes are added from D1 below
  if (p === 'index') return '/';
  if (p.endsWith('/index')) p = p.slice(0, -'/index'.length);
  return `/${p}`;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** A valid Date → 'YYYY-MM-DD', anything else → null (omit lastmod). */
function isoDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

interface Entry {
  loc: string;
  lastmod?: string | null;
}

export const GET: APIRoute = async () => {
  const staticPaths = STATIC_PAGE_FILES.map(fileToPath).filter((p): p is string => p !== null);

  const [adminPages, articles, jobs] = await Promise.all([listAdminPages(), listArticles(), listJobs()]);

  const entries: Entry[] = [
    ...staticPaths.map((path) => ({ loc: path === '/' ? origin : `${origin}${path}` })),
    // Published, indexable CMS pages only. isReservedSlug is defence-in-depth —
    // a page can't normally take a reserved slug, but the public route enforces
    // it too, so the sitemap must never advertise a URL that would 404 there.
    ...adminPages
      .filter((p) => p.published && !p.noindex && !isReservedSlug(p.slug))
      .map((p) => ({ loc: `${origin}/${p.slug}` })),
    ...articles.map((a) => ({ loc: `${origin}/resources/${a.slug}`, lastmod: isoDate(a.date) })),
    ...jobs.map((j) => ({ loc: `${origin}/careers/${j.postingId}`, lastmod: isoDate(j.publishedAt) })),
  ];

  // Dedupe on loc (defensive) and give crawlers a stable ordering.
  const seen = new Map<string, Entry>();
  for (const e of entries) if (!seen.has(e.loc)) seen.set(e.loc, e);
  const urls = [...seen.values()].sort((a, b) => a.loc.localeCompare(b.loc));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Crawlers may cache for an hour; content is live from D1 on a miss.
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
