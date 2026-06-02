// Verify the componentized build is HTML-equivalent to the pre-refactor baseline.
//
//   node scripts/diff-built.mjs <before-dir> <after-dir>
//
// Normalizes away only the KNOWN-INTENTIONAL differences before comparing:
//   - whitespace between tags (collapses; semantically irrelevant)
//   - attribute quote style (' vs ") and &#038; vs &amp; (render-identical)
//   - the active-nav state classes WP baked in (page_item/page-item-NN/
//     current_page_item) — we now emit only current-menu-item/active + aria-current
//   - the dropped gf_browser_* server-sniff class
//   - the path-derived NVISION backlink utm_source + its rel attribute
// Anything else that differs is a real regression and is printed.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) { console.error('usage: diff-built.mjs <before> <after>'); process.exit(2); }

// Recursively list *.html paths relative to a root.
function listHtml(root, rel = '') {
  const out = [];
  for (const e of readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listHtml(root, r));
    else if (e.name.endsWith('.html')) out.push(r);
  }
  return out;
}

function normalize(html) {
  return html
    // active-nav classes WP added (all unstyled) — item, parent/ancestor, page —
    // remove so both sides match regardless of which subset each emits
    .replace(/\bpage_item\b/g, '')
    .replace(/\bpage-item-\d+\b/g, '')
    .replace(/\bcurrent_page_item\b/g, '')
    .replace(/\bcurrent_page_parent\b/g, '')
    .replace(/\bcurrent_page_ancestor\b/g, '')
    .replace(/\bcurrent-menu-item\b/g, '')
    .replace(/\bcurrent-menu-parent\b/g, '')
    .replace(/\bcurrent-menu-ancestor\b/g, '')
    .replace(/\bcurrent-page-parent\b/g, '')
    .replace(/\bcurrent-page-ancestor\b/g, '')
    .replace(/\bactive\b/g, '')
    .replace(/\s*aria-current=["']page["']/g, '')
    // FacetWP stylesheet moved from a stray body-end <link> to <head> (meta.styles);
    // drop it from both sides so position doesn't matter (presence asserted separately)
    .replace(/<link[^>]*facetwp[^>]*>/g, '')
    // dropped server-sniff browser class
    .replace(/\bgf_browser_\w+\b/g, '')
    // path-derived backlink: ignore the whole nvision href + rel noise
    .replace(/href=["']\/\/nvision\.co\/[^"']*["']/g, 'href="NVISION"')
    .replace(/rel=["']noopener\s*(nofollow)?["']/g, 'rel="noopener"')
    // entity vs literal ampersand (render-identical)
    .replace(/&#0?38;/g, '&amp;')
    // attribute quote style
    .replace(/=\s*'([^']*)'/g, '="$1"')
    // collapse whitespace inside class="…" (holes left by removed active classes)
    .replace(/class="([^"]*)"/g, (_, c) => `class="${c.replace(/\s+/g, ' ').trim()}"`)
    // trailing whitespace inside a tag (WP quirk) / before a self-close
    .replace(/\s+(\/?>)/g, '$1')
    // trim whitespace at every tag boundary (text-node edges + inter-tag gaps);
    // render-identical in non-<pre> contexts, and applied to both sides so it
    // can only mask whitespace-only differences, never real ones
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .replace(/\s+/g, ' ')
    .trim();
}

const files = listHtml(beforeDir);
let clean = 0, dirty = 0;
for (const f of files.sort()) {
  let before, after;
  try { before = readFileSync(path.join(beforeDir, f), 'utf8'); } catch { console.log(`? ${f}: missing in before`); continue; }
  try { after = readFileSync(path.join(afterDir, f), 'utf8'); } catch { console.log(`✗ ${f}: MISSING in after`); dirty++; continue; }
  const nb = normalize(before), na = normalize(after);
  if (nb === na) { clean++; continue; }
  dirty++;
  // Find and show the first divergence with a little context.
  let i = 0; while (i < nb.length && i < na.length && nb[i] === na[i]) i++;
  const ctx = 90;
  console.log(`\n✗ ${f} — first diff at char ${i}:`);
  console.log(`  before: …${nb.slice(Math.max(0, i - 30), i + ctx)}…`);
  console.log(`  after : …${na.slice(Math.max(0, i - 30), i + ctx)}…`);
}
console.log(`\n${clean}/${files.length} pages HTML-equivalent; ${dirty} with unexpected differences.`);
process.exitCode = dirty ? 1 : 0;
