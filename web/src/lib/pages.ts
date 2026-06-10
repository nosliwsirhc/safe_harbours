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
export type BlockKind = 'hero' | 'heading' | 'text' | 'imageText' | 'cta';

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
    slot: 'hero',
    name: 'Our Story',
    path: '/our-story',
    blurb: 'The hero at the top of the Our Story page.',
    palette: [],
    single: 'hero',
  },
  {
    key: 'become-a-foster-parent',
    slot: 'process',
    name: 'Become a Foster Parent',
    path: '/become-a-foster-parent',
    blurb: 'The “How it Works” steps — edit, reorder, add or remove.',
    palette: ['imageText'],
    numbered: true,
    addLabel: 'Add step',
  },
  {
    key: 'our-impact',
    slot: 'main',
    name: 'Our Impact',
    path: '/our-impact',
    blurb: 'Build the page from sections — add, edit, reorder, publish.',
    palette: ['hero', 'heading', 'text', 'imageText', 'cta'],
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
