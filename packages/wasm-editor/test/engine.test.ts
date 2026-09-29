import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BlockType, CHECKED, Color, Engine, Mark } from '../src/engine.ts';
import { cssColorIndex } from '../src/html-import.ts';

const bytes = readFileSync(new URL('../src/editor.wasm', import.meta.url));
const module = new WebAssembly.Module(bytes);
const make = () => Engine.load(module);

/** Type one UTF-16 unit at a time, like a keyboard. */
function type(e: Engine, text: string) {
  for (const ch of text) {
    if (ch === '\n') e.insertParagraph();
    else e.insertText(ch);
  }
}

const html = (e: Engine) => e.renderAll().map((b) => b.html);

test('starts as one empty paragraph', async () => {
  const e = await make();
  assert.equal(e.length, 1);
  assert.deepEqual(html(e), ['<p><br></p>']);
  assert.equal(e.getMarkdown(), '');
  assert.equal(e.canUndo, false);
});

test('typing, escaping and plain text export', async () => {
  const e = await make();
  type(e, 'a < b & "c"');
  assert.deepEqual(html(e), ['<p>a &lt; b &amp; &quot;c&quot;</p>']);
  assert.equal(e.getText(), 'a < b & "c"');
  assert.equal(e.anchor, 11);
});

test('typing is undone a word at a time', async () => {
  const e = await make();
  type(e, 'hello big world');
  assert.ok(e.undo());
  assert.equal(e.getText(), 'hello big ');
  assert.ok(e.undo());
  assert.equal(e.getText(), 'hello ');
  assert.ok(e.undo());
  assert.equal(e.getText(), '');
  assert.equal(e.undo(), false);
  assert.ok(e.redo());
  assert.ok(e.redo());
  assert.equal(e.getText(), 'hello big ');
  assert.equal(e.anchor, 10);
  // typing after an undo discards the redo branch
  type(e, 'x');
  assert.equal(e.canRedo, false);
  assert.equal(e.getText(), 'hello big x');
});

test('moving the caret breaks typing coalescing', async () => {
  const e = await make();
  type(e, 'abc');
  e.setSelection(1);
  type(e, 'X');
  assert.equal(e.getText(), 'aXbc');
  e.undo();
  assert.equal(e.getText(), 'abc');
  assert.equal(e.anchor, 1);
});

test('toggle marks on a range and for the next typed text', async () => {
  const e = await make();
  type(e, 'hello world');
  e.setSelection(0, 5);
  e.toggleMark(Mark.Bold);
  assert.deepEqual(html(e), ['<p><strong>hello</strong> world</p>']);
  assert.equal(e.marks, Mark.Bold);
  e.setSelection(0, 11);
  assert.equal(e.marks, 0);
  e.toggleMark(Mark.Bold); // not all bold: bold everything
  assert.deepEqual(html(e), ['<p><strong>hello world</strong></p>']);
  e.toggleMark(Mark.Bold); // all bold: unbold
  assert.deepEqual(html(e), ['<p>hello world</p>']);

  e.setSelection(11);
  e.toggleMark(Mark.Italic);
  assert.equal(e.marks, Mark.Italic);
  type(e, '!!');
  assert.deepEqual(html(e), ['<p>hello world<em>!!</em></p>']);
  e.toggleMark(Mark.Italic);
  type(e, '?');
  assert.deepEqual(html(e), ['<p>hello world<em>!!</em>?</p>']);
});

test('typing inherits marks from the previous character', async () => {
  const e = await make();
  type(e, 'ab');
  e.setSelection(0, 2);
  e.toggleMark(Mark.Code);
  e.setSelection(1);
  type(e, 'x');
  assert.deepEqual(html(e), ['<p><code>axb</code></p>']);
  e.setSelection(0);
  type(e, 'y'); // at block start: from the next character
  assert.deepEqual(html(e), ['<p><code>yaxb</code></p>']);
});

test('Enter splits blocks and leaves headings and empty list items', async () => {
  const e = await make();
  type(e, 'Title');
  e.setBlock(BlockType.Heading1);
  e.insertParagraph();
  type(e, 'body');
  assert.deepEqual(html(e), ['<h1>Title</h1>', '<p>body</p>']);

  e.setBlock(BlockType.Bullet);
  e.insertParagraph();
  type(e, 'two');
  e.insertParagraph();
  assert.deepEqual(html(e), ['<h1>Title</h1>', '<div class="rt-ul">body</div>', '<div class="rt-ul">two</div>', '<div class="rt-ul"><br></div>']);
  e.insertParagraph(); // Enter in an empty item exits the list
  assert.deepEqual(html(e).slice(-1), ['<p><br></p>']);

  e.setSelection(2); // split the heading in the middle: both halves stay headings
  e.insertParagraph();
  assert.deepEqual(html(e).slice(0, 2), ['<h1>Ti</h1>', '<h1>tle</h1>']);
});

test('Enter replaces the selection', async () => {
  const e = await make();
  type(e, 'one two');
  e.setSelection(3, 4);
  e.insertParagraph();
  assert.equal(e.getText(), 'one\ntwo');
  assert.equal(e.anchor, 4);
});

test('Backspace at a block start', async () => {
  const e = await make();
  type(e, 'a\nb');
  e.setBlock(BlockType.Quote);
  e.setSelection(2);
  e.deleteBackward(); // formatted block: becomes a paragraph first
  assert.deepEqual(html(e), ['<p>a</p>', '<p>b</p>']);
  e.deleteBackward(); // then joins
  assert.deepEqual(html(e), ['<p>ab</p>']);
  assert.equal(e.anchor, 1);

  e.reset();
  type(e, 'H\ntext');
  e.setSelection(0);
  e.setBlock(BlockType.Heading2);
  e.setSelection(2);
  e.deleteBackward(); // joining into a heading keeps the heading
  assert.deepEqual(html(e), ['<h2>Htext</h2>']);

  e.reset();
  type(e, '\ntext');
  e.setBlock(BlockType.Heading3);
  e.setBlock(BlockType.Paragraph);
  e.setSelection(0);
  e.setBlock(BlockType.Heading1);
  e.setSelection(1);
  e.deleteBackward(); // an empty previous block just disappears
  assert.deepEqual(html(e), ['<p>text</p>']);

  e.setSelection(0);
  assert.ok(e.deleteBackward()); // at document start: nothing to do
  assert.equal(e.getText(), 'text');
  assert.equal(e.canUndo, true);
});

test('Delete (forward) joins blocks and handles the document end', async () => {
  const e = await make();
  type(e, 'ab\ncd');
  e.setSelection(1);
  e.setBlock(BlockType.Heading1);
  e.setSelection(2);
  e.deleteForward();
  assert.deepEqual(html(e), ['<h1>abcd</h1>']);
  e.setSelection(4);
  e.deleteForward();
  assert.equal(e.getText(), 'abcd');
  e.setSelection(0);
  e.deleteForward();
  assert.equal(e.getText(), 'bcd');
});

test('surrogate pairs are deleted whole', async () => {
  const e = await make();
  e.insertText('a😀b');
  assert.equal(e.length, 5);
  e.setSelection(3);
  e.deleteBackward();
  assert.equal(e.getText(), 'ab');
  e.reset();
  e.insertText('😀x');
  e.setSelection(0);
  e.deleteForward();
  assert.equal(e.getText(), 'x');
});

test('word deletion', async () => {
  const e = await make();
  type(e, 'foo bar-baz  qux');
  e.deleteWordBackward();
  assert.equal(e.getText(), 'foo bar-baz  ');
  e.deleteWordBackward();
  assert.equal(e.getText(), 'foo bar-');
  e.deleteWordBackward();
  assert.equal(e.getText(), 'foo bar');
  e.setSelection(0);
  e.deleteWordForward();
  assert.equal(e.getText(), ' bar');
  e.deleteWordForward();
  assert.equal(e.getText(), '');
});

test('markdown shortcuts while typing', async () => {
  const cases: [string, string][] = [
    ['# ', '<h1><br></h1>'],
    ['## ', '<h2><br></h2>'],
    ['### ', '<h3><br></h3>'],
    ['- ', '<div class="rt-ul"><br></div>'],
    ['* ', '<div class="rt-ul"><br></div>'],
    ['1. ', '<div class="rt-ol"><br></div>'],
    ['> ', '<blockquote><br></blockquote>'],
    ['[] ', '<div class="rt-todo"><br></div>'],
    ['[ ] ', '<div class="rt-todo"><br></div>'],
    ['[x] ', '<div class="rt-todo rt-done"><br></div>'],
    ['``` ', '<pre class="rt-code"><br></pre>'],
    ['#x ', '<p>#x </p>'],
  ];
  for (const [input, expected] of cases) {
    const e = await make();
    type(e, input);
    assert.deepEqual(html(e), [expected], input);
  }
  // undo right after the shortcut brings back the literal text
  const e = await make();
  type(e, '- ');
  e.undo();
  assert.deepEqual(html(e), ['<p>- </p>']);
});

test('set_block toggles back to paragraph and preserves checked todos', async () => {
  const e = await make();
  type(e, 'a\nb\nc');
  e.setSelection(0, 5);
  e.setBlock(BlockType.Todo);
  e.toggleCheck(2);
  assert.deepEqual(html(e), [
    '<div class="rt-todo">a</div>',
    '<div class="rt-todo rt-done">b</div>',
    '<div class="rt-todo">c</div>',
  ]);
  e.setSelection(2);
  assert.equal(e.blockAttrs, BlockType.Todo | CHECKED);
  e.setSelection(0, 5);
  e.setBlock(BlockType.Todo);
  assert.deepEqual(html(e), ['<p>a</p>', '<p>b</p>', '<p>c</p>']);
  e.undo();
  assert.equal(html(e)[1], '<div class="rt-todo rt-done">b</div>');
  // a new todo after Enter starts unchecked
  e.setSelection(3);
  e.insertParagraph();
  assert.equal(html(e)[2], '<div class="rt-todo"><br></div>');
});

test('links', async () => {
  const e = await make();
  type(e, 'see docs here');
  e.setSelection(4, 8);
  assert.ok(e.setLink('https://example.com/?a=1&b="2"'));
  assert.deepEqual(html(e), ['<p>see <a href="https://example.com/?a=1&amp;b=&quot;2&quot;">docs</a> here</p>']);
  assert.equal(e.linkAt(5), 'https://example.com/?a=1&b="2"');
  // typing inside the link extends it, at its end does not
  e.setSelection(6);
  type(e, 'X');
  e.setSelection(9);
  type(e, 'Y');
  assert.deepEqual(html(e), ['<p>see <a href="https://example.com/?a=1&amp;b=&quot;2&quot;">doXcs</a>Y here</p>']);
  // with a caret inside, the whole link is changed or removed
  e.setSelection(5);
  e.setLink('/local');
  assert.equal(e.getMarkdown(), 'see [doXcs](/local)Y here');
  e.setLink(null);
  assert.equal(e.getMarkdown(), 'see doXcsY here');
  // unsafe schemes are refused
  e.setSelection(0, 3);
  assert.equal(e.setLink('javascript:alert(1)'), false);
  assert.equal(e.setLink(' JavaScript:alert(1)'), false);
  assert.equal(e.setLink('data:text/html,x'), false);
  assert.ok(e.setLink('MAILTO:me@example.com'));
  // with a caret outside any link, the URL is inserted as its own text
  e.setSelection(e.length - 1);
  e.setLink('https://a.b');
  assert.equal(e.getMarkdown(), '[see](MAILTO:me@example.com) doXcsY here[https://a.b](https://a.b)');
  // identical URLs share one table entry
  assert.equal(e.internLink('https://a.b'), e.internLink('https://a.b'));
});

test('markdown export', async () => {
  const e = await make();
  type(e, 'bold and both plain');
  e.setSelection(0, 13);
  e.toggleMark(Mark.Bold);
  e.setSelection(9, 13);
  e.toggleMark(Mark.Italic);
  assert.equal(e.getMarkdown(), '**bold and *both*** plain');

  e.reset();
  type(e, 'a b c');
  e.setSelection(0, 2); // "a " -- the trailing space must not be inside the delimiters
  e.toggleMark(Mark.Bold);
  assert.equal(e.getMarkdown(), '**a** b c');

  e.reset();
  type(e, '*not* # _emphasis_ [x] `y` <z> ~w~ \\');
  assert.equal(e.getMarkdown(), '\\*not\\* # \\_emphasis\\_ \\[x\\] \\`y\\` \\<z> \\~w\\~ \\\\');

  e.reset();
  e.insertText('# heading-looking paragraph'); // pasted, so no shortcut fires
  assert.equal(e.getMarkdown(), '\\# heading-looking paragraph');
  e.insertParagraph();
  e.insertText('- not a list');
  assert.equal(e.getMarkdown(), '\\# heading-looking paragraph\n\n\\- not a list');

  e.reset();
  type(e, 'u s c');
  e.setSelection(0, 1);
  e.toggleMark(Mark.Underline);
  e.setSelection(2, 3);
  e.toggleMark(Mark.Strike);
  e.setSelection(4, 5);
  e.toggleMark(Mark.Code);
  assert.equal(e.getMarkdown(), '<u>u</u> ~~s~~ `c`');

  // spaces inside code are part of the code span
  e.setMarkdown('use `# ` or `- ` here');
  assert.equal(e.getMarkdown(), 'use `# ` or `- ` here');
});

const SAMPLE = `# Title

Some **bold**, *italic*, <u>underlined</u>, ~~struck~~ and \`code\` text with a [link](https://example.com/a%20b).

## Lists

- one
- two

1. first
2. second
3. third

- [ ] open
- [x] done

> quoted
>
> second paragraph

\`\`\`
const x = 1;
  indented
\`\`\`

### End`;

test('markdown round trip', async () => {
  const e = await make();
  e.setMarkdown(SAMPLE);
  assert.equal(e.getMarkdown(), SAMPLE);
  assert.equal(e.canUndo, false);
  assert.equal(e.blockCount, 15);
});

test('markdown import details', async () => {
  const e = await make();
  const md = async (src: string) => {
    e.setMarkdown(src);
    return html(e);
  };
  assert.deepEqual(await md('snake_case_name and 2 * 3 * 4'), ['<p>snake_case_name and 2 * 3 * 4</p>']);
  assert.deepEqual(await md('***both*** __strong__ _em_'), [
    '<p><strong><em>both</em></strong> <strong>strong</strong> <em>em</em></p>',
  ]);
  assert.deepEqual(await md('a*b*c **unclosed'), ['<p>a<em>b</em>c **unclosed</p>']);
  assert.deepEqual(await md('line one\nline two\n\nnext'), ['<p>line one line two</p>', '<p>next</p>']);
  assert.deepEqual(await md('`` a ` b `` and `x'), ['<p><code>a ` b</code> and `x</p>']);
  assert.deepEqual(await md('\\*literal\\* \\q'), ['<p>*literal* \\q</p>']);
  // unsafe destinations keep the text but drop the link; odd ones are escaped
  assert.deepEqual(await md('[x](javascript:alert(1)) [y](</a>)'), ['<p>x) <a href="&lt;/a&gt;">y</a></p>']);
  assert.deepEqual(await md('see https://a.com/x, or <https://b.com>.'), [
    '<p>see <a href="https://a.com/x">https://a.com/x</a>, or <a href="https://b.com">https://b.com</a>.</p>',
  ]);
  assert.deepEqual(await md('![alt](/img.png) [**bold** link](/p "title")'), [
    '<p><a href="/img.png">alt</a> <a href="/p"><strong>bold</strong> link</a></p>',
  ]);
  assert.deepEqual(await md('#### deep\n####### seven'), ['<h3>deep</h3>', '<p>####### seven</p>']);
  assert.deepEqual(await md('- a\n  continued\n    - nested\n* star\n+ plus'), [
    '<div class="rt-ul">a continued</div>',
    '<div class="rt-ul">nested</div>',
    '<div class="rt-ul">star</div>',
    '<div class="rt-ul">plus</div>',
  ]);
  assert.deepEqual(await md('para\n---\n***\nafter'), ['<p>para</p>', '<p>after</p>']);
  assert.deepEqual(await md('10) ten\n> > nested quote\nlazy'), [
    '<div class="rt-ol">ten</div>',
    '<blockquote>nested quote lazy</blockquote>',
  ]);
  assert.deepEqual(await md('```\n\n```\r\nafter\r\n'), ['<pre class="rt-code"><br></pre>', '<p>after</p>']);
  assert.deepEqual(await md(''), ['<p><br></p>']);
});

test('pasting markdown and cells into existing text', async () => {
  const e = await make();
  type(e, 'start end');
  e.setSelection(6);
  e.insertMarkdown('**mid**\n\n- item');
  // the first pasted block merges into the paragraph, the last keeps the tail
  assert.deepEqual(html(e), ['<p>start <strong>mid</strong></p>', '<p>itemend</p>']);
  e.undo();
  assert.equal(e.getText(), 'start end');

  // into an empty block, pasted formats win
  e.reset();
  e.insertMarkdown('- a\n- b');
  assert.deepEqual(html(e), ['<div class="rt-ul">a</div>', '<div class="rt-ul">b</div>']);

  // plain text with newlines splits blocks, keeping the block format
  e.reset();
  type(e, '- ');
  e.insertText('x\r\ny');
  assert.deepEqual(html(e), ['<div class="rt-ul">x</div>', '<div class="rt-ul">y</div>']);

  // raw cells: "A", terminator (h2), "B"; last block becomes a quote
  e.reset();
  const cell = (ch: string, attrs = 0) => ch.charCodeAt(0) | (attrs << 16);
  e.insertCells([cell('A', Mark.Bold), cell('\n', BlockType.Heading2), cell('B')], BlockType.Quote);
  assert.deepEqual(html(e), ['<h2><strong>A</strong></h2>', '<blockquote>B</blockquote>']);
});

test('semantic HTML export groups lists, quotes and code', async () => {
  const e = await make();
  e.setMarkdown('- a\n- b\n\n1. c\n\n- [x] d\n\n> e\n>\n> f\n\n```\ng <h>\ni\n```\n\n## j');
  assert.equal(
    e.getHTML(),
    '<ul><li>a</li><li>b</li></ul><ol><li>c</li></ol>' +
      '<ul class="todo"><li><input type="checkbox" checked disabled> d</li></ul>' +
      '<blockquote><p>e</p><p>f</p></blockquote>' +
      '<pre><code>g &lt;h&gt;\ni</code></pre><h2>j</h2>',
  );
  // a partial range exports only the selected text
  e.setMarkdown('one **two** three\n\nfour');
  assert.equal(e.getHTML(5, 11), '<p><strong>wo</strong> thr</p>');
  assert.equal(e.getText(4, 17), 'two three\nfou');
  assert.equal(e.getMarkdown(4, 17), '**two** three\n\nfou');
  assert.equal(e.getText(17, 4), 'two three\nfou');
  assert.equal(e.getText(0, 999), 'one two three\nfour');
});

test('render reports block positions and stable hashes', async () => {
  const e = await make();
  type(e, 'aa\nbbb\ncc');
  const before = e.renderAll();
  assert.deepEqual(before.map((b) => [b.start, b.length]), [[0, 3], [3, 4], [7, 3]]);
  e.setSelection(4);
  type(e, 'X');
  const after = e.renderAll();
  assert.equal(after[0].hash, before[0].hash);
  assert.notEqual(after[1].hash, before[1].hash);
  assert.equal(after[2].hash, before[2].hash);
  assert.equal(after[2].start, 8);
});

test('large documents grow memory', async () => {
  const e = await make();
  const para = 'lorem ipsum dolor sit amet '.repeat(40);
  const md = Array.from({ length: 800 }, (_, i) => `${i + 1}. ${para}`).join('\n');
  const memBefore = e.stats().memoryBytes;
  e.setMarkdown(md);
  assert.equal(e.blockCount, 800);
  assert.ok(e.stats().memoryBytes > memBefore);
  assert.equal(e.getMarkdown(), md.replaceAll(' \n', '\n').trimEnd());
  e.setSelection(0, e.length - 1);
  e.deleteBackward();
  assert.equal(e.length, 1);
  e.undo();
  assert.equal(e.blockCount, 800);
});

test('refuses text beyond capacity', async () => {
  const e = await make();
  const chunk = 'x'.repeat(300_000);
  e.insertText(chunk);
  e.insertText(chunk);
  e.insertText(chunk);
  assert.equal(e.insertText(chunk), false);
  assert.equal(e.length, 900_001);
});

test('undo history drops the oldest steps when full', async () => {
  const e = await make();
  const chunk = 'y'.repeat(200_000);
  // each insert+delete pair logs ~1.6 MB; the log holds 4 MiB
  for (let i = 0; i < 6; i++) {
    e.insertText(chunk);
    e.setSelection(0, e.length - 1);
    e.deleteBackward();
  }
  type(e, 'recent');
  assert.ok(e.stats().undoBytes <= 4 * 1024 * 1024);
  let steps = 0;
  while (e.undo()) steps++;
  assert.ok(steps >= 2 && steps < 13, `steps ${steps}`);
  // undoing everything that is left leaves a consistent document
  const cells = e.cells();
  assert.equal(cells[cells.length - 1] & 0xffff, 10);
  while (e.redo());
  assert.equal(e.getText(), 'recent');
});

// ---------------------------------------------------------------------------
// Randomized: every undo step must land on a state seen before, undoing
// everything returns to the start, redoing everything returns to the end.

function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function checkInvariants(e: Engine) {
  const cells = e.cells();
  assert.equal(cells.length, e.length);
  assert.equal(cells[cells.length - 1] & 0xffff, 10, 'ends with a terminator');
  const blocks = e.renderAll();
  assert.equal(blocks.length, cells.filter((c) => (c & 0xffff) === 10).length);
  assert.equal(blocks.reduce((n, b) => n + b.length, 0), cells.length);
  assert.ok(e.anchor >= 0 && e.anchor < e.length && e.focus >= 0 && e.focus < e.length);
}

test('fuzz: undo/redo replay every edit exactly', async () => {
  for (let seed = 1; seed <= 25; seed++) {
    const e = await make();
    const rand = rng(seed);
    const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    const snapshot = () => Array.from(e.cells()).join(',');
    const seen = new Set([snapshot()]);
    const initial = snapshot();
    for (let step = 0; step < 150; step++) {
      const len = e.length;
      const a = Math.floor(rand() * len);
      const f = rand() < 0.6 ? a : Math.floor(rand() * len);
      e.setSelection(a, f);
      const op = Math.floor(rand() * 14);
      switch (op) {
        case 0: case 1: case 2: {
          const ch = pick(['a', 'b', ' ', 'é', '#', '-', '1', '.', '[', ']', '`']);
          type(e, ch);
          // A space may fire a Markdown shortcut: a second undo step. Step
          // back over it to record the state in between, and check that
          // undo and redo are inverses.
          if (ch === ' ' && e.canUndo) {
            const after = snapshot();
            e.undo();
            seen.add(snapshot());
            e.redo();
            assert.equal(snapshot(), after, `seed ${seed}: undo+redo`);
          }
          break;
        }
        case 3: e.insertText(pick(['word', 'two\nlines', '😀', 'x\ny\nz'])); break;
        case 4: e.insertParagraph(); break;
        case 5: e.deleteBackward(); break;
        case 6: e.deleteForward(); break;
        case 7: pick([() => e.deleteWordBackward(), () => e.deleteWordForward()])(); break;
        case 8:
          e.toggleMark(pick([Mark.Bold, Mark.Italic, Mark.Code, Mark.Bold | Mark.Strike]));
          seen.add(snapshot());
          type(e, 'm');
          break;
        case 9: e.setBlock(Math.floor(rand() * 9) as BlockType); break;
        case 10: e.toggleCheck(a); break;
        case 11: e.setLink(pick(['https://a.com', '/b', null])); break;
        case 12: e.insertMarkdown(pick(['**b** _i_', '- x\n- y', '# h\n\ntext', '> q'])); break;
        case 13: if (rand() < 0.5) e.undo(); else e.redo(); break;
      }
      checkInvariants(e);
      seen.add(snapshot());
    }
    // go to the tip of history, undo everything, then redo everything
    while (e.redo()) checkInvariants(e);
    const tip = snapshot();
    assert.ok(seen.has(tip), `seed ${seed}: redo reached an unseen state`);
    while (e.undo()) {
      checkInvariants(e);
      assert.ok(seen.has(snapshot()), `seed ${seed}: undo reached an unseen state`);
    }
    assert.equal(snapshot(), initial, `seed ${seed}: full undo`);
    while (e.redo()) {
      checkInvariants(e);
      assert.ok(seen.has(snapshot()), `seed ${seed}: redo reached an unseen state`);
    }
    assert.equal(snapshot(), tip, `seed ${seed}: full redo`);
  }
});

// --- collaboration seams (docs/COLLAB.md) ---------------------------------

/** Write cells at OUT for apply_insert / load_cells. */
function putCells(e: Engine, cells: number[]) {
  const ptr = e.wasm.scratch(cells.length * 4);
  new Uint32Array(e.wasm.memory.buffer, ptr, cells.length).set(cells);
  return cells.length;
}
const text = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

test("someone else's edits move the selection and stay out of history", async () => {
  const e = await make();
  type(e, 'abcdef');
  e.clearHistory();
  e.setSelection(2, 4);
  const v = e.wasm.doc_version();
  e.wasm.apply_insert(1, putCells(e, text('XY')), -1);
  assert.equal(e.getText(), 'aXYbcdef');
  assert.deepEqual([e.anchor, e.focus], [4, 6]);
  // an insert right at the caret leaves it before the new text
  e.setSelection(4);
  e.wasm.apply_insert(4, putCells(e, text('Z')), -1);
  assert.equal(e.anchor, 4);
  e.setSelection(3, 7);
  e.wasm.apply_delete(2, 3);
  assert.equal(e.getText(), 'aXcdef');
  assert.deepEqual([e.anchor, e.focus], [2, 4]);
  e.wasm.apply_format(0, 2, Mark.Bold << 16, Mark.Bold << 16);
  assert.equal(e.cells()[0] >>> 16, Mark.Bold);
  assert.notEqual(e.wasm.doc_version(), v);
  assert.equal(e.canUndo, false);
  assert.equal(e.wasm.undo_bytes(), 0);
});

test('the final terminator is never deleted and nothing goes after it', async () => {
  const e = await make();
  type(e, 'ab');
  e.wasm.apply_delete(0, 99);
  assert.equal(e.length, 1);
  assert.equal(e.cells()[0], 10);
  e.wasm.apply_insert(50, putCells(e, text('q')), -1);
  assert.deepEqual(Array.from(e.cells()), [0x71, 10]);
});

test('collab mode turns undo and redo into requests', async () => {
  const e = await make();
  e.wasm.set_collab(1);
  type(e, 'hi');
  assert.ok(e.wasm.undo_bytes() > 0, 'edits are still logged, for the host to read');
  assert.equal(e.canUndo, false, 'the host says what can be undone');
  e.wasm.set_undo_state(3);
  assert.equal(e.canUndo, true);
  assert.equal(e.canRedo, true);
  assert.equal(e.undo(), true);
  assert.equal(e.getText(), 'hi', 'nothing was undone locally');
  assert.equal(e.wasm.undo_request(), 1);
  assert.equal(e.wasm.undo_request(), 0);
  e.redo();
  assert.equal(e.wasm.undo_request(), 2);
  e.wasm.set_collab(0);
  assert.equal(e.wasm.undo_bytes(), 0);
});

test('journal_lost reports a command too big for the log', async () => {
  const e = await make();
  e.wasm.set_collab(1);
  e.insertText('z'.repeat(600_000));
  e.clearHistory();
  assert.equal(e.wasm.journal_lost(), 0);
  e.setSelection(0, 600_000);
  e.toggleMark(Mark.Bold);
  assert.equal(e.wasm.journal_lost(), 1);
  assert.equal(e.wasm.journal_lost(), 0);
});

test('load_cells replaces the document and keeps the link table', async () => {
  const e = await make();
  const id = e.internLink('https://x.example');
  e.wasm.load_cells(putCells(e, [...text('ab'), 0x63 | (id << 21)]));
  assert.deepEqual(Array.from(e.cells()), [0x61, 0x62, 0x63 | (id << 21), 10]);
  assert.equal(e.linkAt(2), 'https://x.example');
  e.wasm.load_cells(0);
  assert.deepEqual(Array.from(e.cells()), [10]);
});

test('remote selections move with every edit', async () => {
  const e = await make();
  type(e, 'hello world');
  const table = () => Array.from(new Int32Array(e.wasm.memory.buffer, e.wasm.remote_ptr(), 8));
  const view = new Int32Array(e.wasm.memory.buffer, e.wasm.remote_ptr(), 8);
  view.set([6, 11, 0xff0000, 0, 3, 3, 0x00ff00, 0]);
  e.wasm.set_remote_count(2);
  e.setSelection(0);
  e.insertText('>> ');
  assert.deepEqual(table(), [9, 14, 0xff0000, 0, 6, 6, 0x00ff00, 0]);
  // the author of an insert at their own caret moves with it
  e.wasm.apply_insert(6, putCells(e, text('--')), 1);
  assert.deepEqual(table().slice(4, 6), [8, 8]);
  e.wasm.apply_delete(0, 10);
  assert.deepEqual(table().slice(0, 2), [1, 6]);
  e.reset();
  assert.equal(e.wasm.remote_count(), 0);
});

test('read_cells copies a range', async () => {
  const e = await make();
  type(e, 'abc');
  const n = e.wasm.read_cells(1, 10);
  assert.equal(n, 3);
  assert.deepEqual(Array.from(new Uint32Array(e.wasm.memory.buffer, e.wasm.scratch(0), n)), [0x62, 0x63, 10]);
});

test('text colour: a selection, the next typed text, undo', async () => {
  const e = await make();
  type(e, 'one two three');
  e.setSelection(4, 7);
  assert.equal(e.color, Color.Default);
  assert.ok(e.setColor(Color.Red));
  assert.equal(e.color, Color.Red);
  assert.equal(e.getMarkdown(), 'one <span style="color: #cf222e">two</span> three');
  // colour sits beside the marks and nests outside them
  e.toggleMark(Mark.Bold);
  assert.deepEqual(html(e), ['<p>one <span class="rt-c2"><strong>two</strong></span> three</p>']);
  e.setSelection(0, 13);
  assert.equal(e.color, -1, 'mixed');
  assert.equal(e.marks, 0);
  // a caret picks the colour up for what is typed next, and typing continues it
  e.setSelection(7);
  type(e, 'X');
  e.setSelection(e.length - 1);
  e.setColor(Color.Blue);
  assert.equal(e.color, Color.Blue);
  type(e, '!');
  assert.equal(
    e.getMarkdown(),
    'one <span style="color: #cf222e">**twoX**</span> three<span style="color: #0969da">!</span>',
  );
  e.undo();
  e.undo();
  assert.equal(e.getMarkdown(), 'one <span style="color: #cf222e">**two**</span> three');
  e.undo();
  e.undo();
  assert.equal(e.getMarkdown(), 'one two three');
  e.redo();
  assert.equal(e.getMarkdown(), 'one <span style="color: #cf222e">two</span> three');
  // setting the colour it already has is not an edit
  e.setSelection(4, 7);
  const before = e.wasm.undo_bytes();
  e.setColor(Color.Red);
  assert.equal(e.wasm.undo_bytes(), before);
  assert.equal(e.setColor(8 as Color), false);
  // Default takes it off
  e.setColor(Color.Default);
  assert.equal(e.getMarkdown(), 'one two three');
});

test('a coloured link keeps its colour and its URL', async () => {
  const e = await make();
  e.setMarkdown('see <span style="color: #1a7f37">the [docs](https://d.example) now</span>');
  e.setSelection(8, 12);
  assert.equal(e.color, Color.Green);
  assert.equal(e.linkAt(9), 'https://d.example');
  // relinking and unlinking leave the colour alone
  e.setLink('https://e.example');
  assert.equal(e.getMarkdown(), 'see <span style="color: #1a7f37">the [docs](https://e.example) now</span>');
  e.setLink(null);
  assert.equal(e.getMarkdown(), 'see <span style="color: #1a7f37">the docs now</span>');
  // and colouring leaves the link alone
  e.setMarkdown('a [link](/x) b');
  e.setSelection(0, 8);
  e.setColor(Color.Purple);
  assert.equal(e.getMarkdown(), '<span style="color: #8250df">a [link](/x) b</span>');
  assert.equal(
    e.getHTML(),
    '<p><span style="color: #8250df">a <a href="/x">link</a> b</span></p>',
  );
});

test('colours read from Markdown: hex, names, by hue', async () => {
  const e = await make();
  const read = (md: string) => {
    e.setMarkdown(md);
    return e.getMarkdown();
  };
  const span = (hex: string, t: string) => `<span style="color: ${hex}">${t}</span>`;
  assert.equal(read("<span style='color:RED;'>r</span>"), span('#cf222e', 'r'));
  assert.equal(read('<span style="color: grey">g</span>'), span('#6e7781', 'g'));
  assert.equal(read('<span style="color:#00f">b</span>'), span('#0969da', 'b'));
  assert.equal(read('<span style="color: #FFA500">o</span>'), span('#bc4c00', 'o'));
  assert.equal(read('<span style="color: #ffd700">y</span>'), span('#946f00', 'y'));
  assert.equal(read('<span style="color: #800080">p</span>'), span('#8250df', 'p'));
  assert.equal(read('<span style="color: #00aa00">g</span>'), span('#1a7f37', 'g'));
  // every shade of the palette, light and dark, comes back as itself
  for (const [k, light, dark] of [
    [1, '#6e7781', '#8b949e'], [2, '#cf222e', '#ff7b72'], [3, '#bc4c00', '#ffa657'], [4, '#946f00', '#e3c341'],
    [5, '#1a7f37', '#56d364'], [6, '#0969da', '#79c0ff'], [7, '#8250df', '#d2a8ff'],
  ] as const) {
    assert.equal(read(span(dark, 'x')), span(light, 'x'), `colour ${k}`);
  }
  // near black and near white are the ordinary text colour
  assert.equal(read('<span style="color: #000000">t</span> <span style="color: #fafafa">u</span>'), 't u');
  // anything else stays text, and so does a </span> with nothing open
  assert.equal(read('<span style="color: inherit">x</span>'), '\\<span style="color: inherit">x\\</span>');
  assert.equal(read('<span class="c">x</span>'), '\\<span class="c">x\\</span>');
  // spans hold marks, links and code
  const md = 'a <span style="color: #cf222e">**b** [c](/c) `d`</span> e';
  assert.equal(read(md), md);
  // spaces between two runs of one colour keep it; delimiters still hug text
  e.setMarkdown('x');
  e.setSelection(0, 1);
  e.setColor(Color.Red);
  e.setSelection(1);
  e.setColor(Color.Default);
  type(e, ' y ');
  e.setColor(Color.Red);
  type(e, 'z');
  assert.equal(e.getMarkdown(), '<span style="color: #cf222e">x</span> y <span style="color: #cf222e">z</span>');
});

test('the link table reuses ids nothing refers to any more', async () => {
  const e = await make();
  // far more distinct URLs over time than a cell can index
  for (let i = 0; i < 600; i++) {
    e.setMarkdown(`[a](https://x.example/${i}) [b](https://y.example/${i})`);
    assert.equal(e.linkAt(1), `https://x.example/${i}`, `round ${i}`);
    assert.equal(e.linkAt(5), `https://y.example/${i}`, `round ${i}`);
  }
  // within one document: link, then unlink with no history left to need it
  e.reset();
  type(e, 'w');
  for (let i = 0; i < 400; i++) {
    e.setSelection(0, 1);
    assert.ok(e.setLink(`https://z.example/${i}`), `link ${i}`);
    e.clearHistory();
  }
  assert.equal(e.linkAt(0), 'https://z.example/399');
  assert.ok(e.wasm.link_count() < 256);
  // links still in the undo log are kept: undo brings back the right URL
  e.reset();
  type(e, 'abc');
  const urls: string[] = [];
  for (let i = 0; i < 300; i++) {
    e.setSelection(0, 3);
    urls.push(`https://u.example/${i}`);
    assert.ok(e.setLink(urls[i]), `link ${i}`);
  }
  for (let i = 298; i >= 250; i--) {
    e.undo();
    assert.equal(e.linkAt(1), urls[i], `undo to ${i}`);
  }
});

test('the link table is full only of links in use', async () => {
  const e = await make();
  // 255 different links in the document fill the table
  e.setMarkdown(Array.from({ length: 255 }, (_, i) => `[${i}](/p${i})`).join(' '));
  assert.equal(e.wasm.link_count(), 255);
  e.setSelection(0, 1);
  assert.equal(e.setLink('/one-more'), false);
  assert.equal(e.linkAt(0), '/p0');
  // ids interned before the document changes are not handed out twice, even
  // when the table has to be collected in between (a host building cells)
  e.setMarkdown('x');
  const ids = Array.from({ length: 255 }, (_, i) => e.internLink(`/q${i}`));
  assert.equal(new Set(ids).size, 255);
  assert.ok(ids.every((id) => id > 0));
  assert.equal(e.internLink('/q-extra'), 0);
  e.setMarkdown('y');
  assert.ok(e.internLink('/q-extra') > 0);
});

test('spaces between runs never leave a delimiter beside them', async () => {
  const e = await make();
  e.setMarkdown('**a [b](/u)**');
  assert.equal(e.getMarkdown(), '**a** [**b**](/u)');
  e.setMarkdown('**Hello <span style="color: #cf222e">colour</span>**');
  assert.equal(e.getMarkdown(), '**Hello** <span style="color: #cf222e">**colour**</span>');
  e.setMarkdown('***a*** *b*');
  assert.equal(e.getMarkdown(), '***a*** *b*');
});

test('fuzz: coloured, linked, marked words survive Markdown', async () => {
  const e = await make();
  for (let seed = 1; seed <= 300; seed++) {
    const rand = rng(seed);
    const n = 1 + Math.floor(rand() * 8);
    // words of letters; each word one set of attrs, spaces between them plain
    const words: { text: string; marks: number; color: number; link: string | null }[] = [];
    for (let i = 0; i < n; i++) {
      words.push({
        text: 'abcdefgh'.slice(0, 1 + Math.floor(rand() * 5)),
        marks: rand() < 0.5 ? 0 : Math.floor(rand() * 16), // bold, italic, underline, strike
        color: rand() < 0.5 ? 0 : Math.floor(rand() * 8),
        link: rand() < 0.3 ? `/l${Math.floor(rand() * 3)}` : null,
      });
    }
    e.reset();
    let pos = 0;
    for (const [i, w] of words.entries()) {
      if (i) {
        e.setSelection(pos);
        e.setColor(Color.Default);
        e.insertText(' ');
        pos++;
      }
      e.insertText(w.text);
      e.setSelection(pos, pos + w.text.length);
      for (const m of [Mark.Bold, Mark.Italic, Mark.Underline, Mark.Strike]) {
        if ((w.marks & m) !== (e.marks & m)) e.toggleMark(m);
      }
      e.setColor(w.color as Color);
      e.setLink(w.link);
      pos += w.text.length;
    }
    const nonSpace = () => Array.from(e.cells()).filter((c) => (c & 0xffff) !== 32);
    const before = nonSpace().map((c) => [c & 0xffff, (c >>> 16) & 31, c >>> 29, e.linkUrl((c >>> 21) & 0xff)]);
    const md = e.getMarkdown();
    e.setMarkdown(md);
    assert.equal(e.getMarkdown(), md, `seed ${seed}: ${md}`);
    const after = nonSpace().map((c) => [c & 0xffff, (c >>> 16) & 31, c >>> 29, e.linkUrl((c >>> 21) & 0xff)]);
    assert.deepEqual(after, before, `seed ${seed}: ${md}`);
  }
});

test('pasted HTML maps colours to the palette as Markdown import does', async () => {
  const e = await make();
  const light = ['', '#6e7781', '#cf222e', '#bc4c00', '#946f00', '#1a7f37', '#0969da', '#8250df'];
  const rand = rng(7);
  for (let i = 0; i < 2000; i++) {
    const hex = `#${Math.floor(rand() * 0x1000000).toString(16).padStart(6, '0')}`;
    e.setMarkdown(`<span style="color: ${hex}">x</span>`);
    const got = /#[0-9a-f]{6}/.exec(e.getMarkdown())?.[0] ?? '';
    assert.equal(light[cssColorIndex(hex)], got, hex);
  }
  assert.equal(cssColorIndex('rgb(207, 34, 46)'), Color.Red);
  assert.equal(cssColorIndex('rgba(0, 0, 0, 1)'), Color.Default);
  assert.equal(cssColorIndex('Purple'), Color.Purple);
  assert.equal(cssColorIndex('inherit'), -1);
});
