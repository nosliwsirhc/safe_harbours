/**
 * Process pre-fetched page HTML (captured via the browser into _mirror/raw.json,
 * bypassing Cloudflare's bot challenge) into mirrored pages + Astro routes.
 *   node scripts/mirror-from-raw.mjs
 */
import { processHtml, ensureTheme } from './mirror.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const MIRROR = path.join(ROOT, '_mirror');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

const ROUTE = (name) => {
  if (name === 'home') return 'index';
  if (name === 'complaints') return 'program-description/complaints';
  // blog posts live under /resources/<slug>
  const blog = new Set([
    'getting-started-with-fostering-in-ontario', 'costs-and-compensation-of-being-a-foster-parent-in-ontario',
    'is-fostering-right-for-you', 'best-childrens-foster-agencies-in-toronto',
    '5-best-childrens-foster-agencies-in-mississauga', '4-best-childrens-foster-agencies-in-hamilton',
    'what-is-it-like-to-be-a-foster-parent-guide-for-ontario', 'is-it-hard-to-become-a-foster-parent-in-ontario',
    'how-to-choose-a-foster-agency-a-guide-for-ontario', 'can-you-request-a-different-foster-child-if-it-isnt-working-out-yes',
    'can-you-end-a-foster-placement-if-it-isnt-working-out-yes', 'eligibility-and-requirements-for-becoming-a-foster-parent-in-ontario',
  ]);
  return blog.has(name) ? `resources/${name}` : name;
};

const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

async function genPage(name, route) {
  const meta = JSON.parse(await readFile(path.join(MIRROR, `${name}.meta.json`), 'utf8'));
  const depth = route.split('/').length - 1;
  const up = '../'.repeat(depth + 1);
  const title = (meta.title || 'Safe Harbours').replace(/\s*[-|]\s*Safe Harbours\s*$/i, '').trim() || 'Safe Harbours';
  const file = path.join(PAGES_DIR, `${route}.astro`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `---\nimport ThemeLayout from '${up}layouts/ThemeLayout.astro';\n---\n<ThemeLayout name="${esc(name)}" title="${esc(title)} | Safe Harbours" />\n`);
}

const data = JSON.parse(await readFile(path.join(MIRROR, 'raw.json'), 'utf8'));
await ensureTheme();
for (const p of data.pages) {
  if (!p.html || p.status !== 200) { console.warn(`  skip ${p.name} (status ${p.status})`); continue; }
  console.log(`# ${p.name}`);
  await processHtml(p.html, p.name);
  const route = ROUTE(p.name);
  await genPage(p.name, route);
  console.log(`  -> src/pages/${route}.astro`);
}
console.log('Done.');
