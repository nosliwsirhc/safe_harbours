// One-time migration: split each mirrored body into its unique <main> content.
//
//   node scripts/split-main.mjs [--check]
//
// The page chrome (header/footer/off-canvas) is now owned by Astro components
// (SiteHeader / SiteFooter / OffCanvasNav), so each _mirror/<page>.body.html is
// reduced to just the inner HTML of its <main …><div id="content" …> region,
// written to _mirror/<page>.main.html. ThemeLayout injects that around the
// composed chrome. Once verified, the .body.html / .head.html files are retired.
//
// --check reports matches without writing.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MIRROR = path.join(process.cwd(), '_mirror');
const CHECK = process.argv.includes('--check');

// Inner HTML of #content: <main …><div id="content" …> CAPTURE </div></main>.
// Greedy capture extends to the last </div> before </main>.
const RE = /<main\b[^>]*>\s*<div id="content"[^>]*>(.*)<\/div>\s*<\/main>/s;

const bodies = readdirSync(MIRROR).filter((f) => f.endsWith('.body.html'));
let ok = 0, miss = 0;
for (const file of bodies) {
  const name = file.replace(/\.body\.html$/, '');
  const html = readFileSync(path.join(MIRROR, file), 'utf8');
  const m = html.match(RE);
  if (!m) { console.warn(`  ! ${name}: no <main>#content region found — skipped`); miss++; continue; }
  ok++;
  if (!CHECK) writeFileSync(path.join(MIRROR, `${name}.main.html`), m[1].trim() + '\n');
}
console.log(`${CHECK ? 'check' : 'wrote'}: ${ok} main fragments, ${miss} unmatched (of ${bodies.length} bodies)`);
if (miss) process.exitCode = 1;
