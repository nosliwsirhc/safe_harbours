# Plan: scoped agency logins via Cloudflare Access

## Goal

Replace the single **shared CMS password** with **per-person logins** for the
nvision team and Safe Harbours staff:

- Each editor signs in with **their own identity** (email one-time-PIN, or
  Google/Microsoft SSO) — no shared secret to leak or rotate.
- Access is **granted and revoked per person** by whoever owns the Cloudflare
  account (remove someone in seconds when an engagement ends).
- We learn **who** published what (feeds the revision-history "by" field).

This is the approach the auth code already anticipates (`src/lib/admin.ts`:
"the production answer is to put /admin behind Cloudflare Access").

## Why Access (vs. building user accounts)

- **Zero app code for identity** — Cloudflare verifies the user at the edge,
  before the request reaches the Worker. No password storage, reset flows, or
  session management to build and secure.
- **Free** for our size (Zero Trust free plan covers up to 50 users).
- **Edge-enforced** — `/admin` and `/api/admin` can't be reached at all without
  passing the Access policy, plus optional step-up MFA independent of the IdP.

## How it works

```text
Editor ──> Cloudflare Access (verify identity + policy) ──> Worker /admin
                     │ on success, injects headers:
                     │   Cf-Access-Authenticated-User-Email: jane@nvision.ca
                     └   Cf-Access-Jwt-Assertion: <signed JWT>
```

## Implementation steps

1. **Enable Cloudflare Zero Trust** on the account (one-time) and pick a team
   domain (e.g. `safeharbours.cloudflareaccess.com`).
2. **Create a self-hosted Access application** scoped to the admin paths:
   - `www.safeharbours.ca/admin*`
   - `www.safeharbours.ca/api/admin*`
3. **Add an Access policy** — Allow, with an **emails / email-domain** rule:
   - the nvision editors' emails (or `@nvision.ca`)
   - Safe Harbours staff emails
   - Login method: One-time PIN (no IdP setup needed) or Google/Microsoft SSO.
4. **Set two Worker secrets** so the app trusts Access (see below). Until both are
   set, the app ignores Access and uses the shared password — so steps 1–3 can be
   done and tested first without affecting the live login.

## The app code is already done ✅

JWT verification is implemented and shipped (inert until configured):

- `src/lib/admin.ts` verifies the `Cf-Access-Jwt-Assertion` header against the
  team's public keys (`https://<team>/cdn-cgi/access/certs`), checks the issuer
  and audience, and returns the signed-in email (`accessEmail()`).
- `isAuthed()` is now async and returns true for **either** a valid Access
  identity **or** the existing `ADMIN_TOKEN` password (transitional fallback).
- Verifying the JWT in-Worker is defense-in-depth: even if the Worker were reached
  off the Access-protected hostname (e.g. a `*.workers.dev` URL), a forged
  `Cf-Access-Authenticated-User-Email` header is rejected because the signature
  won't validate.

### Turn it on (two Worker secrets)

```sh
# The Audience (AUD) tag from the Access application's "Overview" tab:
wrangler secret put CF_ACCESS_AUD
# Your Zero Trust team domain, e.g. safeharbours.cloudflareaccess.com:
wrangler secret put CF_ACCESS_TEAM_DOMAIN
```

The moment both are present, a verified Access login is accepted. Leave
`ADMIN_TOKEN` set during the transition; once Access is confirmed working,
**remove it** (`wrangler secret delete ADMIN_TOKEN`) to retire the shared
password entirely.

## Test

- An **allowed** email signs in via Cloudflare → lands in `/admin`, no password.
- A **non-listed** email is blocked at Cloudflare's login (never reaches the app).
- With both secrets set, the old `/admin/login` password is no longer needed.

## Follow-ups (small, optional)

- **Attribution:** `accessEmail(request)` is ready to stamp a "by" field on
  publishes once revision history exists (see the roadmap).
- **Logout:** point the admin "Log out" link at `/cdn-cgi/access/logout` when
  Access is active (the cookie logout still works in the meantime).

## Risks / notes

- The `.workers.dev` preview URL is **not** behind the Custom Domain's Access app.
  The in-Worker JWT check already blocks forged identities there, but you can also
  disable the preview URL or add a route-level Access policy for belt-and-braces.
- Effort: **Low** now — the code is done; this is Cloudflare configuration plus
  two `wrangler secret put` commands.
