// Validation for the marketing-pixel IDs an editor sets in /admin/settings, stored
// as the `marketing_pixels` settings key (JSON). Same security model as
// lib/tag-ids.ts: each ID is matched against a strict per-vendor pattern, so a
// stored value is alphanumeric (or AW-digits) with no quotes, semicolons, or angle
// brackets — it cannot break out of the value it's injected as into the page. This
// is why the manager is PRESET-ONLY: vendor + ID, never a raw <script> field.
// Used at write time (reject) and at inject time (drop), so a bad value can never
// reach the page even if it predates the check.

export type PixelType = 'meta' | 'tiktok' | 'linkedin' | 'google_ads';

export const PIXEL_TYPES: PixelType[] = ['meta', 'tiktok', 'linkedin', 'google_ads'];

// Per-vendor ID shape. Deliberately strict — these double as the XSS control.
const PATTERNS: Record<PixelType, RegExp> = {
  meta: /^\d{8,20}$/, // Meta (Facebook) Pixel ID — numeric
  tiktok: /^[A-Z0-9]{12,32}$/, // TikTok Pixel ID — upper alphanumeric
  linkedin: /^\d{4,12}$/, // LinkedIn Insight partner ID — numeric
  google_ads: /^AW-\d{6,12}$/, // Google Ads conversion ID — AW-#########
};

// UI metadata for the admin settings screen (label + example).
export const PIXEL_DEFS: { type: PixelType; label: string; placeholder: string; hint: string }[] = [
  { type: 'meta', label: 'Meta (Facebook) Pixel ID', placeholder: '123456789012345', hint: 'Events Manager → Data sources. A long number.' },
  { type: 'tiktok', label: 'TikTok Pixel ID', placeholder: 'C4A1B2C3D4E5F6G7H8I9', hint: 'TikTok Ads → Assets → Events. Letters and numbers.' },
  { type: 'linkedin', label: 'LinkedIn Insight partner ID', placeholder: '1234567', hint: 'Campaign Manager → Insight Tag. A short number.' },
  { type: 'google_ads', label: 'Google Ads conversion ID', placeholder: 'AW-123456789', hint: 'Google Ads → Goals → conversion tag. Starts with “AW-”.' },
];

/** True if `id` is a well-formed ID for that pixel type. */
export function isValidPixelId(type: PixelType, id: string): boolean {
  return PATTERNS[type].test(id);
}

export type MarketingPixels = Partial<Record<PixelType, string>>;

/**
 * Validate an incoming pixels object (from the admin form): keep only well-formed,
 * non-empty IDs; drop everything else. Returns the clean object + the list of
 * fields that were rejected (non-empty but malformed), so the UI can flag them.
 */
export function validatePixels(input: unknown): { clean: MarketingPixels; invalid: PixelType[] } {
  const clean: MarketingPixels = {};
  const invalid: PixelType[] = [];
  const obj = (input ?? {}) as Record<string, unknown>;
  for (const type of PIXEL_TYPES) {
    const value = obj[type];
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) continue; // empty = that pixel is off
    if (isValidPixelId(type, raw)) clean[type] = raw;
    else invalid.push(type);
  }
  return { clean, invalid };
}

/** Parse the stored `marketing_pixels` JSON → only well-formed IDs survive (inject-time guard). */
export function safeMarketingPixels(json: string | undefined): MarketingPixels {
  if (!json) return {};
  try {
    return validatePixels(JSON.parse(json)).clean;
  } catch {
    return {};
  }
}
