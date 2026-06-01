import type { APIRoute } from 'astro';
import { env as workerEnv } from 'cloudflare:workers';
import { isValidEmail } from '../../lib/form';

// On-demand newsletter signup. Notifies the team via Resend. Protected by the
// newsletter form's Cloudflare Turnstile widget plus a honeypot (`company`).
export const prerender = false;

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TEST_SECRET = '1x0000000000000000000000000000000AA';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const env = workerEnv as unknown as Record<string, string | undefined>;

  let data: Record<string, string> = {};
  try {
    data = (await request.json()) as Record<string, string>;
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  // Honeypot: real users leave this empty.
  if ((data.company ?? '').trim()) return json({ ok: true });

  // Require a verified Cloudflare Turnstile token (the newsletter form renders a widget).
  const secret = env.TURNSTILE_SECRET_KEY ?? TEST_SECRET;
  let verified = false;
  try {
    const body = new URLSearchParams({ secret, response: data.token ?? '' });
    if (clientAddress) body.set('remoteip', clientAddress);
    const r = await fetch(TURNSTILE_VERIFY, { method: 'POST', body });
    verified = ((await r.json()) as { success?: boolean }).success === true;
  } catch {
    verified = false;
  }
  if (!verified) {
    return json({ ok: false, error: 'Verification failed. Please complete the check and try again.' }, 400);
  }

  const name = (data.name ?? '').trim();
  const email = (data.email ?? '').trim();
  if (!isValidEmail(email)) {
    return json({ ok: false, error: 'Please enter a valid email address.' }, 422);
  }

  const apiKey = env.RESEND_TOKEN ?? env.RESEND_API_KEY;
  const to = env.CONTACT_TO ?? 'info@safeharbours.ca';
  const from = env.CONTACT_FROM ?? 'Safe Harbours <noreply@safeharbours.ca>';
  if (!apiKey) {
    if (import.meta.env.DEV) return json({ ok: true, dev: true });
    return json({ ok: false, error: 'Subscriptions are not configured yet. Please email us.' }, 500);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: 'New newsletter subscriber',
        text: `New newsletter signup\n\nName: ${name || '(not provided)'}\nEmail: ${email}\n`,
      }),
    });
    if (!res.ok) return json({ ok: false, error: 'Could not subscribe right now. Please try again.' }, 502);
  } catch {
    return json({ ok: false, error: 'Could not reach our mail service. Please try again.' }, 502);
  }

  return json({ ok: true });
};
