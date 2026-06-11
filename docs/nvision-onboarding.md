# Safe Harbours CMS — guide for the content team (nvision)

The Safe Harbours website has a built-in CMS. You can edit every page and
publish blog posts yourself — no developer, no code, no WordPress. This is the
replacement for the old WordPress dashboard.

## Logging in

- Go to **https://www.safeharbours.ca/admin**
- Sign in with the credentials shared with you separately (never in this file).
- *(Coming soon: individual logins via Cloudflare Access — your own email, no
  shared password. See `cloudflare-access-plan.md`.)*

## How publishing works (read this first)

Everything you change is saved as a **private draft** automatically — nothing is
public until you click **Publish**. The flow is always:

1. **Edit** — your changes autosave as a draft.
2. **Preview** — the live preview pane shows your draft, and you can switch it
   between **desktop / tablet / mobile** to check how it looks.
3. **Publish** — makes it live. Published changes appear on the site within about
   a minute (the cache refreshes automatically on publish).

## Editing a page

- **Pages** in the top nav → pick a page.
- Each page is built from **blocks** (a hero, a text section, value cards, etc.).
  Edit the text/images in place, drag to **reorder**, or add/remove blocks.
- Click **Publish changes** when you're happy.

## Writing a blog post

- **Resources** in the top nav → **+ New article**.
- Give it a title, then write the body in the rich-text editor (headings, lists,
  links, bold/italic).
- Set the **excerpt**, **category**, a **hero/thumbnail image**, and optionally
  mark it **Featured** or set its position on the Resources page.
- **Publish** to put it live on `/resources`.

## Images

Upload images directly in the editor (hero, thumbnail, in-content). They're
stored and served by the site automatically — you don't manage files.

## Analytics & tracking (important for campaigns)

- **Settings** in the top nav holds the **Google Analytics (GA4)** and **Google
  Tag Manager** IDs.
- To turn the GTM container on across the whole site, paste your **`GTM-XXXX`**
  ID into the GTM field and save. It then loads on every page.
- The site already pushes these **conversion events** to the `dataLayer` for you
  to build triggers/conversions on in GTM:
  - `generate_lead` — any form submission (contact, newsletter, etc.)
  - `phone_call` — clicks on phone-number (`tel:`) links
  - `email_click` — clicks on email (`mailto:`) links
  - `cta_click` — clicks on key call-to-action buttons
- Analytics is **consent-gated**: tags stay off (Consent Mode "denied") until a
  visitor accepts the cookie banner, then they switch on.

## What still needs a developer

These aren't editable in the CMS yet (ask the dev team):

- Creating a **brand-new page at a new URL** (e.g. a campaign landing page).
- Editing the **top navigation menu** or the **footer**.
- **Redirects** for changed URLs.

(See the roadmap for when these are planned.)

## Careers

Job postings are **not** edited here — they sync automatically from the HR
system to `/careers`.
