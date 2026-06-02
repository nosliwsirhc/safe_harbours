// Wrap each <img> that points at an optimized upload in a responsive <picture>
// with AVIF + WebP <source>s (run scripts/images.mjs first). The original <img>
// stays as the fallback. Rewrites the mirror blobs + markdown article bodies in
// place; idempotent (skips files already containing AVIF sources). SVGs and
// images without generated variants are left untouched.
//
//   node scripts/rewrite-images.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PUB = 'public';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Existing variant widths for an upload, per format.
function variants(rel) {
  const dir = path.join(PUB, path.dirname(rel));
  const base = path.basename(rel).replace(/\.(jpe?g|png)$/i, '');
  if (!existsSync(dir)) return {};
  const out = {};
  for (const f of readdirSync(dir)) {
    const m = f.match(new RegExp(`^${esc(base)}-(\\d+)\\.(avif|webp)$`));
    if (m) (out[m[2]] ||= []).push(+m[1]);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a - b);
  return out;
}

const srcset = (relDir, base, ws, ext) =>
  ws.map((w) => `${relDir}/${base}-${w}.${ext} ${w}w`).join(', ');

function toPicture(imgTag) {
  const src = imgTag.match(/\bsrc=["']([^"']+)["']/)?.[1];
  if (!src || !/\/assets\/.+\.(jpe?g|png)$/i.test(src)) return null; // skip svg/external
  const v = variants(src);
  if (!v.avif?.length && !v.webp?.length) return null; // no variants generated
  const relDir = path.dirname(src);
  const base = path.basename(src).replace(/\.(jpe?g|png)$/i, '');
  const sources = [];
  if (v.avif?.length) sources.push(`<source type="image/avif" srcset="${srcset(relDir, base, v.avif, 'avif')}" sizes="100vw">`);
  if (v.webp?.length) sources.push(`<source type="image/webp" srcset="${srcset(relDir, base, v.webp, 'webp')}" sizes="100vw">`);
  return `<picture>${sources.join('')}${imgTag}</picture>`;
}

const files = execSync('find _mirror src/content -type f \\( -name "*.main.html" -o -name "*.md" \\)', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

let wrapped = 0, filesChanged = 0;
for (const f of files) {
  let txt = readFileSync(f, 'utf8');
  if (txt.includes('<source type="image/avif"')) continue; // already rewritten
  let n = 0;
  const out = txt.replace(/<img\b[^>]*>/gi, (tag) => {
    const pic = toPicture(tag);
    if (pic) { n++; return pic; }
    return tag;
  });
  if (n > 0) { writeFileSync(f, out); wrapped += n; filesChanged++; }
}
console.log(`wrapped ${wrapped} <img> in ${filesChanged} file(s) in responsive <picture>.`);
