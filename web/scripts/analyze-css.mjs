// CSS baseline + coverage report. Wraps @projectwallace/css-analyzer for size /
// rule / specificity stats, then estimates how much of the heavy theme CSS is
// actually reachable by the mirrored pages (a conservative class-coverage pass).
//
//   npm run analyze:css
//
// The coverage figure is intentionally conservative: the "used" token set is
// built loosely (every quoted identifier in JS counts as a possible runtime
// class), so a rule flagged dead here is very likely dead. Treat it as a floor.
import { analyze } from '@projectwallace/css-analyzer';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CSS_FILES = execSync(
  'find public/assets -type f -name "*.css"',
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean).sort();

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

console.log('# CSS baseline\n');
let totalBytes = 0;
for (const file of CSS_FILES) {
  const css = readFileSync(file, 'utf8');
  if (!css.trim()) continue;
  const r = analyze(css);
  totalBytes += r.stylesheet.size;
  console.log(
    `${file}\n` +
    `  ${kb(r.stylesheet.size).padStart(9)}  ` +
    `rules=${r.rules.total}  selectors=${r.selectors.total}  ` +
    `decls=${r.declarations.total}  !important=${r.declarations.importants.total}  ` +
    `@media=${r.atrules.media?.total ?? 0}  maxSpecificity=${JSON.stringify(r.selectors.specificity.max.value ?? r.selectors.specificity.max)}`
  );
}
console.log(`\n  TOTAL CSS shipped: ${kb(totalBytes)}\n`);

// --- Coverage estimate against the mirrored HTML (theme/build/app.css only) ---
const APP = 'public/assets/theme/build/app.css';
const usedClasses = new Set();
const files = execSync(
  'find _mirror src public -type f \\( -name "*.html" -o -name "*.astro" -o -name "*.js" -o -name "*.ts" -o -name "*.json" \\)',
  { encoding: 'utf8' }
).trim().split('\n');
for (const f of files) {
  if (f.includes('node_modules') || f.endsWith('.css')) continue;
  const txt = readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g))
    m[1].split(/\s+/).forEach((c) => c && usedClasses.add(c));
  if (/\.(js|ts|astro)$/.test(f))
    for (const m of txt.matchAll(/["'`]([a-zA-Z][a-zA-Z0-9_-]+)["'`]/g)) usedClasses.add(m[1]);
  if (f.endsWith('.meta.json')) {
    try { JSON.parse(txt).bodyClass?.split(/\s+/).forEach((c) => c && usedClasses.add(c)); } catch { /* skip malformed meta.json */ }
  }
}

const appCss = readFileSync(APP, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = [...appCss.matchAll(/([^{}]+)\{[^{}]*\}/g)]
  .map((m) => m[1].trim())
  .filter((s) => !s.startsWith('@'));
let classBearing = 0, dead = 0;
for (const sel of blocks) {
  const classes = [...sel.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
  if (!classes.length) continue;
  classBearing++;
  if (!classes.some((c) => usedClasses.has(c))) dead++;
}
console.log('# Coverage estimate — ' + APP);
console.log(`  used class tokens (loose): ${usedClasses.size}`);
console.log(`  class-bearing rules: ${classBearing}`);
console.log(`  rules with NO used class (likely dead): ${dead} (${(dead / classBearing * 100).toFixed(1)}% of class-bearing rules)`);
console.log('\n  → conservative floor; a real purge pass (PurgeCSS w/ runtime safelist) will likely remove more.');
