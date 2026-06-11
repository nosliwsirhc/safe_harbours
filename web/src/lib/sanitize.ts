// Sanitizes editor-authored rich text against a fixed allowlist, using the
// `xss` library (a parser-based, vetted sanitizer). Pure JS, so it runs in both
// Node (dev) and the Workers runtime (prod) — DOMPurify needs a DOM and won't.
// Inline + simple block tags only (the shapes Lexical emits); everything else is
// unwrapped, and `xss` blocks dangerous href schemes (javascript:, etc.) itself.
import { FilterXSS } from 'xss';

const filter = new FilterXSS({
  whiteList: {
    a: ['href', 'target', 'rel'],
    b: [],
    strong: [],
    i: [],
    em: [],
    u: [],
    br: [],
    sup: [],
    sub: [],
    p: [],
    h2: [],
    h3: [],
    h4: [],
    ul: [],
    ol: [],
    li: [],
  },
  stripIgnoreTag: true, // drop disallowed tags, keep their text
  stripIgnoreTagBody: ['script', 'style'], // drop these tags AND their content
});

/** Sanitize rich HTML to the allowlist (safe to render via set:html). */
export function sanitizeRich(html = ''): string {
  return html ? filter.process(html) : '';
}

function safeHref(h: string): boolean {
  const v = h.trim().toLowerCase();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:') || v.startsWith('/') || v.startsWith('#');
}

/** Return the URL only if it uses a safe scheme, else '' (for href/link fields). */
export function sanitizeUrl(url = ''): string {
  return safeHref(url) ? url.trim() : '';
}

/** Flatten any markup to plain text (for title/label fields). */
export function toPlainText(html = ''): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
