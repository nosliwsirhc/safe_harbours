// Rewrite inline `background-image: url(<upload>)` in the mirror blobs to a CSS
// image-set() that serves AVIF/WebP (largest pre-generated variant <= 1920),
// with the original as the in-set fallback. Run scripts/images.mjs first.
// Idempotent (skips occurrences already using image-set).
//
//   node scripts/rewrite-backgrounds.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PUB = 'public';
const CAP = 1920;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pickVariant(rel) {
  const dir = path.join(PUB, path.dirname(rel));
  const base = path.basename(rel).replace(/\.(jpe?g|png)$/i, '');
  if (!existsSync(dir)) return null;
  const widths = readdirSync(dir)
    .map((f) => f.match(new RegExp(`^${esc(base)}-(\\d+)\\.avif$`)))
    .filter(Boolean)
    .map((m) => +m[1])
    .sort((a, b) => a - b);
  if (!widths.length) return null;
  const w = widths.filter((x) => x <= CAP).pop() ?? widths[0];
  return `${path.dirname(rel)}/${base}-${w}`;
}

const files = execSync('find _mirror -name "*.main.html"', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
let rewritten = 0, filesChanged = 0;
const RE = /background-image:\s*url\((['"]?)(\/assets\/[^)'"]+?\.(?:jpe?g|png))\1\)/gi;

for (const f of files) {
  let txt = readFileSync(f, 'utf8');
  let n = 0;
  const out = txt.replace(RE, (whole, _q, rel) => {
    const v = pickVariant(rel);
    if (!v) return whole;
    n++;
    return `background-image: image-set(url('${v}.avif') type('image/avif'), url('${v}.webp') type('image/webp'), url('${rel}'))`;
  });
  if (n > 0) { writeFileSync(f, out); rewritten += n; filesChanged++; }
}
console.log(`rewrote ${rewritten} background-image url() to image-set in ${filesChanged} file(s).`);
