// Lexical-powered rich-text widgets (MIT, no execCommand). Each `.rt` widget gets
// a Lexical editor on its `.rt-editor` surface, seeded from the adjacent hidden
// `.rt-value` input. On user edits, the serialized HTML is written back to that
// hidden input and a bubbling `input` event is dispatched — so the page's
// orchestration script (autosave/preview) treats it like any other field.
// Bridges via the hidden input so the two scripts stay decoupled.
import { createEditor, $getRoot, $getSelection, $isRangeSelection, $insertNodes, FORMAT_TEXT_COMMAND } from 'lexical';
import { registerRichText } from '@lexical/rich-text';
import { LinkNode, $toggleLink } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { mergeRegister } from '@lexical/utils';

function attach(rt: Element) {
  const el = rt as HTMLElement;
  if (el.dataset.rtReady) return;
  el.dataset.rtReady = '1';

  const surface = el.querySelector<HTMLElement>('.rt-editor');
  const value = el.querySelector<HTMLInputElement>('.rt-value');
  const toolbar = el.querySelector<HTMLElement>('.rt-toolbar');
  if (!surface || !value) return;

  const editor = createEditor({
    namespace: 'sh-rich',
    nodes: [LinkNode],
    onError: (e) => { console.error('[rich-text]', e); },
  });
  editor.setRootElement(surface);
  editor.setEditable(true);
  surface.setAttribute('contenteditable', 'true');
  mergeRegister(registerRichText(editor));

  // Mirror edits to the hidden input + fire `input` so the page autosaves/previews.
  const startTracking = () => {
    editor.registerUpdateListener(() => {
      const html = editor.read(() => $generateHtmlFromNodes(editor, null));
      if (value.value === html) return;
      value.value = html;
      value.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  // Seed from the stored HTML, THEN start tracking — so the initial seed can
  // never create a spurious draft just by opening the page.
  const initial = (value.value || '').trim();
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      if (initial) {
        const dom = new DOMParser().parseFromString(initial, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        root.select();
        $insertNodes(nodes);
      }
    },
    { onUpdate: startTracking },
  );

  // Toolbar: Lexical commands instead of execCommand. mousedown + preventDefault
  // keeps the selection in the editor.
  toolbar?.addEventListener('mousedown', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-rt]');
    if (!btn) return;
    e.preventDefault();
    const cmd = btn.dataset.rt;
    if (cmd === 'bold' || cmd === 'italic') {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, cmd);
    } else if (cmd === 'link') {
      const url = prompt('Link address (https://…)');
      if (url !== null) {
        editor.update(() => {
          const sel = $getSelection();
          if ($isRangeSelection(sel)) $toggleLink(url.trim() || null);
        });
      }
    }
    editor.focus();
  });
}

export function initRichText() {
  document.querySelectorAll('.rt').forEach(attach);
  // Wire widgets added later (e.g. a new zig-zag step).
  const root = document.querySelector('.pane--edit') ?? document.body;
  new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches('.rt')) attach(node);
        node.querySelectorAll('.rt').forEach(attach);
      }
    }
  }).observe(root, { childList: true, subtree: true });
}
