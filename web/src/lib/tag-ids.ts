// Validation for the Google tag IDs an editor sets in /admin/settings.
//
// These values are interpolated into inline <script> blocks in ThemeLayout, so
// the character class below is a security control, not just a UX nicety: a value
// that matches is alphanumeric with a fixed prefix, so it cannot contain quotes,
// semicolons, or angle brackets and therefore cannot break out of the surrounding
// JS string literal (stored XSS). Used both at write time (reject) and at inject
// time (drop), so a bad value can never reach the page even if it predates this.

export const isGa4Id = (v: string): boolean => /^G-[A-Z0-9]{4,20}$/.test(v);
export const isGtmId = (v: string): boolean => /^GTM-[A-Z0-9]{4,15}$/.test(v);

/** The stored GA4 id if it is well-formed, else '' (so nothing unsafe is injected). */
export const safeGa4Id = (v: string | undefined): string => (v && isGa4Id(v) ? v : '');
/** The stored GTM id if it is well-formed, else '' (so nothing unsafe is injected). */
export const safeGtmId = (v: string | undefined): string => (v && isGtmId(v) ? v : '');
