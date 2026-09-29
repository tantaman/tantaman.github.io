import './editor.css';
import { BlockType, Color, Mark, createEditor } from './index.ts';

const SAMPLE = `# Hello from WebAssembly

Everything below lives in a **gap buffer** inside linear memory. Select some text and try the toolbar, or use the keyboard: *Mod-B*, *Mod-I*, \`Mod-E\` for code, Mod-K for a [link](https://webassembly.org).

## Markdown shortcuts

Start a line with \`# \`, \`- \`, \`1. \`, \`> \`, \`[] \` or \`\`\`\` \`\`\` \`\`\`\` followed by a space.

- Undo groups typing by word
- Paste HTML or Markdown
- Copy out as HTML and plain text

1. Hand-written
2. Instruction by instruction

- [x] Gap buffer
- [ ] World domination

> Edits are transactions in an undo log that can be walked in both directions.

\`\`\`
(i32.store16 (global.get $op) (local.get $c))
\`\`\`
`;

const toolbar = document.getElementById('toolbar')!;
const colorSelect = toolbar.querySelector<HTMLSelectElement>('select[data-cmd="color"]')!;
async function main() {
  const editor = await createEditor(document.getElementById('editor')!, {
    markdown: SAMPLE,
    placeholder: 'Write something…',
    onStateChange(state) {
      for (const button of toolbar.querySelectorAll<HTMLButtonElement>('button')) {
        const { mark, block, cmd } = button.dataset;
        if (mark) button.setAttribute('aria-pressed', String((state.marks & Number(mark)) !== 0));
        if (block) button.setAttribute('aria-pressed', String(state.block === Number(block)));
        if (cmd === 'link') button.setAttribute('aria-pressed', String(state.link !== null));
        if (cmd === 'undo') button.disabled = !state.canUndo;
        if (cmd === 'redo') button.disabled = !state.canRedo;
      }
      // a mixed selection shows no colour
      colorSelect.value = String(Math.max(0, state.color));
    },
  });
  editor.focus();

  // Keep focus (and the selection) in the editor while clicking the toolbar
  // (a select needs the mousedown to open, and keeps the selection anyway).
  toolbar.addEventListener('mousedown', (e) => {
    if (!(e.target as Element).closest('select')) e.preventDefault();
  });
  colorSelect.addEventListener('change', () => {
    editor.setColor(Number(colorSelect.value) as Color);
    editor.focus();
  });
  toolbar.addEventListener('click', (e) => {
    const button = (e.target as Element).closest('button');
    if (!button) return;
    const { mark, block, cmd } = button.dataset;
    if (mark) editor.toggleMark(Number(mark) as Mark);
    else if (block) editor.setBlock(Number(block) as BlockType);
    else if (cmd === 'undo') editor.undo();
    else if (cmd === 'redo') editor.redo();
    else if (cmd === 'link') {
      const url = prompt('Link URL (empty to remove)', editor.state.link ?? '');
      if (url !== null && !editor.setLink(url.trim() ? url : null)) {
        alert('Only http(s), mailto, tel and relative links are allowed.');
      }
    } else if (cmd === 'theme') {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('theme', next);
      } catch {
        // storage unavailable
      }
    }
  });
}

main().catch((err) => {
  document.getElementById('editor')!.textContent = `Failed to start: ${err}`;
});
