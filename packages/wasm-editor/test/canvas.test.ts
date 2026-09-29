import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Host, Key, Mod } from './canvas-host.ts';

const WHITE = 0xffffffff; // light theme background, RGBA bytes

const SAMPLE = `# Hello from WebAssembly

Everything here is **drawn by hand-written WASM**: layout, *glyphs*, the caret and the toolbar. Inline \`code\`, <u>underline</u>, ~~strike~~ and a [link](https://webassembly.org).

- Bullets
- A bullet long enough to wrap onto a second line, which should keep its hanging indent

1. First
2. Second

- [x] Done
- [ ] Open

> A quote.

\`\`\`
(call $paint)
\`\`\`

### The end`;

const buttons = (h: Host, y = 22) => h.buttons(y);

test('paints the first frame and presents all of it', () => {
  const h = new Host();
  assert.deepEqual(h.presents[h.presents.length - 1], [0, 0, 800, 600]);
  // the placeholder is drawn in an empty document
  assert.ok(h.ink(40, 60, 300, 80, WHITE) > 100);
  h.load(SAMPLE);
  assert.equal(h.markdown(), SAMPLE);
  h.snapshot('sample-light');
});

test('typing repaints only the line being edited', () => {
  const h = new Host().load('first line\n\nsecond line');
  h.key(Key.End);
  h.presents.length = 0;
  h.type('!');
  assert.equal(h.markdown(), 'first line!\n\nsecond line');
  assert.ok(h.presents.length >= 1 && h.presents.length <= 2, JSON.stringify(h.presents));
  for (const [, , , ph] of h.presents) assert.ok(ph < 80, `presented ${ph}px tall`);
});

test('clicks place the caret; shift-click extends', () => {
  const h = new Host().load('alpha beta gamma');
  const [cx, cy, , ch] = h.caret;
  h.click(cx + 1, cy + ch / 2);
  assert.deepEqual(h.selection, [0, 0]);
  h.click(h.w - 40, cy + ch / 2);
  assert.deepEqual(h.selection, [16, 16]);
  // find "beta" by moving the caret there
  h.key(Key.Home);
  for (let i = 0; i < 6; i++) h.key(Key.Right);
  const bx = h.caret[0];
  h.click(cx + 1, cy + ch / 2);
  h.click(bx + 1, cy + ch / 2, Mod.Shift);
  assert.equal(h.selectedText, 'alpha ');
  // clicking below the text goes to the last line
  h.click(cx + 5, h.h - 10);
  assert.deepEqual(h.selection, [0, 0].map(() => h.x.focus()));
});

test('double click selects a word, triple click the paragraph', () => {
  const h = new Host().load('alpha beta gamma\n\nnext');
  for (let i = 0; i < 7; i++) h.key(Key.Right);
  const [x, y, , ch] = h.caret;
  const t = h.now(1000);
  for (let n = 0; n < 3; n++) {
    h.x.mouse_down(x, y + ch / 2, 0, 0, t + n * 100);
    h.x.mouse_up(x, y + ch / 2, 0, 0, t + n * 100);
    if (n === 1) assert.equal(h.selectedText, 'beta');
  }
  assert.equal(h.selectedText, 'alpha beta gamma');
});

test('dragging selects', () => {
  const h = new Host().load('drag across these words');
  const [x, y, , ch] = h.caret;
  const t = h.now(1000);
  h.x.mouse_down(x, y + ch / 2, 0, 0, t);
  h.x.mouse_move(x + 60, y + ch / 2, 0, t + 20);
  h.x.mouse_move(h.w - 40, y + ch / 2, 0, t + 40);
  h.x.mouse_up(h.w - 40, y + ch / 2, 0, 0, t + 60);
  assert.equal(h.selectedText, 'drag across these words');
});

test('arrow keys move by character, word and line', () => {
  const h = new Host().load('alpha beta gamma');
  h.key(Key.Home);
  h.key(Key.Right);
  h.key(Key.Right);
  assert.deepEqual(h.selection, [2, 2]);
  h.key(Key.Right, Mod.Ctrl);
  assert.deepEqual(h.selection, [5, 5]);
  h.key(Key.Right, Mod.Ctrl);
  assert.deepEqual(h.selection, [10, 10]);
  h.key(Key.Left, Mod.Ctrl | Mod.Shift);
  assert.equal(h.selectedText, 'beta');
  h.key(Key.Left);
  assert.deepEqual(h.selection, [6, 6]);
  h.key(Key.End, Mod.Shift);
  assert.equal(h.selectedText, 'beta gamma');
  h.key(Key.Home, Mod.Ctrl);
  assert.deepEqual(h.selection, [0, 0]);
  h.key('a', Mod.Ctrl);
  assert.equal(h.selectedText, 'alpha beta gamma');
});

test('macOS bindings use Option for words and Cmd for lines', () => {
  const h = new Host(800, 600, 1, 1).load('alpha beta gamma');
  h.key(Key.Right, Mod.Alt);
  assert.deepEqual(h.selection, [5, 5]);
  h.key(Key.Right, Mod.Meta);
  assert.deepEqual(h.selection, [16, 16]);
  h.key(Key.Backspace, Mod.Alt);
  assert.equal(h.markdown(), 'alpha beta ');
  h.key(Key.Backspace, Mod.Meta);
  assert.equal(h.markdown(), '');
  h.type('x');
  h.key('z', Mod.Meta);
  assert.equal(h.markdown(), '');
  // Ctrl+B is not a shortcut on a Mac
  assert.equal(h.key('b', Mod.Ctrl), 0);
});

test('up and down keep the column; wrapped lines have their own ends', () => {
  const words = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor';
  const h = new Host(360, 600).load(`${words}\n\nshort`);
  h.key(Key.Home, Mod.Ctrl);
  const [x0, y0] = h.caret;
  for (let i = 0; i < 4; i++) h.key(Key.Right);
  const col = h.caret[0];
  h.key(Key.Down);
  const [x1, y1] = h.caret;
  assert.ok(y1 > y0, 'moved to the next visual line');
  assert.ok(Math.abs(x1 - col) < 12, `kept the column (${x1} vs ${col})`);
  const onSecond = h.x.focus();
  assert.ok(onSecond > 4 && onSecond < words.length);
  // End of a wrapped visual line stays on that line
  h.key(Key.Up);
  h.key(Key.End);
  assert.equal(h.caret[1], y0);
  assert.ok(h.caret[0] > x0 + 100);
  // Home from there goes to the start of the same visual line
  h.key(Key.Home);
  assert.deepEqual(h.caret.slice(0, 2), [x0, y0]);
  h.key(Key.Down, Mod.Ctrl);
  h.key(Key.End, Mod.Ctrl);
  assert.equal(h.x.focus(), words.length + 1 + 5);
});

test('keyboard shortcuts', () => {
  const h = new Host().load('make this bold');
  h.key('a', Mod.Ctrl);
  h.key('b', Mod.Ctrl);
  assert.equal(h.markdown(), '**make this bold**');
  h.key('i', Mod.Ctrl);
  h.key('e', Mod.Ctrl);
  h.key('x', Mod.Ctrl | Mod.Shift);
  h.key('u', Mod.Ctrl);
  // marks nest in a fixed order: link, bold, italic, underline, strike, code
  assert.equal(h.markdown(), '***<u>~~`make this bold`~~</u>***');
  h.key('z', Mod.Ctrl);
  h.key('z', Mod.Ctrl);
  h.key('z', Mod.Ctrl);
  h.key('z', Mod.Ctrl);
  assert.equal(h.markdown(), '**make this bold**');
  h.key('z', Mod.Ctrl | Mod.Shift);
  h.key('y', Mod.Ctrl);
  assert.equal(h.markdown(), '***`make this bold`***');
  h.key('1', Mod.Ctrl | Mod.Alt);
  assert.ok(h.markdown().startsWith('# '));
  h.key('8', Mod.Ctrl | Mod.Shift);
  assert.ok(h.markdown().startsWith('- '));
  // copy, cut and paste are left to the host's clipboard events
  assert.equal(h.key('c', Mod.Ctrl), 0);
  assert.equal(h.key('v', Mod.Ctrl), 0);
  // Tab is the host's outside code blocks, a tab character inside them
  assert.equal(h.key(Key.Tab), 0);
  h.load('```\ncode\n```');
  h.key(Key.Home);
  assert.equal(h.key(Key.Tab), 1);
  assert.equal(h.markdown(), '```\n\tcode\n```');
});

test('typing a Markdown shortcut and pressing Enter', () => {
  const h = new Host();
  h.type('# Title\nbody\n- one\ntwo\n\nafter');
  assert.equal(h.markdown(), '# Title\n\nbody\n\n- one\n- two\n\nafter');
});

test('toolbar buttons', () => {
  const h = new Host().load('some words');
  const b = buttons(h);
  assert.equal(b.length, 17);
  h.key('a', Mod.Ctrl);
  h.click(b[0], 22); // B
  assert.equal(h.markdown(), '**some words**');
  h.click(b[7], 22); // H1
  assert.equal(h.markdown(), '# **some words**');
  h.click(b[15], 22); // Undo
  assert.equal(h.markdown(), '**some words**');
  h.click(b[16], 22); // Redo
  assert.equal(h.markdown(), '# **some words**');
  h.click(b[13], 22); // Todo
  assert.equal(h.markdown(), '- [ ] **some words**');
  // a caret toggles the mark for what is typed next
  h.key(Key.End);
  h.click(b[1], 22); // I
  h.type('!');
  assert.equal(h.markdown(), '- [ ] **some words*!***');
  // hovering repaints only the toolbar
  h.presents.length = 0;
  h.x.mouse_move(b[3], 22, 0, h.now());
  assert.ok(h.presents.every(([, y, , ph]) => y === 0 && ph < 60), JSON.stringify(h.presents));
});

// The palette's light and dark reds and light orange as RGBA bytes.
const RED = 0xff2e22cf; // #cf222e
const DARK_RED = 0xff727bff; // #ff7b72
const ORANGE = 0xff004cbc; // #bc4c00

test('the colour palette colours the selection', () => {
  const h = new Host().load('some words\n\nmore\n\nand more\n\nand more again\n\nthe end');
  const b = buttons(h);
  h.x.set_selection(0, 10);
  assert.equal(h.box(RED), null);
  // the palette opens under the colour button, over the text; only the
  // toolbar and the lines it crosses are repainted
  h.presents.length = 0;
  h.click(b[5], 22);
  assert.ok(h.presents.every(([, y, , ph]) => y + ph < 200), JSON.stringify(h.presents));
  const a = h.box(RED)!;
  assert.ok(a, 'the red A is drawn');
  const line = h.caretAt(0);
  const [tbx, tby, , tbh] = line;
  h.x.set_selection(0, 10);
  assert.ok(a[1] > 45 && a[1] < tby + tbh && a[0] >= b[5] - 30, JSON.stringify([a, line]));
  // hovering a swatch lights it and shows a pointer
  h.x.mouse_move(a[0] + 2, a[1] + 2, 0, h.now());
  assert.equal(h.cursors[h.cursors.length - 1], 2);
  h.click(a[0] + a[2] / 2, a[1] + a[3] / 2);
  assert.equal(h.markdown(), '<span style="color: #cf222e">some words</span>\n\nmore\n\nand more\n\nand more again\n\nthe end');
  // it closed, and the text is red
  assert.equal(h.count(RED, a), 0);
  assert.ok(h.count(RED, [tbx, tby, 100, tbh]) > 10);
  // from the keyboard: the arrows start at the selection's colour
  h.click(b[5], 22);
  h.key(Key.Right);
  h.key(Key.Enter);
  assert.match(h.markdown(), /^<span style="color: #bc4c00">some words<\/span>/);
  assert.equal(h.box(RED), null);
  assert.ok(h.box(ORANGE));
  // Escape closes it; so does a click anywhere else, which still does what it does
  h.click(b[5], 22);
  assert.ok(h.count(RED, a) > 10);
  assert.equal(h.key(Key.Escape), 1);
  assert.equal(h.count(RED, a), 0);
  assert.deepEqual(h.selection, [0, 10]);
  h.click(b[5], 22);
  h.click(tbx + 5, tby + tbh / 2);
  assert.equal(h.count(RED, a), 0);
  assert.equal(h.x.anchor(), h.x.focus());
  // the colour button toggles it
  h.click(b[5], 22);
  h.click(b[5], 22);
  assert.equal(h.count(RED, a), 0);
  // a caret takes the colour for what is typed next
  h.x.set_selection(12, 12);
  h.click(b[5], 22);
  h.click(a[0] + a[2] / 2, a[1] + a[3] / 2);
  h.type('R');
  assert.match(h.markdown(), /\n\nm<span style="color: #cf222e">R<\/span>ore\n/);
  // undo
  h.key('z', Mod.Ctrl);
  h.key('z', Mod.Ctrl);
  assert.match(h.markdown(), /^<span style="color: #cf222e">some words<\/span>\n\nmore\n/);
});

test('text colours have a dark shade', () => {
  const h = new Host(800, 600, 1, 2).load('<span style="color: #cf222e">red</span> text');
  const [x, y, , ch] = h.caretAt(0);
  h.x.set_selection(5, 5);
  h.x.repaint();
  assert.equal(h.box(RED), null);
  assert.ok(h.count(DARK_RED, [x, y, 40, ch]) > 10);
  h.x.set_theme(0);
  assert.equal(h.box(DARK_RED), null);
  assert.ok(h.count(RED, [x, y, 40, ch]) > 10);
});

test('clicking a checkbox toggles the todo', () => {
  const h = new Host().load('- [ ] task');
  const [x, y, , ch] = h.caret;
  h.x.mouse_move(x - 20, y + ch / 2, 0, h.now());
  assert.equal(h.cursors[h.cursors.length - 1], 2);
  h.click(x - 20, y + ch / 2);
  assert.equal(h.markdown(), '- [x] task');
  h.click(x - 20, y + ch / 2);
  assert.equal(h.markdown(), '- [ ] task');
});

test('the link bar edits links', () => {
  const h = new Host().load('see the docs here');
  h.key(Key.Home);
  for (let i = 0; i < 8; i++) h.key(Key.Right);
  h.key(Key.Right, Mod.Ctrl | Mod.Shift);
  assert.equal(h.selectedText, 'docs');
  h.key('k', Mod.Ctrl);
  h.type('example.com/docs');
  h.key(Key.Enter);
  assert.equal(h.markdown(), 'see the [docs](https://example.com/docs) here');
  // reopening shows the URL; Escape leaves it alone
  h.key(Key.Left);
  h.key('k', Mod.Ctrl);
  h.type('junk');
  h.key(Key.Escape);
  assert.equal(h.markdown(), 'see the [docs](https://example.com/docs) here');
  // emails become mailto links; unsafe schemes are refused
  h.key('k', Mod.Ctrl);
  for (let i = 0; i < 40; i++) h.key(Key.Backspace);
  h.type('me@example.com');
  h.key(Key.Enter);
  assert.equal(h.markdown(), 'see the [docs](mailto:me@example.com) here');
  h.key('k', Mod.Ctrl);
  for (let i = 0; i < 40; i++) h.key(Key.Backspace);
  h.type('javascript:alert(1)');
  h.key(Key.Enter); // refused: the bar stays open
  h.key(Key.Escape);
  assert.equal(h.markdown(), 'see the [docs](mailto:me@example.com) here');
  // an empty URL removes the link
  h.key('k', Mod.Ctrl);
  for (let i = 0; i < 40; i++) h.key(Key.Backspace);
  h.key(Key.Enter);
  assert.equal(h.markdown(), 'see the docs here');
});

test('Mod-click opens a link through the host', () => {
  const h = new Host().load('[a link](https://example.com/x) and text');
  const [x, y, , ch] = h.caret;
  h.click(x + 12, y + ch / 2, Mod.Ctrl);
  assert.deepEqual(h.urls, ['https://example.com/x']);
  h.click(x + 12, y + ch / 2); // a plain click just places the caret
  assert.equal(h.urls.length, 1);
});

test('IME composition is drawn at the caret and committed as text', () => {
  const h = new Host().load('abc');
  h.key(Key.End);
  const [x, y, , ch] = h.caret;
  const before = h.ink(x + 3, y, 60, ch, WHITE);
  h.x.ime_preedit(h.put('ni'), h.now());
  assert.ok(h.ink(x + 3, y, 60, ch, WHITE) > before);
  assert.equal(h.markdown(), 'abc');
  h.x.ime_preedit(0, h.now());
  h.x.text_input(h.put('に'), h.now());
  assert.equal(h.markdown(), 'abcに');
});

test('clipboard: copy, cut and paste', () => {
  const h = new Host().load('keep **bold** words');
  h.key('a', Mod.Ctrl);
  assert.equal(h.out(h.x.copy_text()), 'keep bold words');
  assert.equal(h.out(h.x.copy_html()), '<p>keep <strong>bold</strong> words</p>');
  h.x.cut(h.now());
  assert.equal(h.markdown(), '');
  h.x.paste(h.put('# Pasted\n\nwith *style*'), 0, h.now());
  assert.equal(h.markdown(), '# Pasted\n\nwith *style*');
  h.key(Key.Enter);
  h.x.paste(h.put('*plain*'), 1, h.now());
  assert.equal(h.markdown(), '# Pasted\n\nwith *style*\n\n\\*plain\\*');
});

test('scrolling: wheel, page keys, scrollbar and keeping the caret visible', () => {
  const md = Array.from({ length: 80 }, (_, i) => `Paragraph ${i + 1} of a long document.`).join('\n\n');
  const h = new Host(800, 500).load(md);
  assert.equal(h.x.scroll_top(), 0);
  h.x.wheel(0, 300);
  assert.equal(h.x.scroll_top(), 300);
  h.x.wheel(0, -1000);
  assert.equal(h.x.scroll_top(), 0);
  h.key(Key.PageDown);
  assert.ok(h.x.scroll_top() > 300);
  assert.ok(h.x.focus() > 100);
  // Ctrl+End scrolls to the caret
  h.key(Key.End, Mod.Ctrl);
  const [, cy, , ch] = h.caret;
  assert.ok(cy >= 50 && cy + ch <= 500, `caret at ${cy}`);
  // dragging the scrollbar thumb back to the top
  const t = h.now(1000);
  h.x.mouse_down(795, 480, 0, 0, t);
  h.x.mouse_move(795, 0, 0, t + 10);
  h.x.mouse_up(795, 0, 0, 0, t + 20);
  assert.equal(h.x.scroll_top(), 0);
  h.snapshot('long');
});

test('the caret blinks by repainting one line', () => {
  const h = new Host().load('one\n\ntwo\n\nthree');
  const t = h.now();
  h.x.key_down(Key.Right, 0, t);
  const wait = h.x.tick(t);
  assert.ok(wait > 0 && wait <= 530);
  h.presents.length = 0;
  h.x.tick(t + 600);
  assert.equal(h.presents.length, 1);
  assert.ok(h.presents[0][3] < 100, `presented ${h.presents[0][3]}px tall`);
  // no caret without focus, so nothing to tick for
  h.x.set_focus(0, t + 700);
  assert.equal(h.x.tick(t + 800), -1);
});

test('resizing reflows the text', () => {
  const h = new Host(800, 600).load('word '.repeat(40).trim());
  h.key(Key.End);
  const wide = h.caret[1];
  h.x.resize(300, 600, 1);
  assert.deepEqual(h.presents[h.presents.length - 1], [0, 0, 300, 600]);
  assert.ok(h.caret[1] > wide, 'the end moved down as lines got shorter');
});

test('dark theme and the 0x00RRGGBB pixel format', () => {
  const h = new Host(400, 300, 1, 2 | 4).load('dark');
  assert.equal(h.pixel(399, 299), 0x0016181d);
  h.x.set_theme(0);
  assert.equal(h.pixel(399, 299), 0x00ffffff);
});

test('a large document stays fast to type into', () => {
  const md = Array.from({ length: 3000 }, (_, i) => `Paragraph ${i} has **some bold** and a [link](https://x.com/${i % 9}).`).join('\n\n');
  const h = new Host(1200, 900, 2).load(md);
  h.key(Key.Down);
  const start = performance.now();
  for (let i = 0; i < 50; i++) h.type('x');
  const ms = (performance.now() - start) / 50;
  assert.ok(ms < 50, `${ms.toFixed(1)} ms per keystroke`);
});

test('snapshots of every block type', () => {
  const h = new Host(900, 820, 1).load(SAMPLE);
  h.key(Key.Down);
  h.key(Key.End, Mod.Shift);
  h.snapshot('sample-selection');
  const d = new Host(900, 820, 2, 2).load(SAMPLE);
  d.snapshot('sample-dark-2x');
  assert.ok(true);
});

// --- other people's selections (docs/COLLAB.md) ----------------------------

/** 0xRRGGBB as the framebuffer word it paints (RGBA bytes). */
const word = (c: number) => (0xff000000 | ((c & 0xff) << 16) | (c & 0xff00) | ((c >> 16) & 0xff)) >>> 0;
/** The light theme's tint of a remote selection. */
const tint = (c: number) => {
  let out = 0;
  for (let sh = 0; sh < 24; sh += 8) out |= (255 + ((((c >> sh) & 0xff) - 255) * 72 >> 8)) << sh;
  return word(out);
};

test("other people's carets and selections are drawn in their colours", () => {
  const h = new Host().load('first line\n\nsecond line\n\nthird line');
  h.x.set_focus(0, h.now());
  const red = 0xe5484d;
  const blue = 0x0090ff;
  h.remote([[3, 3, red], [12, 18, blue]]);
  const caret = h.box(word(red));
  assert.ok(caret, 'a red caret');
  const [, , w, ht] = caret!;
  assert.ok(w >= 2 && ht >= 12, `caret ${caret}`);
  assert.ok(h.box(tint(blue)), 'a blue tint under the selection');
  assert.ok(h.box(word(blue)), 'a blue caret at its focus');
  // the local selection stays on top of a remote one
  h.x.set_selection(12, 18);
  h.x.refresh();
  assert.equal(h.box(tint(blue)), null);
});

test('moving a remote caret repaints only the lines it left and entered', () => {
  const h = new Host().load(Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\n\n'));
  h.x.set_focus(0, h.now());
  h.remote([[2, 2, 0xe5484d]]);
  h.presents.length = 0;
  h.remote([[10, 10, 0xe5484d]]);
  assert.ok(h.presents.length >= 1 && h.presents.length <= 2, JSON.stringify(h.presents));
  for (const [, , , ph] of h.presents) assert.ok(ph < 120, `presented ${ph}px tall`);
  h.presents.length = 0;
  h.x.refresh();
  assert.equal(h.presents.length, 0, 'nothing changed, nothing presented');
});

test("someone else's edit is laid out without scrolling to the caret", () => {
  const h = new Host(800, 300).load(Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n\n'));
  h.x.set_focus(0, h.now());
  h.x.set_selection(0, 0);
  h.x.wheel(0, 400);
  const top = h.x.scroll_top();
  assert.ok(top > 0);
  const text = 'X'.repeat(30);
  const ptr = h.x.scratch(text.length * 4);
  new Uint32Array(h.x.memory.buffer, ptr, text.length).set(Array.from(text, (c) => c.charCodeAt(0)));
  h.x.apply_insert(20, text.length, -1);
  h.x.refresh();
  assert.equal(h.x.scroll_top(), top);
  assert.match(h.markdown(), /line 2XXXX/);
});
