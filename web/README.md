# Safe Harbours — web app architecture

The Safe Harbours website: an [Astro 6](https://astro.build) app deployed as a
**Cloudflare Worker**. This document explains how the whole thing is wired up so
a future maintainer can work on it confidently.

- **Live:** https://www.safeharbours.ca (apex `safeharbours.ca` 301s to www)
- **Worker:** `safe-harbours-web` · preview at `safe-harbours-web.chrisjwilson1984.workers.dev`
- **Deploy:** push to `main` → GitHub Actions builds + `wrangler deploy`

---

## 1. Where this site came from (the mental model)

The site was originally a **WordPress theme**. It was "mirrored" — the live WP
HTML + theme CSS were captured into `_mirror/` — so the Astro build could serve a
**pixel-identical** copy. We've since componentized most of it, but two ideas
carry through and explain a lot of the unusual choices:

1. **Faithful to the captured output.** Where markup is still mirrored, we
   reproduce it byte-for-byte (WordPress quirks included). Changes are verified
   with `scripts/diff-built.mjs`, which diffs the built HTML before/after a change
   and ignores only intended differences.
2. **SSR for editable content, static for the rest.** Pages whose content is
   editor-managed in `/admin` — the marketing/content pages (`/`, `/our-story`,
   `/about-fostering`, `/become-a-foster-parent`, `/our-impact`,
   `/program-description`, `/contact-us`, `/book-an-appointment`, …), the resource
   articles, the careers board, and the DB-driven campaign pages — run on the
   Worker (`export const prerender = false`) and read their copy from D1, so an
   `/admin` edit goes live **the moment it's published, with no redeploy**. Purely
   static pages (legal/utility) stay prerendered. The contact/subscribe API routes
   are also `prerender = false`.

   **Perf/cost trade.** SSR pages would re-run the render + a D1 read on every hit,
   so the middleware **edge-caches** them (`s-maxage=60`, see *Edge caching* below):
   a repeat visit in a warmed data centre is served from the edge with **no Worker
   render and no D1 read** — close to static-CDN latency. The cost vs. fully static
   is bounded: at most one render + one D1 read per path per data centre per 60 s
   (plus the cache miss after a publish, which `flushPublicPages` triggers
   immediately so edits don't wait out the TTL). For this site's traffic that's a
   negligible number of D1 reads; the win is that editors never need an engineer to
   redeploy. Turn a page back to fully static only if it has no editable content.

What's componentized vs still a mirrored blob, today:

| Area | How it's built |
|---|---|
| Page chrome (header, footer, off-canvas nav, `<head>` styles) | Astro components (`SiteHeader`, `SiteFooter`, `OffCanvasNav`, `SiteHead`) |
| Resource articles (`/resources/<slug>`) | **Markdown content collection** + `[slug].astro` + components |
| `/resources` index | `ResourcesIndex` component (cards from the collection) |
| ~12 "marketing" pages (home, about, contact, …) | Still mirrored HTML blobs in `_mirror/*.main.html`, injected via `set:html` |

---

## 2. Tech stack

- **Astro 6** with the **`@astrojs/cloudflare`** adapter (output: a Worker +
  static assets served via the `ASSETS` binding).
- **No UI framework** — plain `.astro` components, HTML, and a little vanilla JS.
- **Tailwind/CSS:** none of that — styling is the captured WordPress theme CSS
  (Foundation + WP block library), heavily purged. See [§9](#9-css).
- **Email:** [Resend](https://resend.com) (HTTP API, called from the Worker).
- **Spam protection:** Cloudflare **Turnstile** + a honeypot field.
- **Images:** `sharp` pre-generates responsive AVIF/WebP at build-authoring time.

---

## 3. Project layout

```
web/
├── astro.config.mjs        Cloudflare adapter; passthrough image service
├── public/
│   ├── _redirects          Cloudflare redirects (RELATIVE urls only)
│   ├── _headers            cache-control rules for /assets/*
│   └── assets/             self-hosted theme CSS/JS, uploads, + generated image variants
│       ├── theme/build/app.css   the (purged) WordPress theme CSS
│       ├── a11y-overrides.css    our hand-authored CSS layered on top
│       ├── forms.js              client glue for all forms (see §6)
│       └── uploads/…             images + their -<w>.avif / -<w>.webp variants
├── _mirror/
│   ├── <page>.main.html    body of a not-yet-componentized marketing page (set:html)
│   └── <page>.meta.json    per-page <head> data: { title, description, bodyClass, styles[], script }
├── src/
│   ├── layouts/ThemeLayout.astro   the one layout — builds <html>, composes chrome
│   ├── components/                 chrome + article components (see §4, §5)
│   ├── content.config.ts           the `resources` content collection schema
│   ├── content/resources/*.md      the 12 resource articles (frontmatter + body)
│   ├── pages/                      routes (see below)
│   ├── data/                       site facts, nav menus, generated image manifest
│   ├── lib/                        email rendering, form/email validation, helpers
│   └── styles/wp-inline-head.html  the shared inline <head> CSS (deduped)
├── scripts/                        build/maintenance scripts (see §11)
└── package.json
```

### Routes (`src/pages/`)
- `index.astro`, `about-fostering.astro`, `contact-us.astro`, … — thin wrappers
  that render a marketing page (`<ThemeLayout name="…"/>`).
- `resources.astro` — the `/resources` index (`<ThemeLayout><ResourcesIndex/></ThemeLayout>`).
- `resources/[slug].astro` — **one** dynamic route that renders all 12 articles
  from the content collection.
- `api/contact.ts`, `api/subscribe.ts` — the on-demand Worker endpoints.

---

## 4. How a page renders: `ThemeLayout`

`src/layouts/ThemeLayout.astro` is the single layout. Every page goes through it.
It takes a `name` (the mirror key) and optional `title`/`description`, then:

1. Loads `_mirror/<name>.meta.json` (at **build time**, via `import.meta.glob`)
   for the page's `<title>`, description, `bodyClass`, ordered stylesheet list
   (`styles[]`), and theme script. *(The Cloudflare prerender runtime has no
   `node:fs`, so everything is inlined at build with Vite's `?raw`/glob — never
   read from disk at render time.)*
2. Builds `<head>`: meta/OG tags, fonts, the page's `styles[]`, `a11y-overrides.css`
   (content-hashed for cache-busting via `ver()`), and `<SiteHead/>` (the shared
   inline WP `<head>` CSS, deduped to one file).
3. Builds `<body>`: the skip link, the off-canvas wrapper, then composes the
   chrome around the page's main content:

```astro
<div class="off-canvas-wrapper">
  <OffCanvasNav path={cleanPath} />            ← mobile menu
  <div class="off-canvas-content">
    <SiteHeader path={cleanPath} />            ← logo + desktop nav + hamburger
    <main><div id="content">
      { Astro.slots.has('default')             ← componentized pages pass children…
          ? <slot />
          : <Fragment set:html={mainHtml} /> } ← …others get the mirrored blob
    </div></main>
    <SiteFooter path={cleanPath} />            ← footer nav + newsletter form
  </div>
</div>
<ConsentBanner />
<script src={theme app.js} />                   ← Foundation (off-canvas, equalizer)
<script src={forms.js} />                        ← our form glue (§6)
```

The `<slot/>`-vs-`mainHtml` branch is the key seam: **componentized pages**
(`resources/[slug]`, `resources`) pass their content as children; **marketing
pages** fall back to injecting `_mirror/<name>.main.html`.

### Chrome components
- **`SiteHeader`** / **`OffCanvasNav`** — logo, desktop nav, hamburger / mobile
  panel. Both render the **same** menu from `src/data/nav.ts` via `SiteNav`.
- **`SiteFooter`** — footer menus, contact info, the **newsletter form**, and the
  social links. Markup mirrors the theme (the off-canvas + footer markup is what
  Foundation's `app.js` binds to, so IDs/`data-*` are preserved exactly).
- **`SiteNav`** — renders one menu (`<ul>` of `NavItem`s) and marks the active
  item from `Astro.url.pathname` (the original theme never *styled* the active
  state, but we still set `aria-current="page"` for accessibility).
- **`SiteHead`** — `set:html`s `src/styles/wp-inline-head.html` (the WP inline
  `<head>` CSS that used to be byte-identical on every page; now stored once).
- **`ConsentBanner`** — cookie-consent UI (the only component with its own
  authored `<style>` block).

`src/data/nav.ts` is the **single source of truth for navigation** — header,
off-canvas, and footer menus all read from it.

---

## 5. Resource articles (the Markdown content collection)

Resource articles work like a normal Astro content collection — **adding an
article = adding a Markdown file**.

- **Schema:** `src/content.config.ts` defines the `resources` collection with
  frontmatter: `title`, `heroImage`, `thumbnail?`, `excerpt?`, `date`, `author`,
  `related: string[]`, `indexOrder?`.
- **Files:** `src/content/resources/<slug>.md`. Bodies are Markdown **plus raw
  HTML** where Markdown can't express the original formatting (centered blocks,
  tables, `target="_blank"` links) — those are preserved verbatim.
- **Route:** `src/pages/resources/[slug].astro` uses `getCollection('resources')`
  + `render()` and renders `<Content/>` inside `<ResourceArticle>`.
- **`ResourceArticle`** composes the article template: `ArticleHero` (title +
  hero image) → the prose `<slot/>` → `AuthorCard` + `ShareLinks` → `RelatedPosts`.
  The prose lands inside `<article>` so the theme's `.blog-single article h2/p/ul`
  styles apply.
- **`PostCard`** renders a card for any article slug, read from the collection
  (single source of truth — the same data powers an article's related-posts **and**
  the `/resources` index cards). `cardMeta()` in `src/lib/format.ts` formats the
  card date (e.g. `Mar 3rd 2026 By Safe Harbours`).

### The `/resources` index (`ResourcesIndex`)
Mostly verbatim theme markup (hero + FacetWP facet placeholders + featured post
+ newsletter signup form), with the **card grid driven by the collection**
(articles that have an `indexOrder`, in order). Two notes:
- The **FacetWP search box + category dropdown** are dynamic WordPress-plugin
  widgets; the mirror captured them as empty `<div>`s. They do **not** function on
  the static site (no live-search/filtering). The article cards/listing are all
  reachable; only the live filter is absent.
- The captured theme left `.feature-post__container` **unclosed**; we reproduce
  that exactly (a raw `<Fragment set:html="<div …>">`). Don't "fix" it — it'll
  break the byte-for-byte diff and the browser already auto-closes it.

---

## 6. Forms & the newsletter (how it all works)

There are three forms on the site, all sharing one client script and the same
contract:

| Form | Lives in | Posts to |
|---|---|---|
| Contact / appointment | mirrored marketing blobs — `contact-us`, `become-a-foster-parent`, `book-an-appointment` (each tags itself via `data-role`, e.g. `Recruitment: Foster Parents`) | `/api/contact` |
| Newsletter (footer, every page) | `SiteFooter.astro` | `/api/subscribe` |
| Resources sign-up | `ResourcesIndex.astro` | `/api/subscribe` |

### Client side — `public/assets/forms.js`
Loaded by `ThemeLayout` on every page. It's **generic** (no per-form config):

1. **Turnstile:** finds every `.cf-turnstile` widget, sets its `data-sitekey` to
   `window.__TS_KEY` (injected by `ThemeLayout` from `PUBLIC_TURNSTILE_SITE_KEY`),
   then loads the Turnstile API, which auto-renders the widgets and injects each
   form's hidden `cf-turnstile-response` input.
2. **Binding `form.sh-form`:** each form declares its target via
   `data-endpoint` (`/api/contact` or `/api/subscribe`), its success message via
   `data-success`, and uses **semantic field names** (`first`, `last`, `email`,
   `phone`, `msg`, `name`, `city`). The script validates required fields +
   email/phone formats (driven by the `required` attribute and field type/name),
   formats the phone as you type, POSTs JSON, and shows inline field errors or an
   inline success state. It also tells password managers to ignore the fields
   (`data-1p-ignore` etc.) and gives autoplay videos a scroll-to-play loader.
3. **Honeypot:** a hidden field named `company` (newsletter) / `hp` (contact).
   Real users leave it empty.

### Server side — `src/pages/api/contact.ts` and `subscribe.ts`
Both are `prerender = false` (run on the Worker), read env via
`import { env } from 'cloudflare:workers'`, and follow the same gate:

1. **Honeypot** filled → silently return `{ ok: true }` (pretend success).
2. **Verify Turnstile** — POST the `token` + `TURNSTILE_SECRET_KEY` to
   `siteverify`. Fail → `400 "Verification failed…"`.
3. **Validate** (`src/lib/form.ts`): `isValidEmail`, `isValidPhone` (10-digit NANP).
4. **Act:**
   - **Contact:** render a branded HTML email (`src/lib/email.ts` `renderEmail()`)
     and `POST https://api.resend.com/emails` to `CONTACT_TO`
     (default `info@safeharbours.ca`), `reply_to` the sender, subject prefixed
     with the inquiry category.
   - **Subscribe:** `POST https://api.resend.com/contacts` to add the subscriber
     to the account's Resend Contacts (upsert by email; records a `source`
     property — "Newsletter (footer)" vs "Resources sign-up"). **If that fails**,
     it falls back to emailing the team so no signup is lost.

### Turnstile keypair — the easy thing to get wrong
The **site key** (`PUBLIC_TURNSTILE_SITE_KEY`, baked into the build) and the
**secret key** (`TURNSTILE_SECRET_KEY`, a Worker secret) **must be the pair from
the same Turnstile widget**, and that widget's **Hostname Management must include
`www.safeharbours.ca`** (and the `*.workers.dev` preview, for testing). If the
keys are from different widgets, or the hostname isn't listed, the widget won't
render / tokens won't validate and forms silently fail. (Note: Turnstile blocks
automated browsers by design — test form submission as a real human, not headless.)

### Secrets/vars the forms need
- **Worker secrets:** `RESEND_TOKEN`, `TURNSTILE_SECRET_KEY`, optional
  `CONTACT_TO` / `CONTACT_FROM`.
- **Build var (GitHub Actions):** `PUBLIC_TURNSTILE_SITE_KEY`.
- In `npm run dev` with no secrets, endpoints return `{ ok: true, dev: true }`
  without sending, and Turnstile uses Cloudflare's always-pass test key.

---

## 7. Images (responsive AVIF/WebP)

`astro.config.mjs` uses `passthroughImageService()` — Astro does **not** transform
images. Instead we pre-generate variants and rewrite references:

- **`npm run images`** (`scripts/images.mjs`) — scans every `/assets/*.jpg|png`
  referenced in `_mirror`, `src`, and `public/assets`, then generates
  `<name>-<w>.avif` and `.webp` at widths `[640,1024,1440,1920]` (+ a source-width
  variant capped at 1920). Originals stay as the fallback. It also writes the
  width manifest `src/data/image-variants.ts`. **Run it after adding/replacing an
  upload.**
- **`<img>` → `<picture>`:** `scripts/rewrite-images.mjs` (one-time) wrapped every
  upload `<img>` in the mirror blobs in a responsive `<picture>` (AVIF/WebP
  `srcset` + original fallback). SVGs are left alone.
- **CSS backgrounds → `image-set()`:** `src/lib/img.ts` `bgImageSet(src, maxWidth)`
  builds an `image-set(avif, webp, original)` using the manifest (it can't scan
  disk — no `node:fs` at render). Used by `ArticleHero`, `PostCard`,
  `ResourcesIndex`, and baked into the blobs by `scripts/rewrite-backgrounds.mjs`.

Generated variants are committed under `public/assets/`. (Cut the homepage's
image transfer from ~4.6 MB to ~175 KB.)

---

## 8. Redirects & headers

- **`public/_redirects`** — Cloudflare static-asset redirects. **Only RELATIVE
  URLs are allowed here** (Workers limitation), so it holds path aliases
  (`/blog` → `/resources`) and old WordPress asset paths
  (`/wp-content/uploads/*` → `/assets/uploads/:splat`). Page slugs match the old
  WP paths 1:1, so no content-URL redirects are needed.
- **Apex → www** is a cross-host redirect, which `_redirects` can't do — it's a
  **Cloudflare zone Redirect Rule** (configured in the dashboard, not in the repo).
- **`public/_headers`** — cache headers for static assets: `immutable` (1 year)
  for `/_astro/*` (content-hashed bundles) and `/assets/uploads/*`; shorter for
  theme CSS/JS. `_headers` only applies to **static** assets, not Worker-rendered
  responses — those are handled in middleware (below).

### Edge caching (`src/middleware.ts`)

Public pages are server-rendered on demand and read their copy from D1.
Cloudflare does **not** cache Worker-generated responses automatically, so the
middleware caches them itself with the **Cache API** (`caches.default`):

- On a public `GET`, it serves a stored copy if present, otherwise renders and
  stores the `200 text/html` response for **`s-maxage=60`** (per data centre).
  Repeat hits are served from the edge with **no D1 read**.
- **Never cached:** `/admin` and `/api` (`private, no-store`), `/media` (caches
  itself), anything with a `Set-Cookie`, and — importantly — **any request with
  the `sh_admin` cookie or a `?preview=…` param**. The admin preview loads the
  public URL with `?preview=1` to render the *draft*, so caching it would both
  show editors stale drafts and leak unpublished drafts to the public. Editors
  therefore always bypass the cache and see live content the moment they publish.
- A cached hit must be **copied into a fresh `Response`** before returning —
  Cache API responses have immutable headers (see [§13](#13-gotchas--things-to-know)).
- An **`x-edge-cache: HIT|MISS`** header is added so caching is observable
  (`cf-cache-status` is *not* emitted for Cache API hits).

**Flush on publish** (`src/lib/cache.ts`): publishing a page/article (or deleting
an article) calls `flushPublicPages()`, which does a per-data-centre
`caches.default.delete()` for the affected URLs and, if `CF_PURGE_TOKEN` +
`CF_ZONE_ID` are set as Worker secrets, a global Cloudflare purge-by-URL. Without
the token, global staleness is bounded by the 60 s TTL.

> **Zone setting:** Cloudflare's **Browser Cache TTL** (Caching → Configuration)
> floors the browser-facing `max-age`. With it set to "4 hours" the pages'
> `max-age=0` is rewritten to `14400`, so returning visitors' browsers can hold a
> page for 4 h (the edge cache + flush are unaffected). Set it to **"Respect
> Existing Headers"** if you want the publish-flush to reach returning browsers.

---

## 9. CSS

- **`public/assets/theme/build/app.css`** — the WordPress theme CSS (Foundation +
  WP blocks), **purged** with PurgeCSS against the actual markup (≈270 KB → 196 KB).
  Re-run `node scripts/purge-css.mjs` if `app.css` is ever re-captured.
- **`public/assets/a11y-overrides.css`** — our hand-authored CSS layered last.
- **`src/styles/wp-inline-head.html`** — the WP inline `<head>` CSS, deduped.
- **Linting:** `npm run lint:css` (stylelint) covers only **authored** CSS
  (`a11y-overrides.css` + `ConsentBanner`'s `<style>`); vendor/minified/mirror CSS
  and the verbatim chrome components are in `.stylelintignore`.
- **`npm run analyze:css`** prints size/rule stats + a dead-rule estimate.

---

## 10. Build, deploy & local dev

### Local
```bash
cd web
npm install --ignore-scripts   # REQUIRED: sharp's native postinstall fails here;
                               # it's pulled in transitively by astro and not
                               # needed at build (passthrough images).
npm run dev                    # http://localhost:4321
```

### Build / serve the built Worker
```bash
npm run build
npx wrangler dev --config dist/server/wrangler.json
```
`@astrojs/cloudflare` generates `dist/server/wrangler.json` on every build — so
Worker config (routes, custom domains) is **not** kept there; it lives in the
Cloudflare dashboard and persists across deploys.

### Deploy (CI)
Push to `main` → `.github/workflows/deploy.yml` builds `web/` and runs
`wrangler deploy`. Required config:
- **GitHub Actions secrets:** `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit),
  `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`.
- **Worker secrets** (`wrangler secret put …`): `RESEND_TOKEN`,
  `TURNSTILE_SECRET_KEY`, optional `CONTACT_TO`/`CONTACT_FROM`.

Going live / DNS cutover details: see **`../docs/go-live.md`**.

---

## 11. Scripts reference (`web/scripts/`)

| Script | npm | Purpose |
|---|---|---|
| `images.mjs` | `npm run images` | Generate AVIF/WebP variants + manifest (re-runnable) |
| `rewrite-images.mjs` | — | One-time: wrap mirror `<img>`s in `<picture>` |
| `rewrite-backgrounds.mjs` | — | One-time: convert blob CSS backgrounds to `image-set()` |
| `purge-css.mjs` | — | Purge unused rules from `app.css` (re-run after re-mirror) |
| `analyze-css.mjs` | `npm run analyze:css` | CSS size/rule/dead-rule report |
| `diff-built.mjs` | — | Verify a change is HTML-equivalent to a prior build |
| `split-main.mjs` | — | One-time migration helper (mirror body → `*.main.html`) |

`diff-built.mjs <before-dist> <after-dist>` is the verification harness: build
`dist/` before and after a change and diff, normalizing only intended differences.

---

## 12. Common tasks

- **Add/edit a resource article:** add/edit `src/content/resources/<slug>.md`
  (frontmatter + body). Set `indexOrder` to show it on `/resources`; set `related`
  to control its related-posts. New hero/thumbnail image? add it under
  `public/assets/…` and run `npm run images`.
- **Edit navigation:** `src/data/nav.ts` (updates header, off-canvas, footer).
- **Edit footer contact info / social:** `src/components/SiteFooter.astro`.
- **Edit a marketing page** (home, about, …): these are still mirrored blobs —
  edit `_mirror/<page>.main.html`. (Componentizing them is the remaining cleanup.)
- **Replace an image:** drop the new file in `public/assets/…`, run `npm run images`,
  redeploy.
- **Change where contact email goes:** set the `CONTACT_TO` Worker secret.

---

## 12b. Careers / jobs board

`/careers` is **SSR** (`prerender = false`): it reads open postings from a dedicated D1
database (`safeharbours-jobs`, bound via `web/wrangler.jsonc`) and renders the live
openings into the old job-widget slot, plus per-posting detail pages at
`/careers/[postingId]` with `JobPosting` structured data. Reads are graceful — any D1
error falls back to a "no openings" state, so the page never 500s. The site only ever
*reads* D1; it has no SharePoint credentials.

The data is produced by the **`jobs-sync`** worker (`../jobs-sync/`), which projects the
HR SharePoint Job Postings lists into that D1 (override resolution + publish gate +
sanitize), refreshed by a Power Automate webhook and a 6h cron. See
`../jobs-sync/README.md` and the launch steps in `../docs/jobs-launch-checklist.md`.

## 13. Gotchas / things to know

- **No `node:fs` at render time** (Cloudflare prerender runs in a Workers
  runtime). Anything read from disk must be inlined at build (`import.meta.glob`,
  `?raw`) or precomputed into a data file (e.g. the image manifest).
- **`--ignore-scripts` on every install** — sharp's native build fails here.
- **Marketing pages aren't byte-faithful forever:** if you edit `_mirror/*.main.html`,
  verify with `diff-built.mjs` against a prior build.
- **Turnstile** — see [§6](#turnstile-keypair--the-easy-thing-to-get-wrong).
- **The apex must redirect via Cloudflare, not WordPress** — until the apex
  Redirect Rule + proxied record are confirmed, `safeharbours.ca` depends on the
  old WP host (see `../docs/go-live.md`).
- **Cache API responses have immutable headers, and the *runtime* enforces it but
  Miniflare/dev does not.** Returning a `caches.default.match()` response directly
  throws "Can't modify immutable headers" the moment Astro sets a header
  downstream — a **production-only 500 that passes lint, build, and `astro dev`.**
  Always copy a cached response into a new `Response` before returning it (see
  `src/middleware.ts`). Verify edge-cache changes against the **production custom
  domain** (the Cache API is a no-op on `*.workers.dev`, so the hit path can't be
  exercised in preview).
