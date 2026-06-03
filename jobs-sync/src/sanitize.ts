// Allowlist HTML sanitizer for the rich-text fields (FullDescription, StandardDuties,
// AdditionalDuties) before they're stored in D1 and rendered on the public board.
// Uses the Workers-native HTMLRewriter (a real streaming parser), not regex:
//   - dangerous elements (script/style/iframe/…) are dropped entirely,
//   - any non-allowlisted tag is unwrapped (content kept, tag removed),
//   - all attributes are stripped except href on <a> (http/https/mailto/relative only),
//   - comments are removed.
// The source is HR-authored, but we sanitize anyway (defense in depth — it's published).

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'a',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption',
]);

const DANGEROUS_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base',
  'form', 'input', 'button', 'textarea', 'select', 'option',
  'svg', 'math', 'noscript', 'template', 'frame', 'frameset', 'applet',
  'title', 'head', 'audio', 'video', 'source', 'track',
]);

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/)/i;

export async function sanitizeHtml(html: string | null): Promise<string | null> {
  if (!html || !html.trim()) return null;

  const rewriter = new HTMLRewriter().on('*', {
    element(el) {
      const tag = el.tagName.toLowerCase();
      if (DANGEROUS_TAGS.has(tag)) { el.remove(); return; }              // drop tag + content
      if (!ALLOWED_TAGS.has(tag)) { el.removeAndKeepContent(); return; } // unwrap

      // Strip every attribute except an explicit allow (href on <a>).
      const names = [...el.attributes].map((a) => a[0]).filter((n): n is string => typeof n === 'string');
      for (const name of names) {
        const lower = name.toLowerCase();
        if (tag === 'a' && lower === 'href') {
          const href = (el.getAttribute(name) ?? '').trim();
          if (!SAFE_HREF.test(href)) el.removeAttribute(name);
        } else {
          el.removeAttribute(name);
        }
      }
      if (tag === 'a') {
        el.setAttribute('rel', 'noopener nofollow');
        el.setAttribute('target', '_blank');
      }
    },
    comments(c) { c.remove(); },
  });

  const out = (await rewriter.transform(new Response(html)).text()).trim();
  return out.length ? out : null;
}
