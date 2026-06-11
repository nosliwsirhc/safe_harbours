#!/usr/bin/env bash
#
# Seed a D1 database with the site's page content + resource articles.
#
# The public site reads all page copy and articles from D1 (tables
# content_blocks / articles / settings). A fresh database has none of it, so
# the live site would render blank pages until this runs. Run it once when
# standing up a new environment, and again any time the captured seed copy
# changes.
#
# Idempotent and safe to re-run:
#   - content-schema.sql uses CREATE TABLE IF NOT EXISTS / INSERT OR IGNORE.
#   - Each page seed does `DELETE FROM content_blocks WHERE page='…'` then
#     re-inserts that page's *published* rows, so it only touches its own page.
#   - seed-articles.sql does `DELETE FROM articles` then re-inserts. NOTE: this
#     wipes any in-progress *draft* articles an editor has saved. Run it on a
#     fresh environment, or when you intend to reset articles to the seed set.
#
# Usage:
#   db/seed-remote.sh            # seed the REMOTE (production) D1
#   db/seed-remote.sh --local    # seed the local dev D1 instead
#
set -euo pipefail
cd "$(dirname "$0")/.."

DB="safeharbours-jobs"          # D1 database name (binding: DB) — see wrangler.jsonc
TARGET="${1:---remote}"         # --remote (default) or --local

case "$TARGET" in
  --remote) echo "Seeding REMOTE (production) D1: $DB" ;;
  --local)  echo "Seeding LOCAL dev D1: $DB" ;;
  *) echo "Unknown target '$TARGET' (use --remote or --local)"; exit 1 ;;
esac

run() { npx wrangler d1 execute "$DB" "$TARGET" --file "$1"; }

echo "==> schema (content-schema.sql)"
run db/content-schema.sql

for f in db/seed-*.sql; do
  echo "==> ${f}"
  run "$f"
done

echo "Done. ${TARGET#--} D1 seeded with page content + articles."
