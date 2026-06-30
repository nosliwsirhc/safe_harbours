// Guards the slug namespace for DB-driven campaign pages (the catch-all route
// src/pages/[...slug].astro and the /api/admin/pages write endpoint).
//
// Astro's router already ranks static + named-dynamic routes ABOVE the [...slug]
// catch-all, so a DB page can't actually override /our-story or /resources/x at
// request time. This is defence-in-depth + an authoring guard: it stops an editor
// from creating a page whose slug *looks* like it owns a real URL (which would be
// confusing dead content), and it blocks asset / system / redirect-alias prefixes
// so a campaign page can never sit where a redirect or static asset is expected.
import { EDITABLE_PAGES } from './pages';

const norm = (slug: string): string =>
  slug.trim().toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');

// First-path-segment prefixes that belong to the app, assets, or system routes.
// A slug under any of these is reserved no matter how deep it goes.
const RESERVED_PREFIXES = new Set([
  'admin',
  'api',
  'media',
  'assets',
  'images',
  'fonts',
  'wp',
  'wp-content',
  'wp-includes',
  'wp-json',
  'wp-admin',
  'cdn-cgi',
  '_astro',
  '_image',
  '_server-islands',
  '_actions',
  'careers', // jobs-board dynamic route tree
  'resources', // articles dynamic route tree
]);

// Exact paths that already resolve to something: the special files at the root,
// the redirect-rule sources in public/_redirects, and every fixed page path.
const RESERVED_EXACT = new Set<string>([
  '',
  'index',
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'sitemap-index.xml',
  'site.webmanifest',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  // public/_redirects "from" paths (keep in sync with that file).
  'home',
  'contact',
  'complaints',
  'blog',
  'thank-you',
  // Static routes that aren't in the editable registry.
  'resources',
  'careers',
  // Every editable fixed page path (e.g. "our-story", "program-description/complaints").
  ...EDITABLE_PAGES.map((p) => norm(p.path)),
]);

/** True if `slug` collides with an app route, asset prefix, redirect alias, or fixed page. */
export function isReservedSlug(slug: string): boolean {
  const s = norm(slug);
  if (s === '') return true; // the home page is not a campaign slug
  if (RESERVED_EXACT.has(s)) return true;
  const firstSegment = s.split('/')[0];
  return RESERVED_PREFIXES.has(firstSegment);
}

// A campaign slug an editor may create. Lowercase, segments of [a-z0-9-], one or
// more segments separated by single slashes — matches the look of the site's
// existing URLs and can't smuggle in "..", encoded chars, or a leading slash.
const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** True if `slug` is a well-formed, non-reserved campaign slug. */
export function isValidCampaignSlug(slug: string): boolean {
  const s = norm(slug);
  return s.length > 0 && s.length <= 120 && SLUG_SHAPE.test(s) && !isReservedSlug(s);
}
