import { createCanvasEditor } from './canvas.ts';

const mod = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';

const SAMPLE = `# Drawn by WebAssembly

There is no HTML in this editor. **Layout**, *glyphs*, the caret, the selection and the toolbar are painted into a framebuffer by hand-written WASM, and the page copies the rectangles that changed onto a canvas.

## Try it

- Type, select with the mouse or Shift+arrows, double-click a word
- ${mod}-B, I, U, E for code, K for a link
- Start a line with \`# \`, \`- \`, \`1. \`, \`> \` or \`[] \`
- ${mod}-click a link to open it: the [source](https://github.com/tantaman/tantaman.github.io/tree/master/packages/wasm-editor), or the [DOM version](./dom.html), where the browser draws the text

1. Hand-written
2. Instruction by instruction

- [x] Gap buffer
- [ ] World domination

> The same canvas.wasm runs outside the browser too, in a desktop host built on Wasmtime.

\`\`\`
(call $blit (local.get $e) (local.get $x) (local.get $y) (local.get $c))
\`\`\`
`;

createCanvasEditor(document.getElementById('editor')!, { markdown: SAMPLE }).then((editor) => {
  editor.focus();
  (window as unknown as { editor: unknown }).editor = editor;
});
