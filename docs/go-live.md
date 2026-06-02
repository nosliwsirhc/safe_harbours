# Go-live runbook — Safe Harbours (Astro on Cloudflare Workers)

Cutover from the old WordPress site (WP Engine) to the Astro Worker.

**Current state (verified):**
- DNS zone `safeharbours.ca` is on Cloudflare (NS: `jerome/zoe.ns.cloudflare.com`).
- Old site: WordPress on **WP Engine** — `www` → `wp.wpenginepowered.com`, apex → `141.193.213.10/.11`, proxied through Cloudflare.
- New site: Cloudflare Worker **`safe-harbours-web`**, auto-deployed from `main` by
  `.github/workflows/deploy.yml`, currently at `safe-harbours-web.chrisjwilson1984.workers.dev`.
- The Worker has **no custom domain yet** — it is not attached to `safeharbours.ca`.

A Worker is attached to a hostname via a **Custom Domain**, not a hand-edited DNS
record: adding the Custom Domain makes Cloudflare create/replace the DNS record
automatically. Adding it for `www`/apex will override the current WP Engine records.

---

## 1. Deploy the new build (nothing is live until this happens)
All recent work is on the `css-optimization` branch; the Worker deploys from `main`.

- [ ] Merge `css-optimization` → `main` and push. CI (`deploy.yml`) builds `web/`
      and runs `wrangler deploy`.
- [ ] Confirm the GitHub Actions secrets exist: `CLOUDFLARE_API_TOKEN`
      (Workers Scripts:Edit), `CLOUDFLARE_ACCOUNT_ID`, `PUBLIC_TURNSTILE_SITE_KEY`.
- [ ] Confirm the deploy succeeded (Actions tab + Cloudflare dashboard).

## 2. Set the Worker's runtime secrets (forms break without them)
From `web/`, against the `safe-harbours-web` Worker:
```
npx wrangler secret put RESEND_TOKEN          # Safe Harbours' Resend API key
npx wrangler secret put TURNSTILE_SECRET_KEY  # Safe Harbours' Turnstile secret
npx wrangler secret put CONTACT_TO            # info@safeharbours.ca
npx wrangler secret put CONTACT_FROM          # "Safe Harbours <noreply@safeharbours.ca>"
```
Secrets persist across deploys. Without `PUBLIC_TURNSTILE_SITE_KEY` at build time,
the forms use Cloudflare's always-pass TEST key.

## 3. Test on the workers.dev URL (real content, no DNS risk)
On `https://safe-harbours-web.chrisjwilson1984.workers.dev`:
- [ ] Spot-check key pages: home, /resources, a resource article, contact-us.
- [ ] Submit the **contact form** and the **newsletter** form → confirm delivery
      (Resend) and Turnstile challenge.
- [ ] Mobile: hamburger / off-canvas opens; images load (AVIF).
- [ ] Check a few old URLs/aliases (e.g. `/blog`, `/wp-content/uploads/...`).

## 4. Cut DNS over (the actual go-live)
In the Cloudflare dashboard → Workers & Pages → `safe-harbours-web` →
Settings → Domains & Routes → **Add → Custom Domain**:
- [ ] Add `www.safeharbours.ca` — accept the prompt to **override** the existing
      WP Engine record.
- [ ] Add `safeharbours.ca` (apex) — same override.
- [ ] **Apex → www redirect (zone Redirect Rule, NOT _redirects).** Workers
      static-asset `_redirects` only allow relative URLs, so the cross-host
      redirect must be a zone rule. Dashboard → the `safeharbours.ca` zone →
      Rules → Redirect Rules → Create (or use the "Redirect from root to www"
      template): when `http.host eq "safeharbours.ca"`, redirect to dynamic
      `concat("https://www.safeharbours.ca", http.request.uri.path)`, status 301.
      It fires at the edge before the Worker.
- [ ] Wait for "Active" + cert issued (usually 1-2 min).
- [ ] Verify TLS/SSL mode is Full or Full (strict).

## 5. Verify live
- [ ] `https://www.safeharbours.ca` serves the new site; `https://safeharbours.ca`
      301s to `www`.
- [ ] Re-run the form tests on the live domain (Turnstile is domain-bound).
- [ ] Check canonical tags resolve to `https://www.safeharbours.ca/...`.
- [ ] Confirm old paths/aliases still resolve (sitemap, `/blog`, asset redirects).

## Rollback
Keep WP Engine running until verified. To revert: in the Worker's Domains &
Routes, **remove the Custom Domain(s)**, then re-create the original DNS records
(`www` CNAME → `wp.wpenginepowered.com`; apex A → `141.193.213.10` and `.11`,
proxied). DNS propagation is near-instant on Cloudflare. Don't decommission WP
Engine until the new site has run clean for a few days.

## Notes
- Path aliases + old WordPress asset URLs are handled in `public/_redirects`.
- Page URLs are unchanged from the WordPress site (slugs map 1:1), so no
  content-URL redirects are needed.
- After adding/replacing any image, re-run `npm run images` and redeploy.
