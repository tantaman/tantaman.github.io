import type { CollabStatus, Peer } from './collab/client.ts';
import { createCanvasEditor } from './canvas.ts';

const SAMPLE = `# Drawn by WebAssembly

There is no HTML in this editor. **Layout**, *glyphs*, the caret, the selection and the toolbar are all worked out by hand-written WASM. With WebGPU it lists each frame as rectangles and glyphs for the GPU to draw; without, it paints the pixels into a framebuffer and the page copies the rectangles that changed onto a canvas.

## Try it

- Type, select with the mouse or Shift+arrows, double-click a word
- ${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}-B, I, U, E for code, K for a link
- Start a line with \`# \`, \`- \`, \`1. \`, \`> \` or \`[] \`

1. Hand-written
2. Instruction by instruction

- [x] Gap buffer
- [ ] World domination

> The same canvas.wasm runs outside the browser too, in a desktop host built on Wasmtime.

\`\`\`
(call $blit (local.get $e) (local.get $x) (local.get $y) (local.get $c))
\`\`\`
`;

// ?doc=<id> edits document <id> together with everyone else who has it open
// (docs/COLLAB.md); the page's origin serves /api/collab/<id>.
const doc = new URLSearchParams(location.search).get('doc');
const status = document.getElementById('collab')!;

function showCollab(state: string, peers: Peer[]) {
  status.hidden = false;
  status.replaceChildren(`${doc}: ${state}`);
  for (const p of peers) {
    const dot = document.createElement('span');
    dot.className = 'peer';
    dot.style.background = p.color;
    dot.title = p.name;
    status.append(dot, p.name);
  }
}

let state = 'connecting';
let peers: Peer[] = [];
const collab = doc
  ? {
      url: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/collab/${encodeURIComponent(doc)}`,
      onStatus: (s: CollabStatus) => showCollab((state = s), peers),
      onPeers: (p: Peer[]) => showCollab(state, (peers = p)),
      onLost: () => alert('The document changed too much while you were away; your latest edits could not be kept.'),
    }
  : undefined;
if (doc) showCollab(state, peers);

createCanvasEditor(document.getElementById('editor')!, { markdown: SAMPLE, collab }).then((editor) => {
  document.getElementById('renderer')!.textContent = editor.renderer === 'webgpu' ? 'drawn with WebGPU' : 'painted on the CPU';
  editor.focus();
  (window as unknown as { editor: unknown }).editor = editor;
});
