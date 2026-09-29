import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Host, Key } from './canvas-host.ts';

export const MATH_SAMPLE = String.raw`# Math and code

Euler's identity $e^{i\pi} + 1 = 0$ ties five constants together, and $\frac{a}{b}$ makes its line taller. Dollars that are not math stay text: $5 and $10.

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix}^{-1} = \frac{1}{ad - bc} \begin{pmatrix} d & -b \\ -c & a \end{pmatrix}
$$

` + '```ts\n' + String.raw`// the norm of a point
export function norm(p: { x: number; y: number }): number {
  return Math.sqrt(p.x ** 2 + p.y ** 2); /* 2-norm */
}` + '\n```\n\n```python\n' + String.raw`@cache
def fib(n: int) -> int:
    """Fibonacci."""
    return n if n < 2 else fib(n - 1) + fib(n - 2)` + '\n```';

/** Pixels in a rectangle within `tol` (summed over channels) of an RGB colour. */
function near(h: Host, [x0, y0, w, hh]: number[], rgb: number, tol = 60) {
  const r = rgb >> 16, g = (rgb >> 8) & 255, b = rgb & 255;
  let n = 0;
  for (let y = y0; y < y0 + hh; y++)
    for (let x = x0; x < x0 + w; x++) {
      const p = h.pixel(x, y);
      if (Math.abs((p & 255) - r) + Math.abs(((p >> 8) & 255) - g) + Math.abs(((p >> 16) & 255) - b) < tol) n++;
    }
  return n;
}

test('inline formulas are typeset, and the caret opens one to its source', () => {
  const h = new Host(800, 400).load('a $x^2$ b');
  assert.equal(h.markdown(), 'a $x^2$ b');
  // after the formula, the caret is its width past its "$"
  const [xa] = h.caretAt(2);
  const [xb] = h.caretAt(7);
  assert.ok(xb - xa > 8 && xb - xa < 30, `formula ${xb - xa}px wide`);
  // with the caret inside, the source is laid out instead (as code)
  const [xs] = h.caretAt(6);
  assert.ok(xs - xa > 30, `source ${xs - xa}px wide`);
  h.type('+1');
  assert.equal(h.markdown(), 'a $x^2+1$ b');
  const [xo] = h.caret;
  // stepping out closes it again: after its "$", the caret is left of
  // where the source's closing "$" began
  h.key(Key.Right);
  assert.deepEqual(h.selection, [9, 9]);
  assert.ok(h.caret[0] < xo, `${h.caret[0]} vs ${xo}`);
  h.snapshot('math-inline');
});

test('dollars that are not math stay text', () => {
  const h = new Host(800, 400).load('costs $5 and $10');
  const xs = [0, 6, 7, 8].map((p) => h.caretAt(p)[0]);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], JSON.stringify(xs));
  assert.equal(h.markdown(), 'costs $5 and $10');
});

test('a click on a formula puts the caret inside it', () => {
  const h = new Host(800, 400).load('see $\\frac{1}{2}$ here');
  const [x0, y, , ch] = h.caretAt(4);
  const [x1] = h.caretAt(17);
  h.x.set_selection(0, 0);
  h.click((x0 + x1) / 2, y + ch / 2);
  assert.deepEqual(h.selection, [16, 16]);
  // and a click beside it does not
  h.caretAt(0);
  h.click(x1 + 20, y + ch / 2);
  assert.ok(h.x.focus() > 17, `focus ${h.x.focus()}`);
});

test('a formula grows its line', () => {
  const plain = new Host(800, 400).load('one\n\ntwo');
  const tall = new Host(800, 400).load('one $\\dfrac{a}{b}$\n\ntwo');
  const dy = (h: Host) => h.caretAt(h.x.length() - 1)[1] - h.caretAt(0)[1];
  assert.ok(dy(tall) > dy(plain) + 8, `${dy(tall)} vs ${dy(plain)}`);
});

test('equations are typeset, and edited with a preview under their source', () => {
  const h = new Host(800, 600).load('before\n\n$$\n\\frac{a}{b} + \\sqrt{x}\n$$\n\nafter');
  const eqStart = 7;
  // a typeset equation is one line: Down goes from "before" into it...
  h.key(Key.Down);
  assert.ok(h.x.focus() >= eqStart && h.x.focus() <= eqStart + 22, `focus ${h.x.focus()}`);
  const [, ySource] = h.caret;
  // ...which opens it: its TeX, with the typeset preview below
  const preview = h.ink(100, ySource + 40, 600, 40, 0xffffffff);
  assert.ok(preview > 50, `preview ink ${preview}`);
  h.key(Key.End);
  h.type('=1');
  assert.equal(h.markdown(), 'before\n\n$$\n\\frac{a}{b} + \\sqrt{x}=1\n$$\n\nafter');
  // Down skips the preview and leaves the equation
  h.key(Key.Down);
  assert.ok(h.x.focus() > eqStart + 25, `focus ${h.x.focus()}`);
  h.snapshot('math-equation');
});

test('typing an equation and a code block', () => {
  const h = new Host();
  h.type('$$\n\\sum_i x_i\n\n```ts\nlet x = 1\n\nafter');
  assert.equal(h.markdown(), '$$\n\\sum_i x_i\n$$\n\n```ts\nlet x = 1\n```\n\nafter');
  // the toolbar's sum button makes an equation
  h.load('x^2');
  h.key(Key.End);
  h.x.mouse_move(1, 1, 0, h.now());
  let sum = -1;
  for (let x = 560; x < 800 && sum < 0; x += 2) {
    h.x.mouse_move(x, 22, 0, h.now(0));
    if (h.cursors[h.cursors.length - 1] === 2) {
      h.click(x + 8, 22);
      if (h.markdown().startsWith('$$')) sum = x;
      else h.key('z', 2);
    }
  }
  assert.equal(h.markdown(), '$$\nx^2\n$$');
});

test('code is coloured by its language', () => {
  const code = 'const x = 1; // note';
  const h = new Host(800, 300).load('```ts\n' + code + '\n```');
  const [x, y, , ch] = h.caretAt(0);
  h.x.set_focus(0, h.now());
  const line = [x, y, 400, ch];
  assert.ok(near(h, line, 0xcf222e) > 5, 'keyword');
  assert.ok(near(h, line, 0x0550ae) > 3, 'number');
  assert.ok(near(h, line, 0x6e7781) > 5, 'comment');
  // with no language, or one it does not know, code is plain
  for (const md of ['```\n' + code + '\n```', '```nope\n' + code + '\n```']) {
    h.load(md);
    h.x.set_focus(0, h.now());
    assert.equal(near(h, line, 0xcf222e), 0, md);
  }
  // a block comment carries on over the next lines
  h.load('```c\n/* one\ntwo */ int x;\n```');
  h.x.set_focus(0, h.now());
  const [x2, y2, , ch2] = h.caretAt(7);
  h.x.set_focus(0, h.now());
  assert.ok(near(h, [x2, y2, 40, ch2], 0x6e7781) > 5, 'comment on the second line');
  assert.ok(near(h, [x2 + 50, y2, 50, ch2], 0x953800) > 5, 'a type after it');
  h.snapshot('code-colours');
});

test('mistakes in TeX show in the error colour', () => {
  const h = new Host(800, 300).load('see $\\nosuchthing x$');
  h.x.set_focus(0, h.now());
  assert.ok(near(h, [0, 40, 800, 100], 0xcf222e) > 10);
});

test('the typesetter survives anything', () => {
  const h = new Host(300, 200);
  const debug = (s: string) => (h.x as unknown as { math_debug: (n: number, size: number, display: number, x: number, y: number) => number })
    .math_debug(h.put(s), 18, 1, 10, 100);
  for (const s of ['{'.repeat(3000), '}'.repeat(100), '\\frac'.repeat(2000), 'x^'.repeat(2000), '\\left('.repeat(500), '\\right)',
                   '\\begin{pmatrix}'.repeat(200), 'a&'.repeat(3000), '\\\\'.repeat(2000), '\\sqrt['.repeat(300), '\\', '\\text{', '$', '']) {
    debug(s);
  }
  assert.ok(debug('\\frac{1}{2}') > 2);
});

test('a document full of formulas stays fast to type into', () => {
  const md = Array.from({ length: 1500 }, (_, i) => `Paragraph ${i} has $x_{${i}}^2 + \\frac{1}{${i}}$ and $\\alpha_${i % 9}$ inline.`).join('\n\n');
  const h = new Host(1200, 900, 2).load(md);
  h.key(Key.Down);
  const start = performance.now();
  for (let i = 0; i < 30; i++) h.type('x');
  const ms = (performance.now() - start) / 30;
  assert.ok(ms < 50, `${ms.toFixed(1)} ms per keystroke`);
});

test('snapshots of math and code', () => {
  new Host(900, 1100, 1).load(MATH_SAMPLE).snapshot('math-code-light');
  new Host(900, 1100, 2, 2).load(MATH_SAMPLE).snapshot('math-code-dark-2x');
  assert.ok(true);
});
