// Incremental layout (ui-layout.wat): after any sequence of edits, the lines
// must be exactly what laying out the whole document gives; and someone
// else's edit above the view must not move the text in it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Host, Key } from './canvas-host.ts';

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x100000000;
  };
  return { next, int: (n: number) => Math.floor(next() * n), pick: <T>(xs: T[]) => xs[Math.floor(next() * xs.length)] };
}
type Rng = ReturnType<typeof rng>;

const NL = 10;
/** A block terminator: type 0-8, and the checked bit for todos. */
const term = (type: number, checked = 0) => NL | (type << 16) | (checked << 20);

/** Random cells: words, runs of spaces, words too long for a line, block breaks. */
function cells(r: Rng, n: number) {
  const out: number[] = [];
  while (out.length < n) {
    const k = r.int(20);
    if (k === 0) out.push(term(r.int(9), r.int(2)));
    else if (k === 1) for (let i = r.int(4) + 1; i--; ) out.push(r.int(3) ? 32 : 9);
    else {
      const len = k === 2 ? 30 + r.int(90) : 1 + r.int(12);
      const marks = r.int(4) ? 0 : r.int(32);
      for (let i = 0; i < len; i++) {
        const c = r.int(40) ? 97 + r.int(26) : r.pick(['W', 'm', '.', 'é', '—', '语']).charCodeAt(0);
        out.push(c | (marks << 16));
      }
      if (r.int(2)) out.push(32);
    }
  }
  return out.slice(0, n);
}

/** One random change near `at` (anywhere by default), the way the collab client makes other people's. */
function remoteEdit(h: Host, r: Rng, at = -1) {
  const len = h.x.length();
  const p = at < 0 ? r.int(len) : Math.max(0, Math.min(len - 1, at + r.int(200) - 100));
  const big = r.int(30) === 0;
  switch (r.int(6)) {
    case 0:
    case 1:
      h.insertCells(Math.min(p, len - 1), cells(r, big ? 200 + r.int(3000) : 1 + r.int(8)));
      break;
    case 2:
      h.x.apply_delete(p, big ? r.int(2000) : 1 + r.int(6));
      break;
    case 3: {
      // change the format of a block, or of some text
      const q = h.cells().indexOf(NL, p);
      if (r.int(2)) h.x.apply_format(q, 1, 0x1f0000, term(r.int(9), r.int(2)));
      else h.x.apply_format(p, 1 + r.int(40), 0x1f0000, r.int(32) << 16);
      break;
    }
    case 4:
      // join a block to the next
      if (h.cells().indexOf(NL, p) < len - 1) h.x.apply_delete(h.cells().indexOf(NL, p), 1);
      break;
    default:
      h.insertCells(Math.min(p, len - 1), [term(r.int(9))]);
  }
}

/** A local edit through the keyboard. */
function localEdit(h: Host, r: Rng) {
  const len = h.x.length();
  const p = r.int(len);
  h.x.set_selection(p, r.int(4) ? p : Math.min(len - 1, p + r.int(50)));
  switch (r.int(4)) {
    case 0:
      h.type('word ');
      break;
    case 1:
      h.key(Key.Backspace);
      break;
    case 2:
      h.key(Key.Enter);
      break;
    default:
      h.type(String.fromCharCode(97 + r.int(26)));
  }
}

/**
 * The whole document laid out from scratch, in a second editor of the same
 * size with the same selection (the math it is in shows its source).
 */
function fresh(h: Host, w: number, scale: number) {
  const f = new Host(w, 400, scale);
  withLangs(f);
  const c = h.cells();
  new Uint32Array(f.x.memory.buffer, f.x.scratch(c.length * 4), c.length).set(c);
  f.x.load_cells(c.length);
  const [anchor, focus] = h.selection;
  f.x.set_selection(anchor, focus);
  f.x.refresh();
  return f.lines();
}

const seeds = Number(process.env.LAYOUT_SEEDS ?? 40);

test('laying out only what changed gives the same lines as laying out everything', () => {
  for (let seed = 1; seed <= seeds; seed++) {
    const r = rng(seed);
    const w = 160 + r.int(700);
    const scale = [1, 1.5, 2][r.int(3)];
    const h = new Host(w, 400, scale);
    h.insertCells(0, cells(r, 50 + r.int(3000)));
    h.x.refresh();
    for (let step = 0; step < 60; step++) {
      // a batch of edits between frames, as the collab client applies them:
      // one, a few anywhere, or many close together
      const kind = r.int(4);
      const at = kind === 3 ? r.int(h.x.length()) : -1;
      const batch = kind < 2 ? 1 : kind === 2 ? 2 + r.int(4) : 2 + r.int(30);
      for (let i = 0; i < batch; i++) {
        if (kind === 3 || r.int(4)) remoteEdit(h, r, at);
        else localEdit(h, r);
      }
      h.x.refresh();
      assert.deepEqual(h.lines(), fresh(h, w, scale), `seed ${seed} step ${step}`);
    }
  }
});

/** Languages for code blocks, interned in the same order in every editor so their ids agree. */
const LANGS = ['ts', 'c', 'python'];
function withLangs(h: Host) {
  const x = h.x as unknown as { intern_link(n: number): number };
  return LANGS.map((l) => x.intern_link(h.put(l)));
}

/** A paragraph, an equation's line or the first line of one, code in some language, or another block. */
function mathTerm(r: Rng, langs: number[]) {
  const k = r.int(5);
  if (k === 0) return term(0);
  if (k === 1) return term(9, r.int(3) ? 0 : 1);
  if (k === 2) return NL | ((8 | (r.pick([0, ...langs]) << 5)) << 16);
  return term(r.int(8));
}

/** Random cells with inline math, equations and code in several languages. */
function mathCells(r: Rng, n: number, langs: number[]) {
  const out: number[] = [];
  const text = (t: string) => out.push(...Array.from(t, (c) => c.charCodeAt(0)));
  while (out.length < n) {
    const k = r.int(10);
    if (k === 0) out.push(mathTerm(r, langs));
    else if (k === 1) text(r.pick(['$x^2$', '$\\frac{a}{b}$', '$a', 'b$', '\\$', ' $ ', '$\\sqrt{x}$', '$$']));
    else if (k === 2) text(r.pick(['/*', '*/', '"', '#', '//', 'int ', 'const ']));
    else if (k === 3) text(' ');
    else text('abcdefghij'.slice(0, 1 + r.int(9)) + (r.int(2) ? ' ' : ''));
  }
  return out.slice(0, n);
}

test('math and code are laid out again exactly where they changed, and where the caret went', () => {
  for (let seed = 1; seed <= seeds; seed++) {
    const r = rng(seed);
    const w = 200 + r.int(600);
    const scale = [1, 2][r.int(2)];
    const h = new Host(w, 400, scale);
    const langs = withLangs(h);
    h.insertCells(0, mathCells(r, 50 + r.int(1500), langs));
    h.x.refresh();
    for (let step = 0; step < 40; step++) {
      const batch = 1 + r.int(4);
      for (let i = 0; i < batch; i++) {
        const len = h.x.length();
        const p = r.int(len);
        switch (r.int(7)) {
          case 0:
            h.insertCells(p, mathCells(r, 1 + r.int(20), langs));
            break;
          case 1:
            h.x.apply_delete(p, 1 + r.int(8));
            break;
          case 2: {
            // an equation or code block becomes something else, or the other way round
            const q = h.cells().indexOf(NL, p);
            if (q >= 0) h.x.apply_format(q, 1, 0xffff0000, mathTerm(r, langs));
            break;
          }
          case 3:
            // the caret goes somewhere: into or out of math
            h.x.set_selection(p, r.int(3) ? p : Math.min(len - 1, p + r.int(10)));
            break;
          case 4:
            h.x.set_selection(p, p);
            h.type(r.pick(['$', 'x', ' ', '*/', '/*']));
            break;
          case 5:
            h.x.set_selection(p, p);
            h.key(r.pick([Key.Enter, Key.Backspace, Key.Left, Key.Right, Key.Down, Key.Up]));
            break;
          default:
            h.insertCells(p, [mathTerm(r, langs)]);
        }
      }
      h.x.refresh();
      assert.deepEqual(h.lines(), fresh(h, w, scale), `seed ${seed} step ${step}`);
    }
  }
});

test('more separate edits in one frame than there are damage ranges', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const r = rng(seed);
    const h = new Host(500, 400);
    h.insertCells(0, cells(r, 30_000));
    h.x.refresh();
    for (let step = 0; step < 5; step++) {
      for (let i = 0; i < 150; i++) remoteEdit(h, r);
      h.x.refresh();
      assert.deepEqual(h.lines(), fresh(h, 500, 1), `seed ${seed} step ${step}`);
    }
  }
});

test('edits spread over a long document stay exact', () => {
  const r = rng(7);
  const h = new Host(700, 400);
  h.insertCells(0, cells(r, 200_000));
  h.x.refresh();
  for (let step = 0; step < 40; step++) {
    remoteEdit(h, r);
    h.x.refresh();
  }
  assert.deepEqual(h.lines(), fresh(h, 700, 1));
});

/** Plain paragraphs as cells. */
const paragraphs = (texts: string[]) => texts.flatMap((t) => [...Array.from(t, (c) => c.charCodeAt(0)), term(0)]);

function scrolled() {
  const texts = Array.from({ length: 80 }, (_, i) => `Paragraph ${i}, which has a few words in it.`);
  const h = new Host(800, 400).load(texts.join('\n\n'));
  h.x.set_focus(1, h.now());
  h.x.set_selection(0, 0);
  h.x.wheel(0, 1500);
  h.x.refresh();
  return { h, texts };
}

/** Screen y of document position p, without scrolling. */
function screenY(h: Host, p: number) {
  const [a, f] = h.selection;
  h.x.set_selection(p, p);
  h.x.refresh();
  const y = h.caret[1];
  h.x.set_selection(a, f);
  h.x.refresh();
  return y;
}

test("someone else's edit above the view does not move the text in it", () => {
  const { h, texts } = scrolled();
  const top = h.x.scroll_top();
  const mark = h.markdown().split('\n\n').slice(0, 40).join('\n\n').length + 1; // start of paragraph 40
  const y = screenY(h, mark);
  assert.ok(y > 0 && y < 400, `paragraph 40 is in view at ${y}`);
  h.presents.length = 0;
  const added = paragraphs(['New text', 'More new text that someone else wrote']);
  h.insertCells(0, added);
  h.x.refresh();
  assert.ok(h.x.scroll_top() > top, 'the view moved down with the text');
  assert.equal(screenY(h, mark + added.length), y);
  // only the scrollbar changed on screen
  h.presents.length = 0;
  h.insertCells(0, paragraphs(['Yet more']));
  h.x.refresh();
  assert.ok(h.presents.every(([x]) => x >= 780), JSON.stringify(h.presents));
  // and deleting above moves the view back up
  h.x.apply_delete(0, added.length + 'Yet more'.length + 1);
  h.x.refresh();
  assert.equal(h.x.scroll_top(), top);
  assert.equal(screenY(h, mark), y);
  assert.match(h.markdown(), new RegExp(`^${texts[0]}`));
});

test('a deletion from above into the view keeps the text after it in place', () => {
  const { h } = scrolled();
  const md = h.markdown();
  const start = md.split('\n\n').slice(0, 20).join('\n\n').length + 1; // paragraph 20, above the view
  const line = h.lines().lines.find(([s, , y]) => y - h.x.scroll_top() > 100)!;
  const after = line[0];
  const y = screenY(h, after);
  h.x.apply_delete(start, after - start);
  h.x.refresh();
  assert.equal(screenY(h, start), y);
});

test('an edit in view or at the top of the document moves the text below it', () => {
  const { h } = scrolled();
  const top = h.x.scroll_top();
  const first = h.lines().lines.find(([, , y]) => y >= top)![0];
  h.insertCells(first, paragraphs(['Inserted in view']));
  h.x.refresh();
  assert.equal(h.x.scroll_top(), top);
  // at the top of the document there is nothing to keep in place
  const t = new Host(800, 400).load('one\n\ntwo');
  const y = screenY(t, 5);
  t.insertCells(0, paragraphs(['zero']));
  t.x.refresh();
  assert.equal(t.x.scroll_top(), 0);
  assert.ok(screenY(t, 10) > y);
});

test('an edit adding more lines than the pass can hold lays out everything', () => {
  const r = rng(3);
  const h = new Host(200, 400);
  h.insertCells(0, cells(r, 5000));
  h.x.refresh();
  const before = h.lines().lines.length;
  // more new lines in the middle than LSCR (8,192 lines) holds
  h.insertCells(2000, cells(r, 200_000));
  h.x.refresh();
  assert.ok(h.lines().lines.length - before > 10_000, `${h.lines().lines.length - before} lines added`);
  assert.deepEqual(h.lines(), fresh(h, 200, 1));
  h.insertCells(10, cells(r, 20));
  h.x.refresh();
  assert.deepEqual(h.lines(), fresh(h, 200, 1));
});

test('a document past the line limit is laid out up to the limit after every edit', () => {
  const h = new Host(800, 400);
  h.insertCells(0, Array.from({ length: 300_000 }, (_, i) => (i % 2 ? term(0) : 97)));
  h.x.refresh();
  assert.equal(h.lines().lines.length, 131_072);
  h.x.apply_delete(0, 60_000);
  h.x.refresh();
  assert.equal(h.lines().lines.length, 120_001);
  assert.deepEqual(h.lines(), fresh(h, 800, 1));
  h.insertCells(5, [98, 99, term(5)]);
  h.x.refresh();
  assert.deepEqual(h.lines(), fresh(h, 800, 1));
});

test("a flick carries on smoothly through someone else's edit above the view", () => {
  const { h } = scrolled();
  h.touch(400, 380, [[400, 350], [400, 310], [400, 270], [400, 230]], { step: 10 });
  h.x.tick(h.now());
  const before = h.x.scroll_top();
  h.insertCells(0, paragraphs(Array.from({ length: 10 }, (_, i) => `Someone else wrote paragraph ${i}`)));
  h.x.refresh();
  const shifted = h.x.scroll_top() - before;
  assert.ok(shifted > 300, `the view moved ${shifted}px with the text`);
  // the next frame of momentum starts from where the text went, not back where it was
  h.x.tick(h.now());
  const step = h.x.scroll_top() - before - shifted;
  assert.ok(step > 0 && step < 100, `momentum moved ${step}px`);
});

test('a word too long for any line is split to fit, however the line before it ended', () => {
  for (let w = 200; w < 300; w++) {
    const h = new Host(w, 300);
    // a space alone on the first line, then the word split over the next ones
    h.insertCells(0, [32, ...Array(120).fill(109)]);
    h.x.refresh();
    const [space, first, second] = h.lines().lines;
    assert.deepEqual(space.slice(0, 2), [0, 1], `width ${w}`);
    assert.ok(first[1] - first[0] <= second[1] - second[0], `width ${w}: ${first[1] - first[0]} then ${second[1] - second[0]} characters`);
  }
});
