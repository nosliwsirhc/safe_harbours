// Form utilities shared across the site's forms.

/** NANP local phone pattern once formatted: XXX-XXX-XXXX */
export const PHONE_LOCAL_PATTERN = /^\d{3}-\d{3}-\d{4}$/;

/**
 * Format a phone number as the user types: strip everything but digits, drop a
 * leading country-code "1" (NANP area codes never start with 1), cap at 10
 * digits, then group progressively into XXX-XXX-XXXX.
 */
export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('1')) digits = digits.substring(1);
  digits = digits.substring(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.substring(0, 3) + '-' + digits.substring(3);
  return digits.substring(0, 3) + '-' + digits.substring(3, 6) + '-' + digits.substring(6);
}

/**
 * True if the value contains a complete 10-digit number, in ANY formatting.
 * Validate by digit count, not by a specific separator layout: the client
 * (public/assets/forms.js) formats phones as "(416) 555-1234" while this module's
 * formatPhone uses "416-555-1234", so a layout-specific check here rejected every
 * real submission. Digit-count matches what forms.js itself validates.
 */
export function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length === 10;
}

/**
 * Like {@link formatPhone}, but also maps a caret offset through the reformat
 * so the cursor stays where the user is editing instead of jumping to the end.
 * Returns the formatted value and the adjusted caret position.
 */
export function formatPhoneWithCaret(raw: string, caret: number): { value: string; caret: number } {
  const value = formatPhone(raw);
  // Count digits before the caret in the raw input...
  let digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
  // ...and account for the leading "1" that formatPhone strips.
  if (raw.replace(/\D/g, '').startsWith('1') && digitsBefore > 0) digitsBefore -= 1;
  if (digitsBefore <= 0) return { value, caret: 0 };
  let seen = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] >= '0' && value[i] <= '9') seen += 1;
    if (seen === digitsBefore) return { value, caret: i + 1 };
  }
  return { value, caret: value.length };
}

/**
 * Email validation pattern. This is the WHATWG / HTML5 `<input type="email">`
 * spec pattern - strict enough to catch real typos (missing @, bad domain,
 * spaces) without rejecting valid-but-unusual addresses.
 */
export const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
