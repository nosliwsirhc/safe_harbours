/**
 * Faithful theme mirror for Safe Harbours.
 *
 * Captures a live WordPress page's exact markup + theme CSS and rewrites it to
 * be self-hosted under /wp/, so the Astro build serves a pixel-identical copy.
 *
 *   node scripts/mirror.mjs <slug-or-path> <out-name>
 *   e.g. node scripts/mirror.mjs / home
 *
 * Writes:
 *   public/wp/app.css            (localized theme CSS, once)
 *   public/wp/app.js             (theme JS, once)
 *   public/wp/{uploads,theme,plugins}/...   (downloaded assets)
 *   _mirror/<out>.head.html      (inline <style> blocks from <head>)
 *   _mirror/<out>.body.html      (cleaned <body> inner HTML)
 *   _mirror/<out>.meta.json      ({ bodyClass, title, description })
 *
 * The Astro route then injects head/body via set:html (see ThemeLayout).
 */
import { parse } from 'node-html-parser';
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
  seen.add(destAbs);
  if (existsSync(destAbs)) return true;
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA } });
    if (!r.ok) { console.warn(`  ! ${r.status} ${url}`); return false; }
    await mkdir(path.dirname(destAbs), { recursive: true });
    await writeFile(destAbs, Buffer.from(await r.arrayBuffer()));
    return true;
  } catch (e) { console.warn(`  ! ${e.message} ${url}`); return false; }
}

// Map an absolute safeharbours.ca asset URL to a local /wp/... path, and
// download the asset. Returns the local path (or original if not mappable).
async function localizeAsset(absUrl) {
  let u;
  try { u = new URL(absUrl, ORIGIN); } catch { return absUrl; }
  if (!/safeharbours\.ca$/.test(u.hostname)) return absUrl; // leave third-party
  const m = u.pathname.match(/\/wp-content\/(uploads|themes|plugins)\/(.+)$/);
  if (!m) return absUrl;
  const rel = `${m[1]}/${m[2]}`.replace(/^themes\/safe-harbours\//, 'theme/');
  const local = `/wp/${rel}`;
  await download(u.origin + u.pathname, path.join(PUB, 'wp', rel));
  return local;
}

// Rewrite a srcset attribute (comma-separated "url descriptor").
async function localizeSrcset(val) {
  const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const [url, ...desc] = p.split(/\s+/);
    if (url.startsWith('data:')) continue;
    out.push(`${await localizeAsset(url)} ${desc.join(' ')}`.trim());
  }
  return out.join(', ');
}

async function localizeAppCss() {
  const file = path.join(PUB, 'wp', 'theme', 'build', 'app.css');
  let css = await readFile(file, 'utf8');
  // theme build/app.css references ../img/* -> themes/safe-harbours/img/*
  const refs = [...css.matchAll(/url\((["']?)(\.\.\/img\/[^)"']+)\1\)/g)];
  for (const [, , ref] of refs) {
    const abs = `${ORIGIN}/wp-content/themes/safe-harbours/${ref.replace('../', '')}`;
    const local = await localizeAsset(abs);
    css = css.split(ref).join(local);
  }
  await writeFile(file, css);
  console.log(`  app.css localized (${refs.length} asset ref(s))`);
}

async function mirror(pagePath, outName) {
  await mkdir(MIRROR, { recursive: true });
  // theme CSS/JS (download once, at their natural paths)
  await download(`${ORIGIN}/wp-content/themes/safe-harbours/build/app.css`, path.join(PUB, 'wp', 'theme', 'build', 'app.css'));
  await download(`${ORIGIN}/wp-content/themes/safe-harbours/build/app.js`, path.join(PUB, 'wp', 'theme', 'build', 'app.js'));
  await localizeAppCss();

  const res = await fetch(ORIGIN + pagePath, { headers: { 'user-agent': UA } });
  const html = await res.text();
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: true } });

  // --- head: external stylesheets (in order) + inline <style> blocks ---
  const styles = [];
  for (const link of root.querySelectorAll('head link[rel="stylesheet"]')) {
    const href = link.getAttribute('href');
    if (!href) continue;
    if (/safeharbours\.ca\/wp-content/.test(href) || href.startsWith('/wp-content')) {
      styles.push(await localizeAsset(href.split('?')[0]));
    } else if (/^https?:/.test(href)) {
      styles.push(href); // third-party (e.g. Google Fonts) — leave remote
    }
  }
  const headStyles = root.querySelectorAll('head style').map((s) => s.toString()).join('\n');
  const title = root.querySelector('title')?.text?.trim() || 'Safe Harbours';
  const desc = root.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  const body = root.querySelector('body');
  const bodyClass = body.getAttribute('class') || '';

  // --- strip scripts, noscript, GTM, emoji, admin bar, svg-defs we don't need ---
  body.querySelectorAll('script, noscript, link[rel="dns-prefetch"], #wpadminbar').forEach((n) => n.remove());

  // --- de-lazy images (wp-smush): data-src -> src, data-srcset -> srcset ---
  body.querySelectorAll('img').forEach((img) => {
    const ds = img.getAttribute('data-src');
    if (ds) { img.setAttribute('src', ds); img.removeAttribute('data-src'); }
    const dss = img.getAttribute('data-srcset');
    if (dss) { img.setAttribute('srcset', dss); img.removeAttribute('data-srcset'); }
    img.setAttribute('class', (img.getAttribute('class') || '').replace(/\blazyload\b/g, '').trim());
    img.removeAttribute('loading');
  });
  body.querySelectorAll('source').forEach((s) => {
    const dss = s.getAttribute('data-srcset');
    if (dss) { s.setAttribute('srcset', dss); s.removeAttribute('data-srcset'); }
  });

  // --- localize asset URLs in src / srcset / style(background) ---
  for (const el of body.querySelectorAll('[src], [srcset], [href], [style]')) {
    const src = el.getAttribute('src');
    if (src && !src.startsWith('data:') && /safeharbours\.ca\/wp-content/.test(src)) el.setAttribute('src', await localizeAsset(src));
    const ss = el.getAttribute('srcset');
    if (ss) el.setAttribute('srcset', await localizeSrcset(ss));
    const href = el.getAttribute('href');
    if (href && /safeharbours\.ca\/wp-content/.test(href)) el.setAttribute('href', await localizeAsset(href));
    const style = el.getAttribute('style');
    if (style && /url\(/.test(style) && /wp-content/.test(style)) {
      const m = [...style.matchAll(/url\((["']?)([^)"']+)\1\)/g)];
      let ns = style;
      for (const [, , u] of m) if (/wp-content/.test(u)) ns = ns.split(u).join(await localizeAsset(u));
      el.setAttribute('style', ns);
    }
  }

  // --- rewrite internal links to root-relative (keep them on the new site) ---
  for (const a of body.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (!href) continue;
    if (href.startsWith(ORIGIN)) a.setAttribute('href', href.slice(ORIGIN.length) || '/');
    else if (href.startsWith('//www.safeharbours.ca')) a.setAttribute('href', href.replace('//www.safeharbours.ca', '') || '/');
  }

  await writeFile(path.join(MIRROR, `${outName}.head.html`), headStyles);
  await writeFile(path.join(MIRROR, `${outName}.body.html`), body.innerHTML);
  await writeFile(path.join(MIRROR, `${outName}.meta.json`), JSON.stringify({ bodyClass, title, description: desc, styles, script: '/wp/theme/build/app.js' }, null, 2));
  console.log(`  wrote _mirror/${outName}.{head,body}.html  (body ${Math.round(body.innerHTML.length / 1024)}KB, ${seen.size} assets)`);
}

const [pagePath = '/', outName = 'home'] = process.argv.slice(2);
mirror(pagePath, outName);
