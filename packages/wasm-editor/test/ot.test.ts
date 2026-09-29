import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTR_MASK,
  Builder,
  LINK_MASK,
  LINK_SHIFT,
  LOW_MASK,
  apply,
  linkOf,
  compose,
  decodeOp,
  docSource,
  encodeOp,
  invert,
  lengths,
  split,
  transform,
  transformPosition,
  validate,
  type Doc,
  type Op,
} from '../src/collab/ot.ts';

/** Seeded xorshift, so a failure names its seed. */
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
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(xs: T[]) => xs[Math.floor(next() * xs.length)],
  };
}
type Rng = ReturnType<typeof rng>;

const URLS = ['https://a.example', 'https://b.example', '/c', 'mailto:d@example.com'];
const CHARS = 'abcde \n';

function randomCells(r: Rng, n: number, links: string[]): { cells: number[]; links: string[] } {
  const cells: number[] = [];
  for (let j = 0; j < n; j++) {
    const ch = CHARS.charCodeAt(r.int(CHARS.length));
    let cell = ch | (r.int(32) << 16);
    if (ch !== 10 && r.next() < 0.3) cell |= r.int(8) << 29;
    if (ch !== 10 && r.next() < 0.2) {
      const url = r.pick(URLS);
      let idx = links.indexOf(url) + 1;
      if (!idx) idx = links.push(url);
      cell |= idx << LINK_SHIFT;
    }
    cells.push(cell >>> 0);
  }
  return { cells, links };
}

function randomDoc(r: Rng): Doc {
  const { cells, links } = randomCells(r, r.int(12), []);
  return { cells: [...cells, 10 | (r.int(9) << 16)], links };
}

/** A random operation on a document of `len` cells that keeps the final cell last. */
function randomOp(r: Rng, len: number): Op {
  const b = new Builder();
  let i = 0;
  while (i < len - 1) {
    const roll = r.next();
    const n = 1 + r.int(Math.min(4, len - 1 - i));
    if (roll < 0.3) {
      b.retain(n);
      i += n;
    } else if (roll < 0.5) {
      b.delete(n);
      i += n;
    } else if (roll < 0.75) {
      const { cells, links } = randomCells(r, 1 + r.int(3), []);
      b.insert(cells, links);
    } else {
      const link = r.next() < 0.3;
      const m = ((r.int(32) << 16) | (r.int(8) << 29) | (link ? LINK_MASK : 0)) >>> 0;
      b.format(n, m, ((r.int(32) << 16) | (r.int(8) << 29)) & m, link ? r.pick([...URLS, '']) : undefined);
      i += n;
    }
  }
  if (r.next() < 0.3) {
    const { cells, links } = randomCells(r, 1 + r.int(3), []);
    b.insert(cells, links);
  }
  if (r.next() < 0.3) b.format(1, (r.int(32) << 16) >>> 0, (r.int(32) << 16) >>> 0);
  else b.retain(1);
  return b.done();
}

/** A document as (cell without link, URL) pairs, so link tables don't matter. */
function resolved(doc: Doc): string[] {
  return doc.cells.map((c) => {
    const id = linkOf(c);
    return `${(c & LOW_MASK).toString(16)}:${id ? doc.links[id - 1] : ''}`;
  });
}

const RUNS = 3000;

test('compose(a, b) has the effect of a then b', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    const r = rng(seed);
    const d = randomDoc(r);
    const a = randomOp(r, d.cells.length);
    const mid = apply(d, a);
    const b = randomOp(r, mid.cells.length);
    assert.deepEqual(resolved(apply(d, compose(a, b))), resolved(apply(mid, b)), `seed ${seed}`);
  }
});

test('transform satisfies TP1 in either order', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    const r = rng(seed);
    const d = randomDoc(r);
    const a = randomOp(r, d.cells.length);
    const b = randomOp(r, d.cells.length);
    const left = apply(apply(d, a), transform(b, a, false));
    const right = apply(apply(d, b), transform(a, b, true));
    assert.deepEqual(resolved(left), resolved(right), `seed ${seed}`);
  }
});

test('the later format wins where two touch the same bits', () => {
  const d: Doc = { cells: [0x61, 0x62, 10], links: [] };
  const bold: Op = [new Builder().format(2, 1 << 16, 1 << 16).done()[0], 1];
  const unbold: Op = [new Builder().format(2, 1 << 16, 0).done()[0], 1];
  // bold was sequenced first, unbold second: unbold wins on both paths
  const viaBold = apply(apply(d, bold), transform(unbold, bold, false));
  const viaUnbold = apply(apply(d, unbold), transform(bold, unbold, true));
  assert.deepEqual(viaBold.cells, [0x61, 0x62, 10]);
  assert.deepEqual(viaUnbold.cells, [0x61, 0x62, 10]);
});

test('inserts at the same place keep sequencer order', () => {
  const d: Doc = { cells: [10], links: [] };
  const x: Op = [{ i: [0x78] }, 1];
  const y: Op = [{ i: [0x79] }, 1];
  // x first
  const one = apply(apply(d, x), transform(y, x, false));
  const two = apply(apply(d, y), transform(x, y, true));
  assert.deepEqual(one.cells, [0x78, 0x79, 10]);
  assert.deepEqual(two.cells, [0x78, 0x79, 10]);
});

test('invert undoes an operation', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    const r = rng(seed);
    const d = randomDoc(r);
    const a = randomOp(r, d.cells.length);
    const back = apply(apply(d, a), invert(a, docSource(d)));
    assert.deepEqual(resolved(back), resolved(d), `seed ${seed}`);
  }
});

test('transformPosition follows the cell a position points at', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    const r = rng(seed);
    const d = randomDoc(r);
    const a = randomOp(r, d.cells.length);
    const after = apply(d, a);
    // tag every original cell so it can be found again
    const tagged: Doc = { cells: d.cells.map((_, j) => ((j + 1) << 16) >>> 0), links: [] };
    const plain = a.map((c) =>
      typeof c === 'object' && 'f' in c ? c.f : typeof c === 'object' && 'i' in c ? { i: c.i.map(() => 0) } : c,
    );
    const moved = apply(tagged, plain as Op);
    for (let p = 0; p < d.cells.length; p++) {
      const at = moved.cells.findIndex((c) => c >>> 16 === p + 1);
      if (at < 0) continue; // deleted
      // after inserts at the position when told to move, before them otherwise
      assert.equal(transformPosition(p, a, 1), at, `seed ${seed} pos ${p}`);
      assert.ok(transformPosition(p, a, -1) <= at);
    }
    assert.equal(transformPosition(d.cells.length - 1, a, 1), after.cells.length - 1, `seed ${seed}`);
  }
});

test('split keeps the effect and bounds the first part', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    const r = rng(seed);
    const d = randomDoc(r);
    const a = randomOp(r, d.cells.length);
    const max = r.int(4);
    const [first, rest] = split(a, max);
    const inserted = first.reduce<number>((n, c) => n + (typeof c === 'object' && 'i' in c ? c.i.length : 0), 0);
    if (rest) assert.ok(inserted <= max, `seed ${seed}`);
    const mid = apply(d, first);
    const end = rest ? apply(mid, rest) : mid;
    assert.deepEqual(resolved(end), resolved(apply(d, a)), `seed ${seed}`);
    assert.equal(lengths(first)[0], d.cells.length);
  }
});

test('the wire form round-trips, surrogates and all', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const r = rng(seed);
    const d = randomDoc(r);
    const a = randomOp(r, d.cells.length);
    assert.deepEqual(decodeOp(JSON.parse(JSON.stringify(encodeOp(a)))), a, `seed ${seed}`);
  }
  const lone: Op = [{ i: [0xd800, 0xdc00 | (3 << 16), 0xd83d] }, 1];
  assert.deepEqual(decodeOp(JSON.parse(JSON.stringify(encodeOp(lone)))), lone);
});

test('validate accepts real operations and refuses broken ones', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const r = rng(seed);
    const d = randomDoc(r);
    const a = randomOp(r, d.cells.length);
    assert.ok(validate(JSON.parse(JSON.stringify(a)), d.cells.length), `seed ${seed}`);
  }
  assert.equal(validate([2], 3), null, 'short');
  assert.equal(validate([3, { i: [65] }], 3), null, 'insert after the end');
  assert.equal(validate([2, { d: 1 }], 3), null, 'deletes the final terminator');
  assert.equal(validate([{ d: -1 }, 3], 3), null, 'negative');
  assert.equal(validate('x', 1), null);
  assert.deepEqual(validate([1, 1, 1], 3), [3]);
  const f = validate([{ f: 3, m: 0xffffffff, v: 0xffffffff }], 3);
  assert.deepEqual(f, [{ f: 3, m: (ATTR_MASK | LINK_MASK) >>> 0, v: ATTR_MASK, l: '' }]);
});
