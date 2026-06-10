// Tiny allowlist sanitizer for editor-authored rich text. Inline formatting only
// (bold/italic/underline/links/line-breaks/super-sub) — the shapes the site's
// copy actually uses. Authors are authenticated, so this is about cleanliness +
// blocking obvious injection, not hostile-input hardening; a production build
// should still run a vetted sanitizer. Dependency-free so it works in Node (dev)
// and workerd (prod) alike.

// Block + inline tags a rich editor (Lexical) emits. Anything else is unwrapped.
const ALLOWED = new Set(['p', 'br', 'a', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'sup', 'sub']);

function safeHref(h: string): boolean {
  const v = (h || '').trim().toLowerCase();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:') || v.startsWith('/') || v.startsWith('#');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Keep only allowlisted tags; strip all attributes except a safe href. */
export function sanitizeRich(html = ''): string {
  if (!html) return '';
  let s = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(script|style)[^>]*>/gi, '');

  s = s.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (_m, slash: string, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED.has(tag)) return ''; // strip the tag, keep its inner text
    if (slash) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') {
      const m = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      // Groups are alternatives — only one matches, the rest are undefined.
      const href = m?.[2] ?? m?.[3] ?? m?.[4] ?? '';
      // Unsafe/missing href → inert <a> (keeps the text + matches its </a>).
      if (!safeHref(href)) return '<a>';
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`;
    }
    return `<${tag}>`; // allowed tag, all attributes dropped
  });

  return s.trim();
}

/** Return the URL only if it uses a safe scheme, else '' (for href/link fields). */
export function sanitizeUrl(url = ''): string {
  return safeHref(url) ? url.trim() : '';
}

/** Flatten any markup to plain text (for title/label fields). */
export function toPlainText(html = ''): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
