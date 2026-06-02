// One-time Phase 2 extraction for the resource articles. The article
// *.main.html blobs it reads have since been retired, so this no longer
// re-runs — src/data/articles.ts and _mirror/*.article.html are now the
// hand-maintained source of truth. Kept as a record of how they were derived.
//
//   node scripts/extract-articles.mjs [--check]
//
// Parses the 12 resource-article _mirror/*.main.html files (+ resources index)
// into:
//   - src/data/articles.ts  — registry: per-slug card data (title/thumbnail/
//     excerpt/meta) + hero (title/image) + ordered related slugs; plus the index
//     listing order.
//   - _mirror/<slug>.article.html — each article's unique prose body fragment.
//
// Card data for a slug is harvested from every place it appears as a <a.post-card>
// (related-posts across all articles + the index) and asserted consistent. The
// surrounding template (hero shell, author card, share, related-posts wrapper)
// becomes Astro components, so it is NOT emitted here.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MIRROR = path.join(process.cwd(), '_mirror');
const DATA = path.join(process.cwd(), 'src', 'data', 'articles.ts');
const CHECK = process.argv.includes('--check');

// The 12 article slugs = the resource page routes.
const SLUGS = readdirSync(path.join(process.cwd(), 'src', 'pages', 'resources'))
  .filter((f) => f.endsWith('.astro'))
  .map((f) => f.replace(/\.astro$/, ''))
  .sort();

const read = (name) => readFileSync(path.join(MIRROR, `${name}.main.html`), 'utf8');
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

// Parse every <a class="post-card" …>…</a> in a blob → card records.
function parseCards(html) {
  const cards = [];
  const re = /<a class="post-card" href="\/resources\/([^/"]+)\/">(.*?)<\/a>/gs;
  for (const m of html.matchAll(re)) {
    const slug = m[1], inner = m[2];
    const thumb = inner.match(/post-card__thumbnail" style="background-image: url\(([^)]+)\)/)?.[1] ?? '';
    const title = inner.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/s)?.[1]?.trim() ?? '';
    const excerpt = collapse(inner.match(/<div class="excerpt">(.*?)<\/div>/s)?.[1] ?? '');
    const meta = collapse(inner.match(/<div class="meta">\s*<p>(.*?)<\/p>/s)?.[1] ?? '');
    cards.push({ slug, thumb, title, excerpt, meta });
  }
  return cards;
}

// 1) Harvest card data per slug from all articles + the index (union, deduped).
const cardBySlug = {};
const conflicts = [];
for (const name of [...SLUGS, 'resources']) {
  for (const c of parseCards(read(name))) {
    const prev = cardBySlug[c.slug];
    if (!prev) cardBySlug[c.slug] = c;
    else if (prev.thumb !== c.thumb || prev.title !== c.title || prev.excerpt !== c.excerpt || prev.meta !== c.meta)
      conflicts.push({ slug: c.slug, in: name, prev, now: c });
  }
}

// 2) Per-article: hero title/image, prose fragment, ordered related slugs.
const articles = {};
for (const slug of SLUGS) {
  const html = read(slug);
  const heroTitle = html.match(/page-hero blog[\s\S]*?<h1>(.*?)<\/h1>/s)?.[1]?.trim() ?? '';
  const heroImage = html.match(/page-hero blog[\s\S]*?background-image: url\('([^']+)'\)/s)?.[1] ?? '';
  // prose = inner of the first `.cell.large-11`, up to the <footer class="cell large-11">
  const prose = html.match(/<div class="cell large-11">([\s\S]*)<\/div>\s*<footer class="cell large-11">/s)?.[1]?.trim() ?? '';
  const related = parseCards(html.match(/<aside class="related-posts">([\s\S]*?)<\/aside>/s)?.[1] ?? '').map((c) => c.slug);
  const card = cardBySlug[slug] ?? {};
  articles[slug] = {
    slug, heroTitle, heroImage,
    cardTitle: card.title ?? heroTitle, thumbnail: card.thumb ?? '', excerpt: card.excerpt ?? '', meta: card.meta ?? '',
    related,
  };
  if (!CHECK) writeFileSync(path.join(MIRROR, `${slug}.article.html`), prose + '\n');
}

// 3) Index listing order (the cards shown on /resources/, in order).
const indexOrder = parseCards(read('resources')).map((c) => c.slug);

// --- report ---
console.log(`slugs: ${SLUGS.length}  cards harvested: ${Object.keys(cardBySlug).length}  index cards: ${indexOrder.length}`);
console.log(`card-data conflicts: ${conflicts.length}`);
for (const c of conflicts) console.log(`  ! ${c.slug} differs in ${c.in}:\n    prev=${JSON.stringify(c.prev)}\n    now =${JSON.stringify(c.now)}`);
for (const s of SLUGS) {
  const a = articles[s];
  const miss = ['heroTitle', 'heroImage', 'cardTitle', 'thumbnail', 'excerpt', 'meta'].filter((k) => !a[k]);
  const proseLen = (read(s).match(/<div class="cell large-11">([\s\S]*)<\/div>\s*<footer class="cell large-11">/s)?.[1] ?? '').length;
  console.log(`  ${s}: related=[${a.related.join(', ')}] prose=${proseLen}b${miss.length ? '  MISSING:' + miss.join(',') : ''}`);
}
const slugsInIndexNotArticles = indexOrder.filter((s) => !SLUGS.includes(s));
if (slugsInIndexNotArticles.length) console.log(`  ! index references non-article slugs: ${slugsInIndexNotArticles.join(', ')}`);

if (CHECK) { console.log('\n--check: no files written.'); process.exit(conflicts.length ? 1 : 0); }

// 4) Emit articles.ts
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const lines = [];
lines.push('// AUTO-GENERATED by scripts/extract-articles.mjs — single source of truth for the');
lines.push('// resource articles. Card data powers both each article\'s related-posts and the');
lines.push('// /resources index. The prose body of each article lives in _mirror/<slug>.article.html.');
lines.push('');
lines.push('export interface Article {');
lines.push('  slug: string;');
lines.push('  heroTitle: string;   // <h1> in the article hero');
lines.push('  heroImage: string;   // hero background image url');
lines.push('  cardTitle: string;   // title shown on post cards');
lines.push('  thumbnail: string;   // post-card thumbnail url');
lines.push('  excerpt: string;     // post-card excerpt');
lines.push('  meta: string;        // post-card meta line, e.g. "Mar 3rd 2026 By Safe Harbours"');
lines.push('  related: string[];   // ordered slugs shown in this article\'s related-posts');
lines.push('}');
lines.push('');
lines.push('export const articles: Record<string, Article> = {');
for (const s of SLUGS) {
  const a = articles[s];
  lines.push(`  '${s}': {`);
  lines.push(`    slug: '${s}',`);
  lines.push(`    heroTitle: '${esc(a.heroTitle)}',`);
  lines.push(`    heroImage: '${esc(a.heroImage)}',`);
  lines.push(`    cardTitle: '${esc(a.cardTitle)}',`);
  lines.push(`    thumbnail: '${esc(a.thumbnail)}',`);
  lines.push(`    excerpt: '${esc(a.excerpt)}',`);
  lines.push(`    meta: '${esc(a.meta)}',`);
  lines.push(`    related: [${a.related.map((r) => `'${r}'`).join(', ')}],`);
  lines.push('  },');
}
lines.push('};');
lines.push('');
lines.push(`// Order of cards on the /resources index page.`);
lines.push(`export const indexOrder: string[] = [${indexOrder.map((s) => `'${s}'`).join(', ')}];`);
lines.push('');
writeFileSync(DATA, lines.join('\n'));
console.log(`\nwrote ${DATA} and ${SLUGS.length} prose fragments.`);
