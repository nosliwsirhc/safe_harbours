/**
 * Mirror every safeharbours.ca page and generate its Astro route (ThemeLayout).
 *   node scripts/mirror-all.mjs
 */
import { mirror } from './mirror.mjs';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const MIRROR = path.join(ROOT, '_mirror');

const BLOG = [
  'getting-started-with-fostering-in-ontario',
  'costs-and-compensation-of-being-a-foster-parent-in-ontario',
  'is-fostering-right-for-you',
  'best-childrens-foster-agencies-in-toronto',
  '5-best-childrens-foster-agencies-in-mississauga',
  '4-best-childrens-foster-agencies-in-hamilton',
  'what-is-it-like-to-be-a-foster-parent-guide-for-ontario',
  'is-it-hard-to-become-a-foster-parent-in-ontario',
  'how-to-choose-a-foster-agency-a-guide-for-ontario',
  'can-you-request-a-different-foster-child-if-it-isnt-working-out-yes',
  'can-you-end-a-foster-placement-if-it-isnt-working-out-yes',
  'eligibility-and-requirements-for-becoming-a-foster-parent-in-ontario',
];

const PAGES = [
  { path: '/', name: 'home', route: 'index' },
  { path: '/about-fostering/', name: 'about-fostering', route: 'about-fostering' },
  { path: '/become-a-foster-parent/', name: 'become-a-foster-parent', route: 'become-a-foster-parent' },
  { path: '/our-story/', name: 'our-story', route: 'our-story' },
  { path: '/careers/', name: 'careers', route: 'careers' },
  { path: '/program-description/', name: 'program-description', route: 'program-description' },
  { path: '/program-description/complaints/', name: 'complaints', route: 'program-description/complaints' },
  { path: '/resources/', name: 'resources', route: 'resources' },
  { path: '/contact-us/', name: 'contact-us', route: 'contact-us' },
  { path: '/privacy-policy/', name: 'privacy-policy', route: 'privacy-policy' },
  { path: '/terms-conditions/', name: 'terms-conditions', route: 'terms-conditions' },
  { path: '/book-an-appointment/', name: 'book-an-appointment', route: 'book-an-appointment' },
  { path: '/thank-you-fostering/', name: 'thank-you-fostering', route: 'thank-you-fostering' },
  ...BLOG.map((s) => ({ path: `/resources/${s}/`, name: s, route: `resources/${s}` })),
];

const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

async function genPage({ name, route }) {
  const meta = JSON.parse(await readFile(path.join(MIRROR, `${name}.meta.json`), 'utf8'));
  const depth = route.split('/').length - 1; // 0 for top-level, 1 for nested
  const up = '../'.repeat(depth + 1);
  const title = meta.title?.replace(/\s*[-|]\s*Safe Harbours\s*$/i, '').trim() || 'Safe Harbours';
  const file = path.join(PAGES_DIR, `${route}.astro`);
  await mkdir(path.dirname(file), { recursive: true });
  const body = `---\nimport ThemeLayout from '${up}layouts/ThemeLayout.astro';\n---\n<ThemeLayout name="${esc(name)}" title="${esc(title)} | Safe Harbours" />\n`;
  await writeFile(file, body);
}

for (const p of PAGES) {
  console.log(`\n# ${p.path}`);
  await mirror(p.path, p.name);
  await genPage(p);
  console.log(`  -> src/pages/${p.route}.astro`);
}
console.log(`\nDone: ${PAGES.length} pages mirrored + routed.`);
