import type { APIRoute } from 'astro';
// Worker environment (bindings, vars, secrets). In Astro 6 the Cloudflare
// adapter removed `Astro.locals.runtime.env`; the supported replacement is
// the `env` export from the `cloudflare:workers` virtual module.
import { env as workerEnv } from 'cloudflare:workers';
import { isValidEmail, isValidPhone } from '../../lib/form';
import { renderEmail } from '../../lib/email';

// On-demand: runs as a Cloudflare Worker route, not prerendered.
export const prerender = false;

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Cloudflare's documented test keys (always pass). Real secret comes from env.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const env = workerEnv as unknown as Record<string, string | undefined>;

  let data: Record<string, string | undefined>;
  try {
    data = (await request.json());
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  const first = (data.first ?? '').trim();
  const last = (data.last ?? '').trim();
  const email = (data.email ?? '').trim();
  const phone = (data.phone ?? '').trim();
  const role = (data.role ?? '').trim() || 'Website contact';
  const message = (data.msg ?? data.message ?? '').trim();
  const token = data.token ?? '';
  const honeypot = (data.hp ?? '').trim();

  // Honeypot (Akismet field in the mirrored markup): bots fill it; humans don't.
  if (honeypot) return json({ ok: true });

  // 1) Require a verified Cloudflare Turnstile token (the form renders a widget;
  //    matches the live site and our sister project's contact endpoint).
  const secret = env.TURNSTILE_SECRET_KEY ?? TEST_SECRET;
  let verified = false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (clientAddress) body.set('remoteip', clientAddress);
    const r = await fetch(TURNSTILE_VERIFY, { method: 'POST', body });
    const result: unknown = await r.json();
    verified = typeof result === 'object' && result !== null && 'success' in result && result.success === true;
  } catch {
    // Verification request failed → leave `verified` false.
  }
  if (!verified) {
    return json({ ok: false, error: 'Verification failed. Please complete the check and try again.' }, 400);
  }

  // 2) Server-side validation — mirror the form's required (*) fields: email + phone.
  const missing: string[] = [];
  if (!isValidEmail(email)) missing.push('a valid email address');
  if (!isValidPhone(phone)) missing.push('a 10-digit phone number');
  if (missing.length) {
    return json({ ok: false, error: `Please include ${missing.join(', ')}.` }, 422);
  }

  // 3) Send via Resend.
  // RESEND_TOKEN is a per-Worker secret set in this project's Cloudflare
  // dashboard — distinct from any sibling site's key.
  const apiKey = env.RESEND_TOKEN ?? env.RESEND_API_KEY;
  const to = env.CONTACT_TO ?? 'info@safeharbours.ca';
  const from = env.CONTACT_FROM ?? 'Safe Harbours <noreply@safeharbours.ca>';
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn('[contact] No RESEND_TOKEN set — skipping send (dev only).');
      return json({ ok: true, dev: true });
    }
    return json({ ok: false, error: 'The contact form is not configured. Please call us.' }, 500);
  }

  const text =
    `New website inquiry\n\n` +
    `Category: ${role}\n` +
    `Name: ${first} ${last}`.trim() + `\n` +
    `Email: ${email || '(not provided)'}\n` +
    `Phone: ${phone || '(not provided)'}\n\n` +
    `${message}\n`;

  const fullName = `${first} ${last}`.trim();
  const isFoster = /foster/i.test(role);
  const html = renderEmail({
    tag: role,
    tagAccent: 'gold',
    title: fullName || 'New inquiry',
    subtitle: isFoster ? 'Interested in becoming a foster parent' : 'Sent a message through the website',
    preheader: `${fullName || 'New inquiry'} — ${email || phone || 'no contact info'}`,
    email: email || undefined,
    phone: phone || undefined,
    message: message || undefined,
  });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email || undefined,
        // Prefix the subject with the category so the team can filter/route
        // (e.g. "[Recruitment: Foster Parents] …").
        subject: `[${role}] New inquiry from ${first} ${last}`.trim(),
        html,
        text,
      }),
    });
    if (!res.ok) {
      return json({ ok: false, error: 'We could not send your message. Please call us instead.' }, 502);
    }
  } catch {
    return json({ ok: false, error: 'We could not reach our mail service. Please call us instead.' }, 502);
  }

  return json({ ok: true });
};
