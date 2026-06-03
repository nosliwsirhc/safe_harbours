# Safe Harbours

Website for **Safe Harbours Family Treatment Homes**, an Ontario treatment foster
care agency — migrated from WordPress to [Astro 6](https://astro.build) and hosted
on **Cloudflare Workers**. Live at **https://www.safeharbours.ca**.

The app lives in [`web/`](./web). It's a mostly-static, prerendered site with two
on-demand Worker endpoints (the contact form and newsletter signup). The page
chrome and the resource articles are Astro components; a handful of "marketing"
pages are still served from captured WordPress markup.

## Documentation

- **[`web/README.md`](./web/README.md)** — the full architecture guide: how pages
  render, the navigation/article components, **how the forms & newsletter work**,
  the image pipeline, CSS, redirects, build/deploy, and common maintenance tasks.
  **Start here.**
- **[`docs/go-live.md`](./docs/go-live.md)** — DNS cutover + rollback runbook.
- **[`docs/componentization-plan.md`](./docs/componentization-plan.md)** — the plan
  behind the WordPress-mirror → components refactor.

## Quick start

```bash
cd web
npm install --ignore-scripts   # sharp's native build is skipped (not needed); see web/README §10
npm run dev                    # http://localhost:4321
```

## Deploy

Push to `main` → `.github/workflows/deploy.yml` builds `web/` and runs
`wrangler deploy` to the `safe-harbours-web` Worker.

- **GitHub Actions secrets:** `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit),
  `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`.
- **Worker secrets** (`cd web && npx wrangler secret put …`): `RESEND_TOKEN`,
  `TURNSTILE_SECRET_KEY`, optional `CONTACT_TO` / `CONTACT_FROM`.

See [`web/README.md`](./web/README.md) for everything else.
