import type { APIRoute } from 'astro';
import { isAuthed } from '../../../lib/admin';
import { replaceBlocks, type Hero, type ZigRow, type CtaData } from '../../../lib/content';
import { sanitizeRich, toPlainText, sanitizeUrl } from '../../../lib/sanitize';
import { isEditableArea } from '../../../lib/pages';

// Clean each block by type. Every block body is JSON; we parse it and sanitize
// each field at its own level — rich fields → allowlisted HTML, title/label
// fields → plain text, link fields → safe-scheme URLs. (Sanitizing the whole
// JSON string would mangle links and could corrupt the JSON.)
function cleanBlock(kind: string, body: string): string {
  try {
    if (kind === 'hero') {
      const d = JSON.parse(body) as Partial<Hero>;
      return JSON.stringify({ ...d, lead: toPlainText(d.lead), heading: toPlainText(d.heading), intro: sanitizeRich(d.intro) });
    }
    if (kind === 'zigzag' || kind === 'imageText') {
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

// On-demand: save the content blocks for one (page, slot). The admin posts the
// blocks as JSON in their on-screen (drag-ordered) order; positions are derived
// from the array index in replaceBlocks().
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthed(request)) return json({ ok: false, error: 'Unauthorized' }, 401);

  let payload: { page?: string; slot?: string; blocks?: { kind?: string; body?: string }[] };
  try {
    payload = (await request.json());
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const { page, slot, blocks } = payload;
  if (!page || !slot || !Array.isArray(blocks)) {
    return json({ ok: false, error: 'page, slot and blocks[] are required' }, 400);
  }
  if (!isEditableArea(page, slot)) {
    return json({ ok: false, error: 'Unknown page' }, 400);
  }

  // Autosave always writes the DRAFT — never the live site.
  await replaceBlocks(
    page,
    slot,
    blocks.map((b) => {
      const kind = b.kind ?? 'text';
      return { kind, body: cleanBlock(kind, b.body ?? '') };
    }),
    'draft',
  );

  return json({ ok: true, count: blocks.length });
};
