// The pages an editor is allowed to manage, in plain language. The admin only
// ever shows `name`; `key`/`slot` are the internal handles and `path` is the
// live URL we preview. `component` selects which editor form to render.
export interface EditablePage {
  key: string; // matches content_blocks.page
  slot: string; // matches content_blocks.slot
  name: string; // shown to editors
  path: string; // live url to preview
  blurb: string; // short helper line on the pages list
  component: 'hero' | 'zigzag' | 'composer'; // which editor UI to show
}

export const EDITABLE_PAGES: EditablePage[] = [
  {
    key: 'our-story',
    slot: 'hero',
    name: 'Our Story',
    path: '/our-story',
    blurb: 'The hero at the top of the Our Story page.',
    component: 'hero',
  },
  {
    key: 'become-a-foster-parent',
    slot: 'process',
    name: 'Become a Foster Parent',
    path: '/become-a-foster-parent',
    blurb: 'The “How it Works” steps — edit, reorder, add or remove.',
    component: 'zigzag',
  },
  {
    key: 'our-impact',
    slot: 'main',
    name: 'Our Impact',
    path: '/our-impact',
    blurb: 'Build the page from sections — add, edit, reorder, publish.',
    component: 'composer',
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
