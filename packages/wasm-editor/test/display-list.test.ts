import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Host, Key, Mod } from './canvas-host.ts';

// Init flag 8: the module lists primitives for the GPU instead of painting.
const LIST = 8;

const SAMPLE = `# Display list

Text with **bold**, *italic*, \`code\`, <u>underline</u>, ~~strike~~ and a [link](https://webassembly.org). <span style="color: #cf222e">Red</span>, <span style="color: #0969da">a blue [link](/b)</span>.

- A bullet long enough to wrap onto a second line, which keeps its hanging indent
1. Numbered

- [x] Done
- [ ] Open

> A quote.

\`\`\`
(call $paint)
\`\`\``;

/** The largest difference in any colour channel between two RGBA frames. */
function maxDiff(a: Uint8Array, b: Uint8Array) {
  let max = 0;
  for (let i = 0; i < a.length; i++) if ((i & 3) !== 3) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
}

function both(w: number, h: number, scale: number, flags: number, act: (h: Host) => void) {
  return [new Host(w, h, scale, flags), new Host(w, h, scale, flags | LIST)].map((host) => {
    host.load(SAMPLE);
    act(host);
    return host;
  });
}

test('the display list draws what the framebuffer shows', () => {
  const cases: [string, number, number, number, number, (h: Host) => void][] = [
    ['light, caret', 800, 700, 1, 0, () => {}],
    ['dark 2x, selection', 800, 700, 2, 2, (h) => {
      h.key(Key.Down);
      h.key(Key.End, Mod.Shift);
    }],
    ['1.5x, scrolled', 600, 400, 1.5, 0, (h) => h.x.wheel(0, 90)],
    ['link bar and toolbar hover', 700, 500, 1, 0, (h) => {
      h.key('k', Mod.Ctrl);
      h.type('example.com');
      h.x.mouse_move(20, 20, 0, h.now());
    }],
    ['IME preedit', 700, 500, 1, 0, (h) => h.x.ime_preedit(h.put('kana'), h.now())],
    ["other people's selections, dark", 700, 500, 1, 2, (h) => h.remote([[5, 5, 0xe5484d], [20, 60, 0x0090ff]])],
    ['touch handles and edit menu, 2x', 700, 600, 2, 0, (h) => {
      // a double tap on a word in the second paragraph
      const [x, y, , ch] = h.caretAt(30);
      const t = h.now(1000);
      for (const dt of [0, 180]) {
        h.x.touch_start(x, y + ch / 2, t + dt);
        h.x.touch_end(x, y + ch / 2, t + dt + 40);
      }
    }],
    ['colour palette, dark', 700, 500, 1, 2, (h) => {
      h.x.set_selection(20, 30);
      h.click(h.buttons()[5], 22);
      h.x.mouse_move(h.buttons()[5] + 40, 70, 0, h.now());
    }],
  ];
  for (const [name, w, h, scale, flags, act] of cases) {
    const [cpu, list] = both(w, h, scale, flags, act);
    assert.ok(list.x.list_count() > 50, name);
    // the GPU blends with rounding where $blend truncates
    const d = maxDiff(cpu.frame(), list.frame());
    assert.ok(d <= 2, `${name}: channels differ by up to ${d}`);
    list.snapshot(`list-${name.replace(/\W+/g, '-')}`);
  }
});

test('with a display list, whole frames are listed only when something changed', () => {
  const md = Array.from({ length: 200 }, (_, i) => `Paragraph ${i + 1} of a long document.`).join('\n\n');
  const h = new Host(5120, 2880, 2, LIST).load(md);
  // no framebuffer: memory stays far below the 59 MB a 5K frame would take
  assert.ok(h.x.memory.buffer.byteLength < 0x3880000 + 8 * 2 ** 20, `${h.x.memory.buffer.byteLength} bytes of memory`);
  const t = h.now(0);
  h.presents.length = 0;
  h.x.mouse_move(1000, 1500, 0, t);
  h.x.mouse_move(1010, 1500, 0, t);
  assert.equal(h.presents.length, 0, 'moving the pointer over text changes nothing');
  h.x.wheel(0, 40);
  assert.deepEqual(h.presents, [[0, 0, 5120, 2880]]);
  assert.ok(h.x.list_count() * 64 < 256 * 1024, `${h.x.list_count()} records`);
  // typing lists one new frame
  h.presents.length = 0;
  h.type('x');
  assert.equal(h.presents.length, 1);
});
