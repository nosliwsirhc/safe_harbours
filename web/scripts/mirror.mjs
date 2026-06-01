/**
 * Faithful theme mirror for Safe Harbours.
 *
 * Captures a live WordPress page's exact markup + theme CSS and rewrites it to
 * be self-hosted under /assets/, so the Astro build serves a pixel-identical copy.
 *
 *   node scripts/mirror.mjs <slug-or-path> <out-name>
 *   e.g. node scripts/mirror.mjs / home
 *
 * Writes:
 *   public/assets/app.css            (localized theme CSS, once)
 *   public/assets/app.js             (theme JS, once)
 *   public/assets/{uploads,theme,plugins}/...   (downloaded assets)
 *   _mirror/<out>.head.html      (inline <style> blocks from <head>)
 *   _mirror/<out>.body.html      (cleaned <body> inner HTML)
 *   _mirror/<out>.meta.json      ({ bodyClass, title, description })
 *
 * The Astro route then injects head/body via set:html (see ThemeLayout).
 */
import { parse } from 'node-html-parser';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://www.safeharbours.ca';
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const PUB = path.join(ROOT, 'public');
const MIRROR = path.join(ROOT, '_mirror');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const seen = new Set();
async function download(url, destAbs) {
  if (seen.has(destAbs)) return true;
  if (existsSync(destAbs)) { seen.add(destAbs); return true; }
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA } });
    if (!r.ok) { console.warn(`  ! ${r.status} ${url}`); return false; }
    await mkdir(path.dirname(destAbs), { recursive: true });
    await writeFile(destAbs, Buffer.from(await r.arrayBuffer()));
    seen.add(destAbs); // only cache as done AFTER a successful write
    return true;
  } catch (e) { console.warn(`  ! ${e.message} ${url}`); return false; }
}

// Output prefix for self-hosted assets. Old WordPress URLs (/wp-content/,
// /wp-includes/) are 301-redirected here by public/_redirects.
const ASSET_DIR = 'assets';

// Map an absolute safeharbours.ca asset URL to a local /assets/... path,
// download the asset, and return the local path — but only if the download
// succeeded; otherwise return the original URL so we never rewrite to a missing file.
async function localizeAsset(absUrl) {
  let u;
  try { u = new URL(absUrl, ORIGIN); } catch { return absUrl; }
  if (!/safeharbours\.ca$/.test(u.hostname)) return absUrl; // leave third-party
  const m = u.pathname.match(/\/wp-(content|includes)\/(.+)$/);
  if (!m) return absUrl;
  const rel =
    m[1] === 'content'
      ? m[2].replace(/^themes\/safe-harbours\//, 'theme/') // uploads/.., plugins/.., theme/..
      : `includes/${m[2]}`; // wp-includes/.. -> /assets/includes/..
  const ok = await download(u.origin + u.pathname, path.join(PUB, ASSET_DIR, rel));
  return ok ? `/${ASSET_DIR}/${rel}` : absUrl;
}

// Asset URL on our origin worth localizing (covers wp-content and wp-includes).
const LOCALIZABLE = /(?:safeharbours\.ca)?\/wp-(?:content|includes)\//;

// Rewrite a srcset attribute (comma-separated "url descriptor").
async function localizeSrcset(val) {
  const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const [url, ...desc] = p.split(/\s+/);
    if (url.startsWith('data:')) { out.push(p); continue; } // preserve inline candidates
    out.push(`${await localizeAsset(url)} ${desc.join(' ')}`.trim());
  }
  return out.join(', ');
}

async function localizeAppCss() {
  const file = path.join(PUB, ASSET_DIR, 'theme', 'build', 'app.css');
  let css = await readFile(file, 'utf8');
  // theme build/app.css references ../img/* -> themes/safe-harbours/img/*
  const re = /url\((["']?)(\.\.\/img\/[^)"']+)\1\)/g;
  const map = {};
  for (const [, , ref] of css.matchAll(re)) {
    if (map[ref] !== undefined) continue;
    map[ref] = await localizeAsset(`${ORIGIN}/wp-content/themes/safe-harbours/${ref.replace('../', '')}`);
  }
  // Replace only inside url(...) tokens (not a global substring replace, which
  // would corrupt URLs that share a prefix).
  css = css.replace(re, (full, q, ref) => (map[ref] ? `url(${q}${map[ref]}${q})` : full));
  // Pull the render-blocking Google Fonts @import out of the CSS — ThemeLayout
  // loads it via a parallel <link rel=stylesheet> + preconnect instead.
  const fontImport = css.match(/@import\s+url\((['"]?)(https:\/\/fonts\.googleapis\.com[^)'"]+)\1\)\s*;?/);
  if (fontImport) {
    css = css.replace(fontImport[0], '');
    await writeFile(path.join(MIRROR, 'fonts.url'), fontImport[2]); // record for ThemeLayout reference
  }
  await writeFile(file, css);
  console.log(`  app.css localized (${Object.keys(map).length} asset ref(s)${fontImport ? ', font @import hoisted' : ''})`);
}

async function ensureTheme() {
  await mkdir(MIRROR, { recursive: true });
  await download(`${ORIGIN}/wp-content/themes/safe-harbours/build/app.css`, path.join(PUB, ASSET_DIR, 'theme', 'build', 'app.css'));
  await download(`${ORIGIN}/wp-content/themes/safe-harbours/build/app.js`, path.join(PUB, ASSET_DIR, 'theme', 'build', 'app.js'));
  await localizeAppCss();
}

async function mirror(pagePath, outName) {
  await ensureTheme();
  const res = await fetch(ORIGIN + pagePath, { headers: { 'user-agent': UA } });
  await processHtml(await res.text(), outName);
}

async function processHtml(html, outName) {
  if (/just a moment|challenge-platform|cf-browser-verification/i.test(html.slice(0, 4000))) {
    console.warn(`  ! ${outName}: looks like a Cloudflare challenge page — skipped`);
    return;
  }
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: true } });

  // --- head: external stylesheets (in order) + inline <style> blocks ---
  const styles = [];
  for (const link of root.querySelectorAll('head link[rel="stylesheet"]')) {
    const href = link.getAttribute('href');
    if (!href) continue;
    if (LOCALIZABLE.test(href)) {
      styles.push(await localizeAsset(href.split('?')[0]));
    } else if (/^https?:/.test(href)) {
      styles.push(href); // third-party (e.g. Google Fonts) — leave remote
    }
  }
  const headStyles = root.querySelectorAll('head style').map((s) => s.toString()).join('\n');
  const title = root.querySelector('title')?.text?.trim() || 'Safe Harbours';
  let desc = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  // node-html-parser occasionally fails to resolve <body> on some pages;
  // fall back to slicing the body out by regex and re-parsing the fragment.
  let body = root.querySelector('body');
  if (!body) {
    const m = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
    if (!m) { console.warn(`  ! ${outName}: no <body> found — skipped`); return; }
    body = parse(`<div${m[1]}>${m[2]}</div>`, { comment: false, blockTextElements: { script: false, style: true } }).querySelector('div');
  }
  const bodyClass = body.getAttribute('class') || '';

  // The WP pages rarely set a meta description; derive one from the first
  // substantial MAIN-content paragraph (skipping header/footer boilerplate)
  // so every page ships a unique, content-based one (SEO).
  if (!desc) {
    const scope = body.querySelector('main') || body;
    for (const p of scope.querySelectorAll('p')) {
      if (p.closest && p.closest('header, footer')) continue;
      const t = p.text.replace(/\s+/g, ' ').trim();
      if (t.length >= 60) {
        desc = t.length > 157 ? t.slice(0, 157).replace(/\s+\S*$/, '') + '…' : t;
        break;
      }
    }
  }

  // --- strip scripts, noscript, GTM, emoji, admin bar, svg-defs we don't need ---
  body.querySelectorAll('script, noscript, link[rel="dns-prefetch"], #wpadminbar').forEach((n) => n.remove());

  // --- de-lazy images (wp-smush stored the real URL in data-src) and set a
  // sensible loading strategy: the brand logo + the first main image stay
  // eager (above the fold); everything else lazy-loads. The hero gets
  // fetchpriority=high for LCP. ---
  const eager = new Set();
  const logo = body.querySelector('header img, .site-header img, .logo img, .top-bar img');
  if (logo) eager.add(logo);
  const heroImg = body.querySelector('main img, .banner img, [class*="hero"] img');
  if (heroImg) { eager.add(heroImg); heroImg.setAttribute('fetchpriority', 'high'); }
  body.querySelectorAll('img').forEach((img) => {
    const ds = img.getAttribute('data-src');
    if (ds) { img.setAttribute('src', ds); img.removeAttribute('data-src'); }
    const dss = img.getAttribute('data-srcset');
    if (dss) { img.setAttribute('srcset', dss); img.removeAttribute('data-srcset'); }
    img.setAttribute('class', (img.getAttribute('class') || '').replace(/\blazyload\b/g, '').trim());
    img.setAttribute('decoding', 'async');
    img.setAttribute('loading', eager.has(img) ? 'eager' : 'lazy');
  });
  body.querySelectorAll('source').forEach((s) => {
    const dss = s.getAttribute('data-srcset');
    if (dss) { s.setAttribute('srcset', dss); s.removeAttribute('data-srcset'); }
  });

  // --- defer autoplay videos: load + play only when scrolled into view
  // (forms-bridge.js handles the IntersectionObserver). ---
  body.querySelectorAll('video[autoplay]').forEach((v) => {
    v.removeAttribute('autoplay');
    v.setAttribute('data-autoplay', '');
    v.setAttribute('preload', 'none');
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
  });

  // --- localize asset URLs in src / srcset / style(background) ---
  for (const el of body.querySelectorAll('[src], [srcset], [href], [style]')) {
    const src = el.getAttribute('src');
    if (src && !src.startsWith('data:') && LOCALIZABLE.test(src)) el.setAttribute('src', await localizeAsset(src));
    const ss = el.getAttribute('srcset');
    if (ss) el.setAttribute('srcset', await localizeSrcset(ss));
    const href = el.getAttribute('href');
    if (href && LOCALIZABLE.test(href)) el.setAttribute('href', await localizeAsset(href));
    const style = el.getAttribute('style');
    if (style && /url\(/.test(style) && LOCALIZABLE.test(style)) {
      // Resolve each url() target, then replace only inside url(...) tokens
      // (a global substring replace would corrupt overlapping URLs).
      const urls = [...style.matchAll(/url\((["']?)([^)"']+)\1\)/g)];
      const map = {};
      for (const [, , u] of urls) if (map[u] === undefined && LOCALIZABLE.test(u)) map[u] = await localizeAsset(u);
      const ns = style.replace(/url\((["']?)([^)"']+)\1\)/g, (full, q, u) => (map[u] ? `url(${q}${map[u]}${q})` : full));
      el.setAttribute('style', ns);
    }
  }

  // --- reserve image space (CLS): set width/height from the downloaded file's
  // intrinsic dimensions when the markup omits them (theme CSS keeps
  // max-width:100%; height:auto, so the attrs only fix the aspect ratio). ---
  for (const img of body.querySelectorAll('img')) {
    if (img.getAttribute('width') && img.getAttribute('height')) continue;
    const src = img.getAttribute('src') || '';
    if (!src.startsWith(`/${ASSET_DIR}/`)) continue;
    const file = path.join(PUB, src.replace(/^\//, ''));
    if (!existsSync(file)) continue;
    try {
      const meta = await sharp(file).metadata();
      if (meta.width && meta.height) {
        img.setAttribute('width', String(meta.width));
        img.setAttribute('height', String(meta.height));
      }
    } catch { /* non-raster (or unreadable) — skip */ }
  }

  // --- rewrite internal links to root-relative (keep them on the new site) ---
  for (const a of body.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (!href) continue;
    if (href.startsWith(ORIGIN)) a.setAttribute('href', href.slice(ORIGIN.length) || '/');
    else if (href.startsWith('//www.safeharbours.ca')) a.setAttribute('href', href.replace('//www.safeharbours.ca', '') || '/');
  }

  // --- a11y/SEO: make generic link text descriptive. "Learn More" links get
  // their VISIBLE text rewritten to name the destination (approved deviation
  // from the source copy); other generic CTAs keep their copy but gain a
  // descriptive aria-label derived from where they go. ---
  const GENERIC = /^(learn more|read more|click here|more|here|view more|see more|details|get started)$/i;
  const humanize = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  for (const a of body.querySelectorAll('a[href]')) {
    const txt = a.text.replace(/\s+/g, ' ').trim();
    if (!GENERIC.test(txt)) continue;
    const href = a.getAttribute('href') || '';
    const seg = href.split(/[?#]/)[0].replace(/\/$/, '').split('/').filter(Boolean).pop();
    const dest = href === '/' || href === '' ? 'Home' : seg && /^[a-z0-9-]+$/i.test(seg) ? humanize(seg) : '';
    if (/^(learn more|read more|more|view more|see more|details)$/i.test(txt) && dest) {
      // Rewrite the visible text to be descriptive, e.g. "Learn More" -> "Learn About Fostering".
      const noun = dest.replace(/^About\s+/i, '') || 'More';
      a.set_content(`Learn About ${noun}`);
      a.removeAttribute('aria-label');
    } else if (dest && !a.getAttribute('aria-label')) {
      a.setAttribute('aria-label', `${txt}: ${dest}`);
    }
  }

  // --- fix dead placeholder CTAs: a bare href="#" with generic text (e.g. the
  // careers "In College?" "Learn More") was never wired up on WordPress —
  // point it at Contact Us. Only generic-text links, so real JS toggles are untouched. ---
  for (const a of body.querySelectorAll('a[href="#"]')) {
    const t = a.text.replace(/\s+/g, ' ').trim();
    if (!GENERIC.test(t)) continue;
    a.setAttribute('href', '/contact-us');
    a.set_content('Get in Touch');
    a.removeAttribute('aria-label');
  }

  // --- a11y: icon-only buttons (e.g. the mobile menu toggle off-canvas__toggle)
  // ship no text — give them an accessible name (WCAG 4.1.2). ---
  for (const btn of body.querySelectorAll('button')) {
    if (btn.text.replace(/\s+/g, ' ').trim() || btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby')) continue;
    const c = (btn.getAttribute('class') || '').toLowerCase();
    btn.setAttribute('aria-label', /close/.test(c) ? 'Close menu' : /search/.test(c) ? 'Search' : 'Menu');
  }

  // --- a11y: normalize heading order (no skipped levels) WITHOUT changing the
  // visual — retag downward jumps and add an m-h{originalLevel} class so the
  // theme's per-tag typography is preserved (sizes defined in a11y-overrides.css). ---
  let prevLevel = null;
  for (const h of body.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    const lvl = Number(h.rawTagName.slice(1));
    const target = prevLevel === null ? lvl : lvl > prevLevel + 1 ? prevLevel + 1 : lvl;
    if (target !== lvl) {
      const cls = (h.getAttribute('class') || '').trim();
      h.setAttribute('class', `${cls ? cls + ' ' : ''}m-h${lvl}`);
      h.rawTagName = `h${target}`;
    }
    prevLevel = target;
  }

  await writeFile(path.join(MIRROR, `${outName}.head.html`), headStyles);
  await writeFile(path.join(MIRROR, `${outName}.body.html`), body.innerHTML);
  await writeFile(path.join(MIRROR, `${outName}.meta.json`), JSON.stringify({ bodyClass, title, description: desc, styles, script: `/${ASSET_DIR}/theme/build/app.js` }, null, 2));
  console.log(`  wrote _mirror/${outName}.{head,body}.html  (body ${Math.round(body.innerHTML.length / 1024)}KB, ${seen.size} assets)`);
}

export { mirror, processHtml, ensureTheme };

if (import.meta.url === `file://${process.argv[1]}`) {
  const [pagePath = '/', outName = 'home'] = process.argv.slice(2);
  mirror(pagePath, outName);
}
