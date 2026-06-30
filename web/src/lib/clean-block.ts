// Per-kind sanitiser for composer blocks, shared by the campaign-pages write
// endpoint. Mirrors the cleaning in src/pages/api/admin/blocks.ts exactly, so a
// block authored on a campaign page is sanitised the same way as one on a fixed
// page (they render through the same BlockRenderer). Every block body is JSON;
// we parse it and sanitise each field at its own level — rich fields →
// allowlisted HTML, title/label fields → plain text, link fields → safe-scheme
// URLs. Sanitising the whole JSON string would mangle links and corrupt the JSON.
//
// NOTE: this duplicates the helper in api/admin/blocks.ts. Once the admin-write
// hardening (PR #14) lands, the two should be consolidated into this module and
// imported by both endpoints.
import { sanitizeRich, toPlainText, sanitizeUrl } from './sanitize';
import type { Hero, ZigRow, CtaData } from './content';

export function cleanBlock(kind: string, body: string): string {
  try {
    if (kind === 'hero') {
      const d = JSON.parse(body) as Partial<Hero>;
      return JSON.stringify({ ...d, lead: toPlainText(d.lead), heading: toPlainText(d.heading), intro: sanitizeRich(d.intro) });
    }
    if (kind === 'imageText') {
      const d = JSON.parse(body) as Partial<ZigRow>;
      return JSON.stringify({ ...d, heading: toPlainText(d.heading), body: sanitizeRich(d.body) });
    }
    if (kind === 'cta') {
      const d = JSON.parse(body) as Partial<CtaData>;
      return JSON.stringify({ ...d, heading: toPlainText(d.heading), body: sanitizeRich(d.body), label: toPlainText(d.label), href: sanitizeUrl(d.href) });
    }
    if (kind === 'text') {
      const d = JSON.parse(body) as { html?: string };
      return JSON.stringify({ html: sanitizeRich(d.html) });
    }
    if (kind === 'heading') {
      const d = JSON.parse(body) as { text?: string };
      return JSON.stringify({ text: toPlainText(d.text) });
    }
  } catch {
    return body;
  }
  return sanitizeRich(body); // unknown kind → treat as raw rich text
}
