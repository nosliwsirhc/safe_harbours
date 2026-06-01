/**
 * Safe Harbours article directives.
 *
 * Turns a small set of authoring directives (parsed by remark-directive) into
 * styled HTML that hangs off the editorial classes in global.css. Keeps news
 * posts as plain Markdown - no per-file imports, no MDX - so a `.md` file
 * dropped into src/content/news/ can still "pop".
 *
 * Authoring vocabulary (see web/_drafts/README.md for the full kit):
 *
 *   :::lead
 *   A standout opening paragraph.
 *   :::
 *
 *   :::pullquote{cite="Name, Role"}
 *   A short, punchy line lifted from the piece.
 *   :::
 *
 *   :::feature{by="Source"}
 *   A large centered statement that breaks the column.
 *   :::
 *
 *   :::stats
 *   :::stat{value="97%"}
 *   of investigations end with children staying home
 *   :::
 *   :::stat{value="33.6%"}
 *   fewer foster homes in Ontario since 2020
 *   :::
 *   :::
 *
 *   :::keypoints{title="What the right match gives a child"}
 *   - **Predictable routines** so days feel safe and known.
 *   - **Trauma-informed adults** who don't take behaviour personally.
 *   :::
 *
 *   :::callout{title="Why this matters"}
 *   A highlighted aside that sits apart from the main flow.
 *   :::
 *
 *   ::figure{src="/images/special-needs-group" alt="..." caption="..." widths="640,1024,1440" formats="avif,webp"}
 */

const text = (value) => ({ type: 'text', value });

// An mdast node that renders to a specific HTML tag with classes/attrs.
const el = (tagName, properties, children = []) => ({
  type: 'paragraph', // carrier type; hName below overrides the tag
  data: { hName: tagName, hProperties: properties },
  children,
});

function addClass(node, ...classes) {
  node.data = node.data || {};
  node.data.hName = node.data.hName || 'div';
  node.data.hProperties = node.data.hProperties || {};
  const existing = node.data.hProperties.className || [];
  node.data.hProperties.className = [...existing, ...classes];
}

function buildFigure(attrs) {
  const { src, alt = '', caption, widths, formats, width, height } = attrs;
  if (!src) return null;

  const base = src.replace(/\.(jpg|jpeg|png|webp|avif)$/i, '');
  const widthList = (widths || '').split(',').map((w) => w.trim()).filter(Boolean);
  const formatList = (formats || '').split(',').map((f) => f.trim()).filter(Boolean);

  const srcset = (ext) =>
    widthList.length ? widthList.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ') : `${base}.${ext}`;

  const sources = formatList.map((fmt) =>
    el('source', { type: `image/${fmt}`, srcset: srcset(fmt), sizes: '(max-width: 760px) 100vw, 720px' })
  );

  const img = el('img', {
    src: `${base}.jpg`,
    ...(widthList.length ? { srcset: srcset('jpg'), sizes: '(max-width: 760px) 100vw, 720px' } : {}),
    // width/height reserve space so a lazy figure doesn't shift layout (CLS).
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    alt,
    loading: 'lazy',
    decoding: 'async',
  });

  const picture = el('picture', {}, [...sources, img]);
  const children = [picture];
  if (caption) children.push(el('figcaption', {}, [text(caption)]));

  return el('figure', { className: ['article-figure'] }, children);
}

// A link is "external" if it points off safeharbours.ca. Relative links,
// mailto:, and tel: stay in the same tab; off-site links (e.g. citations)
// open in a new tab, matching the convention used in the .astro pages.
function isExternalLink(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    return new URL(url).hostname.replace(/^www\./, '') !== 'safeharbours.ca';
  } catch {
    return false;
  }
}

export default function remarkArticle() {
  return (tree) => {
    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      node.children = node.children.map((child) => {
        const isDirective =
          child.type === 'containerDirective' ||
          child.type === 'leafDirective' ||
          child.type === 'textDirective';

        if (!isDirective) {
          if (child.type === 'link' && isExternalLink(child.url)) {
            child.data = child.data || {};
            child.data.hProperties = {
              ...(child.data.hProperties || {}),
              target: '_blank',
              rel: 'noopener',
            };
          }
          walk(child);
          return child;
        }

        const attrs = child.attributes || {};

        switch (child.name) {
          case 'lead':
            addClass(child, 'article-lead');
            break;

          case 'pullquote': {
            const fig = { ...child, type: 'paragraph' };
            fig.data = { hName: 'figure', hProperties: { className: ['article-pq'] } };
            const quote = el('blockquote', {}, child.children);
            fig.children = [quote];
            if (attrs.cite) fig.children.push(el('figcaption', {}, [text(attrs.cite)]));
            walk(quote);
            return fig;
          }

          case 'feature': {
            const block = { ...child, type: 'paragraph' };
            block.data = { hName: 'blockquote', hProperties: { className: ['feature-quote'] } };
            // Wrap the text so the band can go full-bleed while the line length
            // stays readable (constrained by .feature-inner in CSS).
            const innerKids = [...child.children];
            if (attrs.by) innerKids.push(el('span', { className: ['by'] }, [text(attrs.by)]));
            block.children = [el('div', { className: ['feature-inner'] }, innerKids)];
            walk(block);
            return block;
          }

          case 'cta': {
            const aside = { ...child, type: 'paragraph' };
            aside.data = { hName: 'aside', hProperties: { className: ['article-cta'] } };
            const inner = [...child.children];
            if (attrs.href && attrs.label) {
              inner.push(el('a', { className: ['btn', 'btn-coral'], href: attrs.href }, [text(attrs.label)]));
            }
            aside.children = inner;
            walk(aside);
            return aside;
          }

          case 'stats':
            addClass(child, 'statband');
            walk(child);
            break;

          case 'sources':
            addClass(child, 'article-sources');
            walk(child);
            break;

          case 'stat': {
            const stat = { ...child, type: 'paragraph' };
            stat.data = { hName: 'div', hProperties: { className: ['stat'] } };
            const value = attrs.value ? [el('b', {}, [text(attrs.value)])] : [];
            // Unwrap a lone paragraph so the label is clean block text (a <p>
            // inside an inline <span> would be invalid HTML).
            const labelKids =
              child.children.length === 1 && child.children[0].type === 'paragraph'
                ? child.children[0].children
                : child.children;
            stat.children = [...value, el('div', { className: ['stat-label'] }, labelKids)];
            return stat;
          }

          case 'keypoints': {
            const wrap = { ...child, type: 'paragraph' };
            wrap.data = { hName: 'section', hProperties: { className: ['keypoints'] } };
            const inner = [];
            if (attrs.title) inner.push(el('h3', { className: ['keypoints-title'] }, [text(attrs.title)]));
            inner.push(...child.children);
            wrap.children = inner;
            walk(wrap);
            return wrap;
          }

          case 'callout': {
            const aside = { ...child, type: 'paragraph' };
            aside.data = { hName: 'aside', hProperties: { className: ['article-callout'] } };
            const inner = [];
            if (attrs.title) inner.push(el('strong', { className: ['callout-title'] }, [text(attrs.title)]));
            inner.push(...child.children);
            aside.children = inner;
            walk(aside);
            return aside;
          }

          case 'figure': {
            const fig = buildFigure(attrs);
            if (fig) return fig;
            break;
          }

          default:
            // Unknown directive: keep its children, drop the wrapper.
            walk(child);
            break;
        }

        walk(child);
        return child;
      });
    };

    walk(tree);
  };
}
