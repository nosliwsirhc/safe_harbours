# jobs-sync

The projection worker for the public careers board. It reads the HR **Job Postings**
SharePoint lists, resolves each posting's sparse overrides against its role template,
applies the publish gate, normalizes + sanitizes the public fields, and upserts the
result into a dedicated **D1** database that the public site reads. It also writes the
derived `PostingID` back to SharePoint.

Full spec: `~/Code/Sharepoint/JOB-POSTING-CLOUDFLARE-HANDOFF.md` (the authoritative
contract this implements).

## Architecture
```
SharePoint (HR site)              jobs-sync (this worker)             web/ (public)
 Job Titles / Job Postings ──▶  cert→SP REST read · resolve   ──▶  D1: safeharbours-jobs ──▶ /careers SSR
                                 override??template · gate ·         (read-only on the site)
   ▲ Power Automate              normalize/sanitize · upsert ·
   └── webhook → POST /refresh   write PostingID back · expire
                                 + 6h cron reconcile
```
**Security boundary:** this worker holds the SharePoint certificate and is the only
thing that touches SharePoint or *writes* D1. The public site worker only *reads* D1.

## How it works
- **Auth** (`spcert.ts`): app-only token for the SharePoint REST resource via the Writer
  app's **certificate** (SP REST rejects client-secret app tokens). Reused from FileDrop.
- **Read** (`sp.ts`, `project.ts`): SP REST `_api` with `odata=verbose` (clean managed-
  metadata / lookup shapes). Job Titles → map by Id; Job Postings (status Open) with
  `$expand=RoleTemplate,Home,ApprovedBy`.
- **Resolve** (`project.ts`): for the 9 override fields, `effective = posting override ?? template`
  (note `ScreeningRequirement` ← `ScreeningLevel`).
- **Gate** (`project.ts`): Open AND ApprovedBy AND ApprovalDate AND ClosingDate ≥ today (org TZ)
  AND (AIScreeningUsed=false OR AIDisclosureStatement present).
- **Normalize + sanitize**: MM/multi-choice → label arrays; rich text → allowlist-sanitized
  HTML (`sanitize.ts`, HTMLRewriter); ShortSummary ≤ 300; HowToApply → `{url,label}`.
- **PostingID** (`postingId.ts`): `<DEPT>-<YYYYMMDD>-<seq4>` (e.g. `RES-20260603-0001`),
  derived + written back to SharePoint when blank. Stable thereafter.
- **D1** (`d1.ts`): upsert the published set (keyed on the SP item id), delete anything no
  longer published, and a cheap daily expiry of past-closing rows.

## Triggers
- `POST /refresh` — Power Automate webhook (header `x-refresh-secret`). Runs the projection.
- `scheduled()` — every 6h (`wrangler.toml [triggers]`): expiry sweep + full reconcile (backstop).
- `GET /health` — `{ ok, last_sync, published }`.

## Setup (one-time)
The dedicated D1 is already created and the schema applied:
- DB `safeharbours-jobs`, id `08193517-e7af-4b92-aee7-286865d9e3c0` (in `wrangler.toml`
  and `web/wrangler.jsonc`).

Set the two secrets, then deploy:
```bash
cd jobs-sync
npm install --ignore-scripts
# WRITER_CERT_PRIVATE_KEY: the PKCS#8 PEM private key of the Writer app's cert
#   (same key FileDrop uses; export from the cert / 1Password).
npx wrangler secret put WRITER_CERT_PRIVATE_KEY
# REFRESH_SECRET: a long random string; also put it in the Power Automate flow's header.
npx wrangler secret put REFRESH_SECRET
npm run deploy
```
(Re-applying the schema later: `npm run db:apply`.)

## Power Automate flow (instant updates)
1. Trigger: **When an item is created or modified** (SharePoint) → site HumanResources,
   list **Job Postings**.
2. Action: **HTTP** → `POST https://jobs-sync.chrisjwilson1984.workers.dev/refresh`,
   header `x-refresh-secret: <REFRESH_SECRET>`. (No body needed — the worker re-reads SharePoint.)
The 6h cron is the backstop; the webhook makes posts/edits show up within seconds.

## Local dev
```bash
cp .dev.vars.example .dev.vars   # fill in the cert key + a refresh secret
npm run dev                       # wrangler dev --test-scheduled
# trigger the scheduled handler:  curl http://localhost:8787/__scheduled
# trigger a refresh:              curl -XPOST -H 'x-refresh-secret: …' http://localhost:8787/refresh
```

## Notes / follow-ups
- **Job Titles is empty** until HR populates it; override resolution then falls back to
  nothing. Seed a couple of rows to test end-to-end.
- The SP REST read of managed-metadata + projected-lookup fields is coded to the documented
  shapes; do one validation pass against live data (the normalizers in `sp.ts` are tolerant).
- Unit tests for the pure logic (override resolution, gate, PostingID format) are a sensible
  next addition (HTMLRewriter/D1 paths need `@cloudflare/vitest-pool-workers`).
