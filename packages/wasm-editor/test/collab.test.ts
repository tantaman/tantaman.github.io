import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CollabClient } from '../src/collab/client.ts';
import type { CollabExports } from '../src/collab/engine-doc.ts';
import { LINK_SHIFT, LOW_MASK, type Doc } from '../src/collab/ot.ts';
import type { ClientMsg, ServerMsg } from '../src/collab/protocol.ts';
import { MemoryStore, Room, Sequencer, newConnState, type Conn, type ConnState } from '../src/collab/server-core.ts';
import { BlockType, Engine, Mark } from '../src/engine.ts';

const module = new WebAssembly.Module(readFileSync(new URL('../src/editor.wasm', import.meta.url)));

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

/** Cells as (cell without link, URL), so link ids don't matter. */
const resolved = (d: Doc) =>
  d.cells.map((c) => `${(c & LOW_MASK).toString(16)}:${c >>> LINK_SHIFT ? d.links[(c >>> LINK_SHIFT) - 1] : ''}`);

/** A sequencer and its clients on a network that delays, interleaves and drops messages. */
class Sim {
  now = 0;
  timers: { at: number; fn: () => void }[] = [];
  readonly store = new MemoryStore();
  readonly seq: Sequencer;
  readonly room: Room;
  readonly peers: Peer[] = [];

  constructor(opts: { window: number; compactEvery: number }) {
    this.seq = new Sequencer(this.store, opts);
    this.room = new Room(this.seq, {
      conns: () => this.peers.filter((p) => p.link).map((p) => p.link!.conn),
      later: (fn, ms) => this.timers.push({ at: this.now + ms, fn }),
    });
  }

  async add(name: string): Promise<Peer> {
    const engine = await Engine.load(module);
    const peer = new Peer(this, engine, name);
    this.peers.push(peer);
    return peer;
  }

  /** Run timers that are due. */
  tick(ms: number) {
    this.now += ms;
    for (;;) {
      const due = this.timers.filter((t) => t.at <= this.now);
      if (!due.length) break;
      this.timers = this.timers.filter((t) => t.at > this.now);
      for (const t of due) t.fn();
    }
  }

  get busy() {
    return this.timers.length > 0 || this.peers.some((p) => p.link && (p.link.up.length || p.link.down.length));
  }

  /** Deliver everything until nothing moves. */
  settle() {
    for (let guard = 0; guard < 100000; guard++) {
      for (const p of this.peers) p.deliverAll();
      if (!this.busy) return;
      this.tick(20);
    }
    throw new Error('did not settle');
  }
}

interface Link {
  conn: Conn;
  up: string[];
  down: string[];
}

class Peer {
  readonly sim: Sim;
  readonly engine: Engine;
  readonly client: CollabClient;
  readonly name: string;
  link: Link | null = null;
  lost = 0;

  constructor(sim: Sim, engine: Engine, name: string) {
    this.sim = sim;
    this.engine = engine;
    this.name = name;
    this.client = new CollabClient(engine.wasm as unknown as CollabExports, {
      clientId: name,
      send: (msg: ClientMsg) => this.link?.up.push(JSON.stringify(msg)),
      onLost: () => this.lost++,
      now: () => sim.now,
      setTimer: (fn, ms) => sim.timers.push({ at: sim.now + ms, fn }),
      clearTimer: () => {},
      maxInsert: 40,
    });
  }

  connect() {
    if (this.link) return;
    let state: ConnState = newConnState(`user-${this.name}`, this.name);
    const link: Link = {
      up: [],
      down: [],
      conn: {
        get state() {
          return state;
        },
        send: (msg: ServerMsg) => link.down.push(JSON.stringify(msg)),
        save: () => {
          state = JSON.parse(JSON.stringify(state));
        },
      },
    };
    this.link = link;
    this.client.open();
  }

  /** The socket drops: anything in flight is lost. */
  disconnect() {
    if (!this.link) return;
    const link = this.link;
    this.link = null;
    this.sim.room.leave(link.conn);
    this.client.close();
  }

  deliverUp() {
    const m = this.link?.up.shift();
    if (m) this.sim.room.message(this.link!.conn, JSON.parse(m));
  }

  deliverDown() {
    const m = this.link?.down.shift();
    if (m) this.client.receive(JSON.parse(m));
  }

  deliverAll() {
    while (this.link && (this.link.up.length || this.link.down.length)) {
      this.deliverUp();
      this.deliverDown();
    }
  }

  /** One random thing a person might do, then let the client see it. */
  act(r: Rng) {
    const e = this.engine;
    const len = e.length;
    const pos = () => r.int(len);
    const roll = r.next();
    if (roll < 0.15) e.setSelection(pos(), r.next() < 0.5 ? undefined : pos());
    else if (roll < 0.45) {
      for (const ch of r.pick(['a', 'bc', 'hello ', 'x y', '\u{1F600}', 'é'])) e.insertText(ch);
    } else if (roll < 0.52) e.insertParagraph();
    else if (roll < 0.62) e.deleteBackward();
    else if (roll < 0.66) e.deleteForward();
    else if (roll < 0.68) e.deleteWordBackward();
    else if (roll < 0.74) {
      e.setSelection(pos(), pos());
      e.toggleMark(r.pick([Mark.Bold, Mark.Italic, Mark.Code, Mark.Strike]));
    } else if (roll < 0.78) e.setBlock(r.pick([BlockType.Heading1, BlockType.Bullet, BlockType.Todo, BlockType.Quote]));
    else if (roll < 0.81) {
      e.setSelection(pos(), pos());
      e.setLink(r.pick(['https://a.example', 'https://b.example', null]));
    } else if (roll < 0.83) e.insertMarkdown(r.pick(['**b** and [l](https://l.example)', '- one\n- two', '# T\n\nx']));
    else if (roll < 0.85) e.toggleCheck(pos());
    else if (roll < 0.93) e.undo();
    else e.redo();
    this.client.afterLocal();
  }
}

async function run(seed: number, steps: number, opts = { window: 1000, compactEvery: 2000 }) {
  const r = rng(seed);
  const sim = new Sim(opts);
  for (const name of ['ann', 'bob', 'cy']) (await sim.add(name)).connect();
  sim.settle();
  for (let step = 0; step < steps; step++) {
    const p = r.pick(sim.peers);
    const roll = r.next();
    if (roll < 0.45) p.act(r);
    else if (roll < 0.7) p.deliverUp();
    else if (roll < 0.9) p.deliverDown();
    else if (roll < 0.97) sim.tick(r.int(40));
    else if (p.link) p.disconnect();
    else p.connect();
  }
  for (const p of sim.peers) p.connect();
  sim.settle();
  if (sim.seq.compactionDue) sim.seq.compact();
  const truth = resolved(sim.seq.current());
  for (const p of sim.peers) {
    assert.equal(p.client.pending, false, `seed ${seed}: ${p.name} still has changes to send`);
    assert.deepEqual(resolved(p.client.doc.doc()), truth, `seed ${seed}: ${p.name} diverged`);
  }
  return sim;
}

test('two editors see each other type', async () => {
  const sim = new Sim({ window: 1000, compactEvery: 2000 });
  const a = await sim.add('a');
  const b = await sim.add('b');
  a.connect();
  b.connect();
  sim.settle();
  a.engine.insertText('hello');
  a.client.afterLocal();
  b.engine.insertText('world ');
  b.client.afterLocal();
  sim.settle();
  // b's text was sequenced second but both inserted at 0: the first in order goes first
  assert.equal(a.engine.getText(), b.engine.getText());
  assert.match(a.engine.getText(), /^(hello|world )(hello|world )$/);
  assert.equal(sim.seq.version, 2);
});

test('undo reverts only your own edit, where it now is', async () => {
  const sim = new Sim({ window: 1000, compactEvery: 2000 });
  const a = await sim.add('a');
  const b = await sim.add('b');
  a.connect();
  b.connect();
  sim.settle();
  a.engine.insertText('abc ');
  a.client.afterLocal();
  sim.settle();
  b.engine.setSelection(0);
  b.engine.insertText('XY');
  b.client.afterLocal();
  sim.settle();
  assert.equal(a.engine.getText(), 'XYabc ');
  a.engine.undo();
  a.client.afterLocal();
  sim.settle();
  assert.equal(a.engine.getText(), 'XY');
  assert.equal(b.engine.getText(), 'XY');
  a.engine.redo();
  a.client.afterLocal();
  sim.settle();
  assert.equal(b.engine.getText(), 'XYabc ');
});

test('remote cursors follow the text', async () => {
  const sim = new Sim({ window: 1000, compactEvery: 2000 });
  const a = await sim.add('a');
  const b = await sim.add('b');
  a.connect();
  b.connect();
  sim.settle();
  a.engine.insertText('hello world');
  a.client.afterLocal();
  sim.settle();
  b.engine.setSelection(6, 11);
  b.client.afterLocal();
  sim.tick(500);
  sim.settle();
  assert.deepEqual(
    a.client.doc.remote.map((c) => [c.a, c.f]),
    [[6, 11]],
  );
  // a types before b's selection: the engine moves it
  a.engine.setSelection(0);
  a.engine.insertText('>> ');
  a.client.afterLocal();
  assert.deepEqual(
    a.client.doc.remote.map((c) => [c.a, c.f]),
    [[9, 14]],
  );
  sim.settle();
  assert.equal(b.engine.anchor, 9);
});

test('a late joiner loads the snapshot and the operations after it', async () => {
  const sim = new Sim({ window: 5, compactEvery: 4 });
  const a = await sim.add('a');
  a.connect();
  sim.settle();
  for (const w of ['one ', 'two ', 'three ', 'four ', 'five ', 'six ']) {
    a.engine.insertText(w);
    a.client.afterLocal();
    sim.settle();
  }
  sim.seq.compact();
  a.engine.insertText('seven');
  a.client.afterLocal();
  sim.settle();
  const b = await sim.add('b');
  b.connect();
  sim.settle();
  assert.equal(b.engine.getText(), 'one two three four five six seven');
});

// COLLAB_SEEDS=2000 for a longer hunt
const SEEDS = Number(process.env.COLLAB_SEEDS ?? 60);

test('random editing by three people converges', async () => {
  for (let seed = 1; seed <= SEEDS; seed++) await run(seed, 400);
});

test('random editing converges with a small window and frequent compaction', async () => {
  for (let seed = 100_000; seed < 100_000 + SEEDS; seed++) await run(seed, 400, { window: 8, compactEvery: 10 });
});

test('random editing converges when clients fall behind the window and reload', async () => {
  let lost = 0;
  for (let seed = 200_000; seed < 200_000 + Math.ceil(SEEDS / 2); seed++) {
    const sim = await run(seed, 400, { window: 2, compactEvery: 3 });
    lost += sim.peers.reduce((n, p) => n + p.lost, 0);
  }
  assert.ok(lost > 0, 'some client had to reload');
});
