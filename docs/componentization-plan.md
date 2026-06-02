# Componentization refactor — plan for review

**Status:** proposal (no code changed yet)
**Branch:** `css-optimization`
**Scope of this doc:** Phase 1 — extract shared page *chrome* into Astro
components. Phase 2 (per-page content components) is sketched but out of scope.

---

## 1. Why

Today every page is a 3-line wrapper that injects a frozen HTML blob through
`ThemeLayout`'s `set:html`. There is exactly one real component (`ConsentBanner`).
Measured across the 25 mirrored pages:

- **`<head>` inline styles: 100% byte-identical** — the same ~15 KB of WordPress
  inline CSS copied into all 25 pages.
- **`<header>` (~2.5 KB), off-canvas nav, `<footer>` (~6.9 KB): identical** except
  (a) the active nav `<li>` + `aria-current`, (b) a frozen browser-sniff class
  (`gf_browser_chrome` vs `gf_browser_gecko` — a meaningless capture artifact on
  25 pages), (c) the footer backlink's `utm_source`.
- ~36% of each page body is duplicated chrome; only `<main>` is unique.

The cost is **maintainability, not bytes**: there is no single source of truth.
Changing a nav link, the footer address, or removing the browser-sniff artifact
means hand-editing 25 files. Components fix exactly this.

**Principles for the refactor:**
1. **Pixel-faithful** — components must emit HTML that is identical (modulo the
   intended, now-correctly-generated active-nav state) to what ships today.
2. **Single source of truth** — nav links and chrome markup defined once.
3. **Incremental & verifiable** — each step builds green and is diff-checked
   against the current output before moving on.
4. **Preserve all JS hooks** — Foundation (off-canvas, equalizer) and Gravity
   Forms bind to specific IDs / `data-*` attributes; these must survive verbatim.

---

## 2. Current structure (as found)

```
src/
  layouts/ThemeLayout.astro   injects head (glob) + body blob (glob) + scripts
  components/ConsentBanner.astro
  pages/*.astro               25 × 3-line <ThemeLayout name="…"/> wrappers
  data/site.ts                site facts (name, address, social, …)
_mirror/
  <page>.head.html            inline <style> blocks  (all 25 identical)
  <page>.body.html            full body markup        (chrome + unique <main>)
  <page>.meta.json            { bodyClass, title, description, styles[], script }
```

Body DOM skeleton (identical wrapper on every page):

```
<a class="a11y-skip-content-link" href="#content">Skip To Content</a>
<div class="off-canvas-wrapper">
  <div id="offCanvas" class="off-canvas position-right hide-for-large"
       data-off-canvas data-transition="overlap"> … mobile nav … </div>
  <div class="off-canvas-content" data-off-canvas-content>
    <header class="site-header" role="banner"> … logo · nav · hamburger … </header>
    <main class="site-content"><div id="content" class="site-content__start">
        … UNIQUE PAGE CONTENT …
    </div></main>
    <footer> … footer nav · newsletter Gravity Form · decorative SVG … </footer>
  </div>
</div>
```

---

## 3. Target structure

```
src/
  layouts/ThemeLayout.astro     owns <html><head> + body wrappers; composes chrome
  components/
    ConsentBanner.astro         (unchanged)
    SiteHeader.astro            <header.site-header> — logo, desktop nav, hamburger
    SiteFooter.astro            <footer> — footer nav, newsletter form, SVG
    OffCanvasNav.astro          #offCanvas mobile panel
    SiteNav.astro               renders a menu from nav data + active state (shared
                                by header / off-canvas / footer)
    HeadStyles.astro            the shared inline <head> CSS, defined once
  data/
    site.ts                     (unchanged)
    nav.ts                      NEW — single source of truth for menu structure
_mirror/
  <page>.main.html              NEW — just the unique <main> inner content
  <page>.meta.json              (unchanged; chrome no longer read from here)
  # <page>.head.html / .body.html retired once split is verified
```

Page wrapper stays a thin 3-liner; `ThemeLayout` becomes:

```astro
<body class={meta.bodyClass}>
  <a class="a11y-skip-content-link" href="#content">Skip To Content</a>
  <div class="off-canvas-wrapper">
    <OffCanvasNav path={Astro.url.pathname} />
    <div class="off-canvas-content" data-off-canvas-content>
      <SiteHeader path={Astro.url.pathname} />
      <main class="site-content"><div id="content" class="site-content__start"
        set:html={mainHtml} /></main>
      <SiteFooter path={Astro.url.pathname} />
    </div>
  </div>
  <ConsentBanner />
  … scripts …
</body>
```

---

## 4. Active-nav strategy

- `src/data/nav.ts` exports the menus (header primary, header secondary, footer
  menu 1, footer menu 2, social) as `{ id, label, href }[]`.
- `SiteNav` marks the item whose `href` matches `Astro.url.pathname` (normalized
  for trailing slash / `index.html`, matching the existing `cleanPath` logic in
  `ThemeLayout`) with the active classes + `aria-current="page"`.
- **To verify before coding:** which active classes the *purged* `app.css` actually
  styles. The purge safelist kept `…active$`, so `.active` / `.current-menu-item`
  rules likely survived. We reproduce the minimal set the CSS uses (probably
  `current-menu-item active` + `aria-current="page"`); the WP `page-item-NN` /
  `current_page_item` classes are almost certainly cosmetic-only and can be
  dropped — confirmed by grepping the purged CSS.

---

## 5. Migration steps (each builds green + is diff-verified)

1. **Capture canonical chrome.** From one representative `body.html`, extract the
   exact `<header>`, `<footer>`, and `#offCanvas` markup into the new components
   verbatim (keep all IDs / `data-*` / SVG). Replace only the menu `<ul>`s with
   `<SiteNav menu={…} path={path} />`, and drop the `gf_browser_*` class.
2. **Build `nav.ts`** from the menu markup (IDs + labels + hrefs).
3. **Shared head.** Move the identical inline `<head>` CSS into `HeadStyles.astro`;
   `ThemeLayout` renders it once instead of globbing per-page head files.
4. **Split content.** Add `scripts/split-main.mjs` (idempotent) to extract the
   `<main>`→`#content` inner HTML from each `body.html` into `<page>.main.html`.
   `ThemeLayout` switches to glob the `.main.html`.
5. **Wire `ThemeLayout`** to the new structure (section 3).
6. **Verify** (section 6). Once green, retire the now-unused `.head.html` /
   `.body.html` artifacts.

Order matters: 1–3 add components without changing output (chrome still also comes
from the blob until step 4 removes it), so regressions localize cleanly.

---

## 6. Verification strategy

- **Build green:** `npm run build` after each step.
- **HTML equivalence:** build `dist/` before (current `main` of this branch) and
  after; for each page, normalize away the *known intentional* diffs (active-nav
  classes, `utm_source`, the removed `gf_browser_*`) and `diff` the result. Goal:
  zero *unexpected* differences. A small `scripts/diff-built.mjs` automates this.
- **Active state correctness:** assert each page marks exactly its own nav item
  active (the thing WP baked in, now generated).
- **JS smoke test:** serve `dist/` and confirm the mobile off-canvas opens/closes,
  the footer equalizer lines up, and the newsletter form still submits (forms.js +
  Turnstile bind to the preserved `#gform_wrapper_1` markup). The `verify` skill /
  Chrome DevTools MCP can drive this.
- **CSS still clean:** `npm run lint:css`; re-run `npm run analyze:css` (rule count
  unchanged — we're not touching `app.css` here).

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Foundation off-canvas/equalizer break** — `app.js` auto-inits on `#offCanvas`, `data-off-canvas`, `data-toggle`, `data-equalizer`. | Keep IDs/`data-*`/nesting byte-identical; the DevTools smoke test covers open/close + equalize. |
| **Gravity Forms newsletter stops binding** — forms.js + GF target `#gform_wrapper_1`, `#gf_1`, field IDs. | Move the form markup into `SiteFooter` verbatim (no re-IDing). Submit test in verification. |
| **Active-class CSS dependency** — wrong/missing active class changes nav appearance. | Grep purged `app.css` for the active selectors first; reproduce exactly that set. |
| **Head consolidation assumption** — all 25 heads are identical *today*; a future page might need page-specific inline CSS. | Phase 1 emits the shared head byte-identical. If a page ever needs extra head CSS, support an optional per-page `headExtra` slot. |
| **Cache busting** — `ThemeLayout` hashes `a11y-overrides.css`/`forms.js` for cache invalidation. | Extend the same `ver()` hashing to any new shared CSS asset so edits bust the 1-day cache. |
| **Trailing-slash / path matching** for active state. | Reuse the existing `cleanPath` normalization already in `ThemeLayout`. |

---

## 8. Out of scope (Phase 2, later)

Per-page `<main>` content stays mirrored HTML in Phase 1. Once the chrome is
componentized, recurring `<main>` patterns are the next candidates:
`Hero`, `FeatureRow`, `CTABanner`, `ResourceCard` / card grids, and the resource
article template (12 of the 25 pages are resource articles with near-identical
structure). These become props-driven components, at which point the `.main.html`
blobs can be replaced by real Astro content page-by-page.

---

## 9. Estimated surface

- **New files:** ~6 components + `nav.ts` + 2 scripts (`split-main`, `diff-built`).
- **Changed:** `ThemeLayout.astro`, the 25 `.main.html` (generated), retire 50
  `.head/.body.html`.
- **Untouched:** `app.css` and the rest of the CSS work, page wrappers, `site.ts`.
- **Risk profile:** low — output is verifiably pixel-equivalent; changes are
  additive until the final switch-over step.
