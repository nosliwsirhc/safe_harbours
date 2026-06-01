/**
 * Responsive image pipeline for Safe Harbours.
 *
 * Reads scripts/image-manifest.json — an array of entries:
 *   { "src": "<url-or-local-path>", "base": "hero", "widths": [640,1024,1440,1920] }
 *
 * For each entry it writes, into public/images/:
 *   {base}.jpg                 (fallback at the largest width)
 *   {base}-{w}.{avif,webp,jpg} (one per requested width <= source width)
 *
 * SVGs are copied through untouched. Matches the <Picture> component contract.
 *
 * Usage:  node scripts/images.mjs            (process every entry)
 *         node scripts/images.mjs hero logo  (only entries whose base matches)
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(root, 'public', 'images');
const DEFAULT_WIDTHS = [640, 1024, 1440, 1920];

async function load(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`fetch ${src} → ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.isAbsolute(src) ? src : path.join(root, src));
}

async function processEntry(entry) {
  const { src, base, widths = DEFAULT_WIDTHS, fit = 'cover' } = entry;
  const buf = await load(src);

  // SVGs pass through as-is.
  if (src.toLowerCase().endsWith('.svg')) {
    await writeFile(path.join(outDir, `${base}.svg`), buf);
    console.log(`  ${base}.svg (copied)`);
    return;
  }

  const img = sharp(buf, { failOn: 'none' });
  const meta = await img.metadata();
  const srcW = meta.width || Math.max(...widths);
  const useWidths = widths.filter((w) => w <= srcW);
  if (useWidths.length === 0) useWidths.push(srcW);
  const largest = Math.max(...useWidths);

  for (const w of useWidths) {
    const resized = (b) => sharp(b, { failOn: 'none' }).resize({ width: w, fit, withoutEnlargement: true });
    await resized(buf).avif({ quality: 55 }).toFile(path.join(outDir, `${base}-${w}.avif`));
    await resized(buf).webp({ quality: 72 }).toFile(path.join(outDir, `${base}-${w}.webp`));
    await resized(buf).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(outDir, `${base}-${w}.jpg`));
  }
  // Fallback at the largest size.
  await sharp(buf, { failOn: 'none' })
    .resize({ width: largest, fit, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(outDir, `${base}.jpg`));

  console.log(`  ${base}: ${useWidths.join('/')} (avif+webp+jpg)`);
}

async function main() {
  const filters = process.argv.slice(2);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(here, 'image-manifest.json'), 'utf8'));
  const entries = filters.length
    ? manifest.filter((e) => filters.some((f) => e.base.includes(f)))
    : manifest;
  console.log(`Processing ${entries.length} image(s) → public/images/`);
  for (const entry of entries) {
    try {
      await processEntry(entry);
    } catch (err) {
      console.error(`  ! ${entry.base}: ${err.message}`);
    }
  }
}

main();
