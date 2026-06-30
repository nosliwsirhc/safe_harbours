// Per-form conversion config (event name + thank-you URL), stored as the
// `form_conversions` settings key (JSON), edited in /admin/settings. Read by
// public/assets/forms.js (the dataLayer event, client-side) AND by the contact/
// subscribe API handlers (the thank-you redirect, returned in the success
// response). Lets marketing own conversions in GTM without an engineer.
//
// Every value here is rendered/injected, so it's validated: event names against
// the GA4 rules, thank-you URLs as same-origin paths (reusing the redirect
// validator, NOT sanitizeUrl — same open-redirect reasoning).
import { isSameOriginTarget } from './redirect-target';

export interface FormDef {
  key: string; // the form's data-role (contact) or data-source (subscribe) — the config key
  label: string; // friendly name for the admin UI
  endpoint: string;
  defaultEvent: string; // the event fired when nothing custom is configured
}

// The site's known forms. `key` matches what forms.js reads off the <form> and
// what the API handlers receive as `role` (contact) / `source` (subscribe).
export const FORMS: FormDef[] = [
  { key: 'Website contact', label: 'Contact / message form', endpoint: '/api/contact', defaultEvent: 'generate_lead' },
  { key: 'Recruitment: Foster Parents', label: 'Foster parent enquiry', endpoint: '/api/contact', defaultEvent: 'generate_lead' },
  { key: 'Newsletter (footer)', label: 'Newsletter signup (footer)', endpoint: '/api/subscribe', defaultEvent: 'sign_up' },
  { key: 'Resources sign-up', label: 'Resources newsletter signup', endpoint: '/api/subscribe', defaultEvent: 'sign_up' },
];

const FORM_KEYS = new Set(FORMS.map((f) => f.key));

// GA4 event-name rules: ≤40 chars, alphanumeric + underscore, must start with a
// letter; reserved prefixes are disallowed. (developers.google.com / GA4 help.)
const EVENT_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const RESERVED_PREFIXES = ['ga_', 'google_', 'firebase_', 'gtag'];

export function isValidEventName(v: string): boolean {
  if (!EVENT_RE.test(v)) return false;
  const lower = v.toLowerCase();
  return !RESERVED_PREFIXES.some((p) => lower.startsWith(p));
}

export interface FormConversion {
  event?: string;
  thankYou?: string;
}
export type FormConversions = Record<string, FormConversion>;

/**
 * Validate an incoming conversions object (from the admin form): for each KNOWN
 * form, keep a well-formed event name and/or same-origin thank-you URL; drop the
 * rest. Returns the clean map + the list of "<key>:<field>" that were rejected.
 */
export function validateFormConversions(input: unknown): { clean: FormConversions; invalid: string[] } {
  const clean: FormConversions = {};
  const invalid: string[] = [];
  const obj = (input ?? {}) as Record<string, unknown>;
  for (const key of FORM_KEYS) {
    const entry = (obj[key] ?? {}) as Record<string, unknown>;
    const event = typeof entry.event === 'string' ? entry.event.trim() : '';
    const thankYou = typeof entry.thankYou === 'string' ? entry.thankYou.trim() : '';
    const out: FormConversion = {};
    if (event) {
      if (isValidEventName(event)) out.event = event;
      else invalid.push(`${key}:event`);
    }
    if (thankYou) {
      if (isSameOriginTarget(thankYou)) out.thankYou = thankYou;
      else invalid.push(`${key}:thankYou`);
    }
    if (out.event || out.thankYou) clean[key] = out;
  }
  return { clean, invalid };
}

/** Parse the stored `form_conversions` JSON → only valid entries survive (inject/read-time guard). */
export function safeFormConversions(json: string | undefined): FormConversions {
  if (!json) return {};
  try {
    return validateFormConversions(JSON.parse(json)).clean;
  } catch {
    return {};
  }
}

/** The configured (or default) event name + optional thank-you URL for a form key. */
export function conversionFor(conversions: FormConversions, key: string): { event: string; thankYou: string } {
  const def = FORMS.find((f) => f.key === key);
  const c = conversions[key] ?? {};
  return { event: c.event ?? def?.defaultEvent ?? 'generate_lead', thankYou: c.thankYou ?? '' };
}
