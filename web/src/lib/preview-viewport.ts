// Viewport presets for the editor preview iframe — lets editors check how a page
// looks at tablet / mobile widths without leaving the editor. An iframe renders
// its content at the iframe element's own width, so capping the width shows the
// real responsive layout. Buttons live in .preview__viewport.
const WIDTHS: Record<string, number> = { desktop: 0, tablet: 768, mobile: 390 };

export function initPreviewViewport(): void {
  const bar = document.querySelector('.preview__viewport');
  const frame = document.getElementById('preview');
  const pane = document.querySelector<HTMLElement>('.pane--preview');
  if (!bar || !frame || !pane) return;

  const set = (mode: string): void => {
    const w = WIDTHS[mode] ?? 0;
    pane.dataset.viewport = mode;
    frame.style.maxWidth = w ? `${w}px` : '';
    bar.querySelectorAll<HTMLElement>('[data-vp]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.vp === mode));
    });
  };

  bar.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest<HTMLElement>('[data-vp]');
    if (btn?.dataset.vp) set(btn.dataset.vp);
  });
  set('desktop');
}
