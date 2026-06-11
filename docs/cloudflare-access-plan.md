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
4. **(Recommended) Verify the Access JWT in the Worker** for defense-in-depth, so
   the app trusts the identity only when the request genuinely came through
   Access:
   - Read `Cf-Access-Jwt-Assertion`, validate it against the team's public keys
     (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`), and read the
     verified email. Update `isAuthed()` in `src/lib/admin.ts` to accept this.
   - Keep the existing `ADMIN_TOKEN` password as a **transitional fallback**, then
     remove it once Access is confirmed working.
5. **Use the email for attribution** — pass the Access email into publish/save so
   the revision-history "by" field records who made each change.
6. **Test**: confirm an allowed email gets in, a non-listed email is blocked, and
   the password path can be retired.

## Code touch-points (small)

- `src/lib/admin.ts` — add an `accessEmail(request)` helper (verify JWT → email)
  and let `isAuthed()` accept a valid Access identity.
- Publish/save handlers (`api/admin/*`) — record the editor email on writes.
- No UI changes required; the Cloudflare login screen replaces our `/admin/login`.

## Risks / notes

- The Access policy is enforced on the **hostname path**, and the Worker serves
  that same hostname, so Access sits in front of it at the edge — there's no
  public bypass route. Verifying the JWT in-Worker closes the gap where a
  misconfiguration could forward unauthenticated traffic.
- The `.workers.dev` preview URL is **not** behind the Custom Domain's Access app;
  ensure the admin isn't reachable there (or add a policy / disable the preview).
- Effort: **Low–Medium** — mostly Cloudflare configuration plus the optional
  JWT-verification helper.
