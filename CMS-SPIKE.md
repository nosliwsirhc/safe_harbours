# CMS spike — editable content + Google tags from D1

A small proof that we can give an editing **console** (login, edit, drag-to-reorder)
without WordPress, without a third-party CMS, and without a rebuild — reusing the
exact careers→D1→SSR pattern already in the repo.

## What it does

Designed for **non-technical editors** — plain language, no "blocks/slots/HTML".

- **`/admin`** — password-gated. Lists the pages you can edit.
- **`/admin/edit/<page>`** — the **live-preview editor**: a plain-language list of
  sections on the left (edit text, **drag to reorder**, add/remove) and the real
  page on the right that reloads the instant a change **autosaves**.
- **`/admin/settings`** — Google Analytics / Tag Manager ids, autosaved, injected
  site-wide from the page `<head>`.
- **`/our-story`** — SSR; renders the editable sections above the mirrored
  content. Edits appear immediately (no rebuild).

## How it's built (all mirrors existing conventions)

| Piece | File |
|---|---|
| D1 schema (`settings`, `content_blocks`) | `web/db/content-schema.sql` |
| D1 read/write (like `lib/jobs.ts`) | `web/src/lib/content.ts` |
| Editable-pages registry (friendly names) | `web/src/lib/pages.ts` |
| Auth (shared-secret cookie) | `web/src/lib/admin.ts` |
| Slot renderer | `web/src/components/EditableSlot.astro` |
| Admin shell (brand fonts/colours) | `web/src/layouts/AdminLayout.astro` |
| Editor UI | `web/src/pages/admin/index.astro`, `admin/edit/[page].astro`, `admin/settings.astro`, `admin/login.astro` |
| Write APIs | `web/src/pages/api/admin/{login,settings,blocks}.ts` |
| Tag injection | `web/src/layouts/ThemeLayout.astro` |
| Demo page | `web/src/pages/our-story.astro` |

Storage shares the existing `DB` binding (the `safeharbours-jobs` database).

## Run it locally

```bash
cd web
cp .dev.vars.example .dev.vars      # set ADMIN_TOKEN to anything
# apply the schema to the LOCAL D1 (does not touch production):
npx wrangler d1 execute safeharbours-jobs --local --file=db/content-schema.sql
npm run dev
```

Then: open `/admin`, sign in with your `ADMIN_TOKEN`, click **Our Story**, edit a
section and watch the preview update; drag to reorder. Set Google tags under
**Settings**.

## Known limitations (it's a spike)

- **Static pages bake tags at build.** `getSettings()` runs at build time for
  prerendered pages, so a Google-tag change only reaches *static* pages on the
  next deploy. SSR pages (like `/our-story`) reflect changes instantly. To make
  tag changes instant everywhere, either flip more pages to SSR or inject the tag
  via a tiny SSR endpoint. Easy follow-up.
- **Auth is a single shared password.** Production answer: put `/admin` behind
  Cloudflare Access (SSO) and delete `lib/admin.ts`.
- **Plain textareas, no rich-text/image upload yet.** The `html` block kind is an
  escape hatch. Rich text + R2 image upload are the obvious next slices.
- **No drafts/preview.** Saves publish immediately.

## To extend to a real page

1. Add `export const prerender = false;` to the page.
2. Drop `<EditableSlot page="x" slot="y" />` where editors should manage content.
3. Point the admin at that `(page, slot)` (currently hard-coded to `our-story:top`).
