# CMS content & database (D1)

The site's editable content lives in **Cloudflare D1** — the same database the
careers board uses (binding `DB`, database `safeharbours-jobs`). The public
pages **read** these tables during SSR; only the `/admin` routes **write** them.

## Tables (`content-schema.sql`)

| Table            | What it holds                                                        |
| ---------------- | -------------------------------------------------------------------- |
| `content_blocks` | Every page's copy, as ordered typed blocks. Keyed by `(page, slot)`. |
| `articles`       | Resource articles. One row per `(slug, state)`.                      |
| `settings`       | Site-wide key/values (GA4 / GTM ids).                                |

**Draft / published model:** each block and each article exists as a
`published` row (live) and optionally a `draft` row (in-progress edit in the
admin). Publishing copies the draft over the published row. The public site
only ever reads `state='published'`.

## ⚠️ A fresh database renders blank pages

All page copy is in D1, not in the code. **A new environment has no content
until it is seeded** — every page would render empty. Seeding is a required
launch step, not an optional one.

## Seeding

```sh
db/seed-remote.sh            # seed the REMOTE (production) D1
db/seed-remote.sh --local    # seed the local dev D1
```

The script applies `content-schema.sql` (creates tables) then every
`db/seed-*.sql` in turn. The seed SQL is generated from the captured live-site
copy by the `db/gen-seed-*.py` / `.mjs` scripts — **regenerate the seed and
re-run if the canonical copy changes.**

It is safe to re-run:

- The schema uses `CREATE TABLE IF NOT EXISTS` / `INSERT OR IGNORE`.
- Each **page** seed deletes only its own page's rows (`DELETE FROM
  content_blocks WHERE page='…'`) before re-inserting the published set.
- `seed-articles.sql` does `DELETE FROM articles` then re-inserts. This **wipes
  in-progress draft articles** — run it on a fresh environment, or when you
  deliberately want to reset articles to the seed set.

## Seed coverage

| Seed file            | Page(s)                              |
| -------------------- | ------------------------------------ |
| `seed-home.sql`      | Home (`/`)                           |
| `seed-our-story.sql` | Our Story                            |
| `seed-about.sql`     | About Fostering                      |
| `seed-become.sql`    | Become a Foster Parent               |
| `seed-impact.sql`    | Our Impact                           |
| `seed-program.sql`   | Program Description                  |
| `seed-complaints.sql`| Complaints Process                   |
| `seed-book.sql`      | Book an Appointment                  |
| `seed-contact.sql`   | Contact Us                           |
| `seed-thank-you.sql` | Thank You (fostering)                |
| `seed-textpages.sql` | Privacy Policy + Terms & Conditions  |
| `seed-articles.sql`  | All resource articles                |

## Go-live checklist

1. `db/seed-remote.sh` against the production D1 (creates tables + seeds copy).
2. Spot-check each page on the deployed Worker — they should match the
   captured site, not render blank.
3. Resource articles appear on `/resources` and individual `/resources/<slug>`.
