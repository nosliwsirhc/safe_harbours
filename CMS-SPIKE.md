# Self-hosted CMS — architecture & operations

A self-hosted editing console that lets non-technical staff run the site — edit
pages, launch campaign landing pages, manage redirects, configure analytics /
marketing pixels, and set per-form conversions — **without WordPress, without a
third-party CMS, and without a redeploy.** It reuses the careers→D1→SSR pattern
already in the repo.

> **Marketing/editor docs:** see [`docs/marketing-guide.md`](docs/marketing-guide.md)
> for the plain-language, task-oriented guide. This file is the engineering view.

> This started as a spike (hence the filename). It's now the production CMS — the
> original spike limitations (no drafts, shared password, build-time tags) are all
> resolved; see the history below.

## What an editor can do (`/admin`, behind Cloudflare Access)

| Area | Route | What it manages |
|---|---|---|
| Pages | `/admin`, `/admin/edit/<page>` | The fixed site pages, composed from typed blocks |
| Campaign pages | `/admin/pages`, `/admin/pages/<slug>` | DB-driven landing pages (catch-all route) |
| Resources | `/admin/articles`, `/admin/articles/<slug>` | Blog/resource articles |
| Redirects | `/admin/redirects` | Old→new same-origin redirects |
| Settings | `/admin/settings` | Google tag IDs, marketing pixels, form conversions |

Everything is **draft → publish**: edits autosave to a private `draft`; the public
site reads `published`; **Publish** copies draft→published and flushes the edge
cache. The editor previews the draft via `?preview=1` (authed-only).

## Storage (one D1 database, binding `DB` = `safeharbours-jobs`, + R2 `MEDIA`)

| Table | Holds | Schema |
|---|---|---|
| `settings` | key/value: `ga4_id`, `gtm_id`, `marketing_pixels` (JSON), `form_conversions` (JSON) | `db/content-schema.sql` |
| `content_blocks` | fixed-page blocks, one row per (page, slot, position, state) | `db/content-schema.sql` |
| `articles` | resource articles, one row per (slug, state) | `db/content-schema.sql` |
| `pages` | campaign/landing pages, one row per (slug, state); whole page (metadata + `blocks` JSON) in the row | `db/pages-schema.sql` |
| `redirects` | `from_path` (unique) → `to_path` + status | `db/redirects-schema.sql` |

R2 (`MEDIA`) stores editor-uploaded images, resized in the Worker (`/api/admin/upload`).

## How it's built

| Piece | File(s) |
|---|---|
| D1 read/write (graceful, never 500s) | `lib/content.ts`, `lib/articles.ts`, `lib/landing-pages.ts`, `lib/redirects.ts` |
| Editable-pages registry | `lib/pages.ts` |
| Block render engine | `components/BlockRenderer.astro` + the per-kind components |
| Catch-all for campaign pages | `pages/[...slug].astro` |
| Shared live-preview composer (both editors) | `public/assets/composer.js` |
| Admin shell / editors | `layouts/AdminLayout.astro`, `pages/admin/**` |
| Write endpoints (all hardened) | `pages/api/admin/{blocks,publish,settings,upload,pages,pages/publish,redirects,articles,articles/publish}.ts` |
| Tag / pixel / conversion injection | `layouts/ThemeLayout.astro` |
| Consent gating | `components/ConsentBanner.astro` (Google Consent Mode v2 + a `sh-consent-granted` event) |
| Edge cache + flush | `middleware.ts`, `lib/cache.ts`, `lib/cache-key.ts` |
| Auth | `lib/admin.ts` (Cloudflare Access JWT; password path is a fallback) |

### Security model (important)

Every editor-authored value that is **rendered or injected** is validated — the
strict format check *is* the XSS control, so the managers are **preset-only** (an
ID or a path, never a raw `<script>` or HTML field). Validation runs both at write
time (reject) and at inject time (drop), so a bad value can't reach the page even
if it predates the check.

| Value | Validator | Why |
|---|---|---|
| `ga4_id` / `gtm_id` | `lib/tag-ids.ts` | injected raw into an inline `<script>` |
| Marketing pixel IDs | `lib/pixel-ids.ts` | per-vendor ID format |
| Form event names | `lib/form-conversions.ts` | GA4 event-name rules |
| Redirect target / thank-you URL | `lib/redirect-target.ts` (`isSameOriginTarget`) | **same-origin only — NOT `lib/sanitize.sanitizeUrl`, which allows any host → open redirect** |
| Campaign slug | `lib/reserved-slugs.ts` | can't shadow app routes / assets / redirects |
| Block bodies | `lib/clean-block.ts` (+ `lib/sanitize.ts`) | per-field rich-text/plain/URL sanitising |

Write endpoints follow one pattern: validate input → `try/catch` the D1/R2 write →
`console.error` + a friendly error JSON. A write never throws uncaught.

### Edge caching & "live on publish"

Public pages are SSR (`prerender = false`) and read from D1, so an `/admin` edit is
live the moment it's published — no redeploy. The middleware edge-caches the
`200 text/html` responses (`s-maxage=60`, per data centre) so a warm hit costs no
render and no D1 read; **publish flushes** the affected path
(`lib/cache.ts` → `flushPublicPages`). The cache key is built by `lib/cache-key.ts`
(shared by the middleware and the flush so they can't drift) and strips tracking
params so campaign URLs share one entry. See `web/README.md` → *Edge caching* for
the perf/cost trade.

## Run it locally

```bash
cd web
cp .dev.vars.example .dev.vars          # set ADMIN_TOKEN to anything (local password path)
# apply schema + seed to the LOCAL D1 (does not touch production):
npx wrangler d1 execute safeharbours-jobs --local --file=db/content-schema.sql
npx wrangler d1 execute safeharbours-jobs --local --file=db/pages-schema.sql
npx wrangler d1 execute safeharbours-jobs --local --file=db/redirects-schema.sql
db/seed-remote.sh --local               # seed the page content
npm run dev                             # auth + D1 (use astro preview for the edge Cache API)
```

Sign in at `/admin` with your `ADMIN_TOKEN` (locally) — production uses Cloudflare
Access (SSO), so `lib/admin.ts`'s password path is inert there.

## Deploying changes

- **Worker code** auto-deploys on push to `main` (`.github/workflows/deploy.yml`).
- **New D1 tables/columns are NOT applied by CI** — apply the migration to
  production manually (additive `CREATE TABLE IF NOT EXISTS`, so it's idempotent
  and won't touch existing data):

  ```bash
  npx wrangler d1 execute safeharbours-jobs --remote --file=web/db/<schema>.sql
  ```

  Read the remote schema first (`SELECT name FROM sqlite_master WHERE type='table'`)
  to see what's needed. Settings keys (`marketing_pixels`, `form_conversions`)
  auto-create on first save, so they need no migration.

## What's deliberately NOT built

- **A/B testing.** At this traffic the binding constraint is statistical power, not
  tooling, and a variant-keyed edge cache adds correctness risk for little near-term
  value. Use two campaign pages + distinct form event names and compare conversion
  trends instead. Revisit when traffic justifies the formal framework.
- **Campaign pages in the main nav.** They're standalone + out-of-nav by default
  (`in_nav` column exists but isn't wired into navigation yet).
- **A dynamic sitemap for campaign pages.** They default to `noindex`; indexable
  ones aren't auto-added to `@astrojs/sitemap` (build-time) — a follow-up.

## History (spike → production)

`f4f7373` editable pages + articles · `4356efa`/`2e807aa`/`7e02492` edge caching +
flush · `534d3f0` analytics/Consent Mode v2 · `1c9e381`/`5c25d99`/`1c7a5bf`
Cloudflare Access · campaign pages, redirects, pixels, conversions, the `gtm_id`
XSS fix, and the write-handler hardening (the "marketing gaps" series).
