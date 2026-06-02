// Purge unused rules from the heavy mirrored theme CSS (theme/build/app.css).
//
//   node scripts/purge-css.mjs          # purge in place
//   node scripts/purge-css.mjs --dry    # report only, write nothing
//
// The CSS is purged in place against the committed mirror output. Re-running is
// idempotent (purging already-purged CSS is a no-op). If app.css is ever
// re-captured from the origin theme, run this again afterward to re-trim it.
//
// The site is a fixed set of mirrored pages, so "used" = any class that appears
// in the mirrored HTML, the Astro components, or the runtime JS. Classes that
// JS toggles at runtime (Foundation modals / off-canvas / menus, Gravity Forms
// validation, WP dynamic classes) can't be seen statically, so they're kept via
// a generous safelist below. When in doubt, a class is kept.
import { PurgeCSS } from 'purgecss';
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TARGET = 'public/assets/theme/build/app.css';
const DRY = process.argv.includes('--dry');

// Everything that can place a class on an element in the shipped pages.
const content = execSync(
  'find _mirror src -type f \\( -name "*.html" -o -name "*.astro" \\); ' +
  'find public/assets -type f -name "*.js"',
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

const before = readFileSync(TARGET, 'utf8');

const result = await new PurgeCSS().purge({
  content: content.map((f) => ({ raw: readFileSync(f, 'utf8'), extension: f.split('.').pop() })),
  css: [{ raw: before }],
  // Keep @keyframes / @font-face / CSS vars — only selector rules are pruned.
  keyframes: false,
  fontFace: false,
  variables: false,
  // Default extractor also splits on ":" etc.; this one preserves BEM/WP tokens.
  defaultExtractor: (c) => c.match(/[A-Za-z0-9_-]+/g) || [],
  safelist: {
    standard: [
      // Foundation interactive state classes toggled by app.js
      /^is-/, /^has-/, /^js-/,
      // Form / validation states (Gravity Forms + Foundation Abide)
      /^gform/, /^gfield/, /^validation/, /^ginput/, /form-error/, /invalid/,
      // WordPress dynamic + block classes, menus, a11y helpers
      /^wp-/, /^menu-item/, /^page-/, /screen-reader/, /^sr-only/, /^align/,
      // Common toggled-state suffixes
      /active$/, /open$/, /closed$/, /hidden$/, /visible$/, /stuck$/, /anchored$/,
    ],
    // greedy: keep the WHOLE selector if any part matches — protects compound
    // runtime selectors like `.off-canvas.is-open.position-right`.
    greedy: [
      /reveal/, /off-canvas/, /drilldown/, /dropdown/, /accordion/,
      /sticky/, /tooltip/, /has-tip/, /^is-/, /^gform/, /^gfield/,
      // FacetWP search/filter widgets (resources page) — markup + child styling
      // is injected by the plugin JS and styled only here in app.css.
      /facetwp/,
    ],
  },
});

const after = result[0].css;
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1);
console.log(`${TARGET}`);
console.log(`  before: ${kb(before)} KB`);
console.log(`  after:  ${kb(after)} KB  (-${(100 - Buffer.byteLength(after) / Buffer.byteLength(before) * 100).toFixed(1)}%)`);

if (DRY) {
  console.log('\n  --dry: nothing written.');
} else {
  writeFileSync(TARGET, after);
  console.log('\n  written in place. (git restore to revert; re-run after any mirror refresh)');
}
