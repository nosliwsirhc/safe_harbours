// The pages an editor is allowed to manage, in plain language. The admin only
// ever shows `name`; `key`/`slot` are the internal handles and `path` is the
// live URL we preview.
//
// Every page is edited by the SAME composer engine — a page is an ordered list
// of typed blocks. The config below just constrains that engine per page:
//   • palette  — which block kinds an editor may add (drives the "Add…" buttons)
//   • single   — the page is exactly one fixed block of this kind (no add /
//                remove / reorder; e.g. a hero). Mutually exclusive with palette.
//   • numbered — label + number the blocks as ordered steps ("Step 1", "Step 2")
//   • addLabel — override the palette button label for a single-kind palette
export type BlockKind =
  | 'hero'
  | 'heading'
  | 'text'
  | 'imageText'
  | 'cta'
  | 'banner'
  | 'valueCards'
  | 'imageBlock'
  | 'team'
  | 'testimonials'
  | 'logos'
  | 'heroForm'
  | 'steps'
  | 'largeList'
  | 'safety'
  | 'textBlock'
  | 'faqs';

/** Every general-purpose block kind the composer can add (the default palette). */
export const ALL_KINDS: BlockKind[] = [
  'hero',
  'heading',
  'text',
  'textBlock',
  'banner',
  'imageText',
  'imageBlock',
  'valueCards',
  'team',
  'testimonials',
  'steps',
  'largeList',
  'faqs',
  'cta',
  'logos',
];

export interface EditablePage {
  key: string; // matches content_blocks.page
  slot: string; // matches content_blocks.slot
  name: string; // shown to editors
  path: string; // live url to preview
  blurb: string; // short helper line on the pages list
  palette: BlockKind[]; // kinds addable from the palette ([] = none)
  single?: BlockKind; // page is one fixed block of this kind
  numbered?: boolean; // show ordinal labels + numbered preview
  addLabel?: string; // palette button label override (single-kind palettes)
}

export const EDITABLE_PAGES: EditablePage[] = [
  {
    key: 'our-story',
    slot: 'main',
    name: 'Our Story',
    path: '/our-story',
    blurb: 'The whole Our Story page — edit every section, reorder, add or remove.',
    palette: ALL_KINDS,
  },
  {
    key: 'become-a-foster-parent',
    slot: 'main',
    name: 'Become a Foster Parent',
    path: '/become-a-foster-parent',
    blurb: 'The whole Become a Foster Parent page — edit every section, reorder, add or remove.',
    palette: ['heroForm', ...ALL_KINDS, 'safety'],
  },
  {
    key: 'our-impact',
    slot: 'main',
    name: 'Our Impact',
    path: '/our-impact',
    blurb: 'Build the page from sections — add, edit, reorder, publish.',
    palette: ALL_KINDS,
  },
  {
    key: 'privacy-policy',
    slot: 'main',
    name: 'Privacy Policy',
    path: '/privacy-policy',
    blurb: 'The full privacy policy text.',
    palette: ALL_KINDS,
  },
  {
    key: 'terms-conditions',
    slot: 'main',
    name: 'Terms & Conditions',
    path: '/terms-conditions',
    blurb: 'The full terms & conditions text.',
    palette: ALL_KINDS,
  },
  {
    key: 'thank-you-fostering',
    slot: 'main',
    name: 'Thank You (fostering)',
    path: '/thank-you-fostering',
    blurb: 'The confirmation page shown after the foster-parent form.',
    palette: ALL_KINDS,
  },
];

export function findPage(key: string): EditablePage | undefined {
  return EDITABLE_PAGES.find((p) => p.key === key);
}

/** True if (page, slot) is a real editable area — guards the write endpoints. */
export function isEditableArea(key: string, slot: string): boolean {
  const p = findPage(key);
  return p?.slot === slot;
}
