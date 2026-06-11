# Safe Harbours — deployment & DNS overview

A vendor-facing map of where the site lives and how it ships. No credentials or
secret values appear here (secrets are referenced by name only).

## Hosting at a glance

The site is **not** WordPress anymore. It's a static-first **Astro** app that
runs as a single **Cloudflare Worker** named **`safe-harbours-web`**. Pages are
server-rendered on demand and read their content from a Cloudflare D1 database.

```
Visitor ──> Cloudflare edge ──> Worker "safe-harbours-web" ──> D1 (content) / R2 (images)
```

## Domain & DNS (all on Cloudflare)

DNS for **safeharbours.ca** is managed in **Cloudflare** (the nameservers point
to Cloudflare). What's proxied where:

| Hostname | Type | Points to | Proxied? |
| --- | --- | --- | --- |
| `www.safeharbours.ca` | **Custom Domain** on the Worker | the `safe-harbours-web` Worker | Yes (orange-cloud) |
| `safeharbours.ca` (apex) | **Redirect Rule** | 301 → `https://www.safeharbours.ca` | Yes |

- The **canonical host is `www`**. The apex redirects to it via a zone Redirect
  Rule (not a DNS record alone).
- The Worker **Custom Domain** (Workers & Pages → `safe-harbours-web` → Domains &
  Routes) is what actually serves traffic — not a plain DNS record.
- TLS is Cloudflare's (universal SSL); the whole site is HTTPS.

> **Rollback target:** the old WordPress host (WP Engine) can be restored by
> re-pointing `www` to it. Until a migration is fully retired, keep that option
> documented with whoever owns the Cloudflare account.

## Data & storage

| What | Service | Name / binding |
| --- | --- | --- |
| Page content, blog articles, settings | Cloudflare **D1** | database `safeharbours-jobs`, binding `DB` |
| Uploaded images (from the CMS) | Cloudflare **R2** | bucket `safeharbours-media`, binding `MEDIA` |
| Job postings (Careers) | same **D1**, fed by a separate `jobs-sync` worker from the HR system | — |

## How a deploy happens

1. A change is merged to the **`main`** branch on GitHub.
2. **GitHub Actions** (`.github/workflows/deploy.yml`) builds the Astro app and
   runs `wrangler deploy` to the `safe-harbours-web` Worker.
3. Deploys are atomic — a failed deploy leaves the previous version live.
4. **Rollback:** `wrangler rollback` instantly restores the previous Worker
   version (D1/R2/secrets are unaffected).

Content edits made in the **CMS** (`/admin`) write to D1 directly and go live on
**Publish** — they do **not** require a code deploy.

## Integrations

| Purpose | Provider | Notes |
| --- | --- | --- |
| Form email delivery | **Resend** | Contact + newsletter submissions are emailed |
| Spam / bot protection | **Cloudflare Turnstile** | On all forms |
| Analytics & tags | **GA4 + Google Tag Manager** | IDs managed in `/admin` → Settings |
| Careers feed | HR system → `jobs-sync` worker → D1 | Read-only on the site |

## Secrets (names only — values live in Cloudflare/GitHub, never in the repo)

- **Worker secrets** (`wrangler secret`): `ADMIN_TOKEN` (CMS password),
  `RESEND_TOKEN`, `TURNSTILE_SECRET_KEY`, `CONTACT_TO`, `CONTACT_FROM`.
- **GitHub Actions secrets**: `CLOUDFLARE_API_TOKEN` (deploy + R2),
  `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`.

## SEO / continuity essentials

- `robots.txt` and `sitemap-index.xml` are served and live.
- Old WordPress URLs (`/wp-content/...`, `/blog`, `/contact`, etc.) **301-redirect**
  to their new paths (`public/_redirects`). WordPress *backend* paths
  (`/wp-admin`, `/wp-login.php`) intentionally 404 — there is no WP backend.
- Per-page titles, meta descriptions, canonical tags, and Organization JSON-LD
  are emitted by the shared layout.
