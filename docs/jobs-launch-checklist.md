# Careers / jobs board — launch checklist

Everything is **built and deployed**. The careers page is live and shows a graceful
"no openings yet" state. To turn on live jobs, do the steps below — they need things
only you have (the cert key, a chosen secret, the SharePoint content, the flow).

## Already done (overnight)
- ✅ `jobs-sync` worker built + deployed → `https://jobs-sync.chrisjwilson1984.workers.dev`
      (cron every 6h; `/refresh` webhook; `/health`).
- ✅ Dedicated D1 `safeharbours-jobs` created + schema applied; bound to both workers.
- ✅ `/careers` converted to SSR with the live board + `/careers/[postingId]` detail pages
      + `JobPosting` structured data. Verified it degrades gracefully (never 500s).
- ✅ CI: `jobs-sync/**` auto-deploys via `.github/workflows/deploy-jobs-sync.yml`.

## To go live (you)
1. **Set the worker's two secrets** (from `jobs-sync/`):
   ```bash
   cd jobs-sync
   npx wrangler secret put WRITER_CERT_PRIVATE_KEY   # PKCS#8 PEM of the Writer app cert (same key FileDrop uses)
   npx wrangler secret put REFRESH_SECRET            # a long random string (reuse below)
   ```
2. **Seed Job Titles** in SharePoint (at least a couple of role rows with wage bands) so
   override resolution has something to inherit, and create one **Job Postings** row that
   passes the gate (Status=Open, Approved By + Approval Date set, Closing Date in the future).
3. **Kick a sync** to confirm the pipeline end-to-end:
   ```bash
   curl -X POST https://jobs-sync.chrisjwilson1984.workers.dev/refresh -H "x-refresh-secret: <REFRESH_SECRET>"
   curl https://jobs-sync.chrisjwilson1984.workers.dev/health      # published should be > 0
   ```
   Then load `https://www.safeharbours.ca/careers` — the posting should appear, and its
   `PostingID` should now be filled in SharePoint.
4. **Power Automate flow** (instant updates): trigger *When an item is created or modified*
   on the **Job Postings** list → **HTTP** `POST .../refresh` with header
   `x-refresh-secret: <REFRESH_SECRET>`. (Premium connector — you have it.) The 6h cron is the backstop.

## Validate against live data (first real posting)
The SharePoint **read** path (managed-metadata + projected City/Region shapes) was coded to
the documented contract but not yet run against real list data. On the first real posting,
eyeball the careers card + detail page for:
- requirements lists populated (certs/training/education) — confirms MM normalization,
- location showing (City/Region) — confirms the Home expand,
- wage + screening + duties resolving from the template when the posting leaves them blank.
`sp.ts` normalizers are tolerant, but if a field is empty that shouldn't be, that's where to look
(the field's internal name / shape). `GET /health` shows `last_errors` if a projection row failed.

## Rollback
- Careers page: it only *adds* the openings section; if needed, `git revert` the careers commit.
- Worker: harmless without secrets (it no-ops). To pause, disable the cron in the dashboard
  or `wrangler delete` the worker; the careers page just shows the empty state again.
