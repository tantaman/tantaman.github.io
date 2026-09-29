import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Host, Key, Mod } from './canvas-host.ts';

// light theme colours as framebuffer words (RGBA bytes)
const MENU = 0xff352e2b;
const MENU_PRESSED = 0xff524945;
const ACCENT = 0xffdd4258;

// what touch_end asks of the host
const FOCUS = 1;
const COPY = 2;
const CUT = 3;
const PASTE = 4;

const LONG = Array.from({ length: 80 }, (_, i) => `Paragraph ${i + 1} of a long document.`).join('\n\n');

/**
 * Run the clock the way the host does, until the module stops asking for
 * frames. Unfocus first, or the caret's blink can ask for one.
 */
function settle(h: Host, limit = 10_000) {
  let frames = 0;
  for (let wait = h.x.tick(h.now()); wait >= 0 && wait <= 16 && frames < limit; frames++) wait = h.x.tick(h.now(wait));
  return frames;
}

test('a swipe scrolls and leaves the caret alone', () => {
  const h = new Host(800, 500).load(LONG);
  h.x.set_focus(0, h.now());
  const before = h.markdown();
  // slow, then resting before lifting: no momentum
  const act = h.touch(400, 400, [[400, 395], [400, 380], [400, 300], [400, 200]], { hold: 200 });
  assert.equal(act, 0);
  // the pan starts once the finger passes the tap slop (at 380)
  assert.equal(h.x.scroll_top(), 180);
  assert.deepEqual(h.selection, [0, 0]);
  assert.equal(h.markdown(), before);
  assert.equal(settle(h), 0);
  // back past the top: stops there, and follows as soon as the finger turns
  h.touch(400, 100, [[400, 150], [400, 450], [400, 420]], { hold: 200 });
  assert.equal(h.x.scroll_top(), 30);
});

test('a flick keeps scrolling, slowing down, and a touch stops it', () => {
  const h = new Host(800, 500).load(LONG);
  h.x.set_focus(0, h.now());
  h.touch(400, 450, [[400, 420], [400, 380], [400, 340], [400, 300]], { step: 10 });
  const released = h.x.scroll_top();
  assert.equal(released, 120);
  assert.equal(h.x.tick(h.now()), 16);
  h.x.tick(h.now());
  h.x.tick(h.now());
  const early = h.x.scroll_top() - released;
  assert.ok(early > 40, `moved ${early}px in the first frames`);
  // a finger down stops it, and that touch does not move the caret
  assert.equal(h.touch(400, 250, [], { gap: 16 }), 0);
  assert.deepEqual(h.selection, [0, 0]);
  const caught = h.x.scroll_top();
  assert.equal(settle(h), 0);
  assert.equal(h.x.scroll_top(), caught);
  // left alone, it slows to a stop
  h.touch(400, 450, [[400, 420], [400, 380], [400, 340], [400, 300]], { step: 10 });
  const start = h.x.scroll_top();
  const frames = settle(h);
  assert.ok(frames > 30 && frames < 400, `${frames} frames`);
  assert.ok(h.x.scroll_top() - start > 500, `coasted ${h.x.scroll_top() - start}px`);
  // and never past the end
  for (let i = 0; i < 5; i++) {
    h.touch(400, 450, [[400, 300], [400, 150], [400, 50]], { step: 8 });
    settle(h);
  }
  const bottom = h.x.scroll_top();
  h.x.wheel(0, 10_000);
  assert.equal(h.x.scroll_top(), bottom);
});

test('a tap places the caret and asks for the keyboard', () => {
  const h = new Host().load('alpha beta gamma');
  const [x, y, , ch] = h.caretAt(16);
  h.x.set_selection(0, 0);
  assert.equal(h.touch(x + 2, y + ch / 2), FOCUS);
  assert.deepEqual(h.selection, [16, 16]);
  // no menu for a first tap, nor handles
  assert.equal(h.box(MENU), null);
  assert.equal(h.box(ACCENT), null);
  // a tap on a checkbox toggles it without the keyboard
  h.load('- [ ] task');
  const [cx, cy, , cch] = h.caret;
  assert.equal(h.touch(cx - 20, cy + cch / 2), 0);
  assert.equal(h.markdown(), '- [x] task');
});

test('toolbar buttons respond to taps, and light up while pressed', () => {
  const h = new Host().load('some words');
  h.key('a', Mod.Ctrl);
  // the B button is the first; find it by where hovering lights it
  h.x.touch_start(24, 22, h.now(1000));
  assert.ok(h.presents.some(([, y, , ph]) => y === 0 && ph < 60));
  assert.equal(h.x.touch_end(24, 22, h.now()), 0);
  assert.equal(h.markdown(), '**some words**');
  // sliding off a button presses nothing
  h.touch(24, 22, [[24, 200]]);
  assert.equal(h.markdown(), '**some words**');
});

test('the colour palette works by touch', () => {
  const RED = 0xff2e22cf;
  const h = new Host().load('some words\n\nmore');
  const b = h.buttons();
  h.x.set_selection(0, 4);
  assert.equal(h.touch(b[5], 22), 0);
  const a = h.box(RED)!;
  assert.ok(a, 'the palette is open');
  // dragging from it neither scrolls nor picks
  h.x.wheel(0, 0);
  assert.equal(h.touch(a[0] + a[2] / 2, a[1] + a[3] / 2, [[a[0], a[1] + 200]]), 0);
  assert.equal(h.markdown(), 'some words\n\nmore');
  assert.ok(h.box(RED));
  // a tap on a swatch picks it and keeps the keyboard down
  assert.equal(h.touch(a[0] + a[2] / 2, a[1] + a[3] / 2), 0);
  assert.equal(h.markdown(), '<span style="color: #cf222e">some</span> words\n\nmore');
  // a tap in the text closes it and places the caret
  h.touch(b[5], 22);
  assert.ok(h.box(RED));
  const [x, y, , ch] = h.caretAt(14);
  h.x.set_selection(0, 4);
  h.touch(x + 2, y + ch / 2);
  assert.deepEqual(h.selection, [14, 14]);
  assert.equal(h.count(RED, a), 0);
});

test('a double tap selects a word and opens the edit menu', () => {
  const h = new Host().load('one\n\ntwo\n\nalpha beta gamma');
  const [x, y, , ch] = h.caretAt(16);
  h.x.set_selection(0, 0);
  const t = h.now(1000);
  h.x.touch_start(x, y + ch / 2, t);
  h.x.touch_end(x, y + ch / 2, t + 40);
  h.x.touch_start(x + 3, y + ch / 2 + 2, t + 180);
  assert.equal(h.x.touch_end(x + 3, y + ch / 2 + 2, t + 220), FOCUS);
  assert.equal(h.selectedText, 'beta');
  // handles at both ends, and the menu above the line
  const handles = h.box(ACCENT)!;
  assert.ok(handles[1] < y && handles[1] + handles[3] > y + ch, JSON.stringify(handles));
  const menu = h.box(MENU)!;
  assert.ok(menu, 'the menu is drawn');
  assert.ok(menu[1] + menu[3] < y, 'above the selection');
  // a third tap selects the paragraph
  h.x.touch_start(x, y + ch / 2, t + 300);
  h.x.touch_end(x, y + ch / 2, t + 340);
  assert.equal(h.selectedText, 'alpha beta gamma');
  // with no room above, the menu goes below
  h.load('alpha beta gamma');
  const [fx, fy, , fch] = h.caretAt(8);
  h.touch(fx, fy + fch / 2);
  h.touch(fx, fy + fch / 2, [], { gap: 100 });
  assert.ok(h.box(MENU)![1] > fy + fch, 'below the selection');
});

test('the edit menu copies, cuts and pastes through the host', () => {
  const h = new Host().load('alpha beta gamma');
  const [x, y, , ch] = h.caretAt(8);
  h.touch(x, y + ch / 2);
  h.touch(x, y + ch / 2, [], { gap: 100 });
  let [mx, my, mw, mh] = h.box(MENU)!;
  // Cut, Copy, Paste: Copy is in the middle
  h.x.touch_start(mx + mw / 2, my + mh / 2, h.now(1000));
  assert.ok(h.box(MENU_PRESSED), 'the pressed item lights up');
  assert.equal(h.x.touch_end(mx + mw / 2, my + mh / 2, h.now()), COPY);
  assert.equal(h.selectedText, 'beta');
  assert.equal(h.box(MENU), null, 'the menu closes');
  assert.ok(h.box(ACCENT), 'the handles stay');
  // a tap on the selection brings it back
  assert.equal(h.touch(x, y + ch / 2), FOCUS);
  assert.equal(h.selectedText, 'beta');
  [mx, my, mw, mh] = h.box(MENU)!;
  // sliding off an item presses nothing
  h.touch(mx + mw / 2, my + mh / 2, [[mx + mw / 2, my + mh + 80]]);
  assert.equal(h.selectedText, 'beta');
  assert.equal(h.touch(mx + 8, my + mh / 2), CUT);
  h.x.cut(h.now()); // what the host does after copying
  assert.equal(h.markdown(), 'alpha  gamma');
  // a tap on the caret opens Select, Select All, Paste
  const [cx, cy, , cch] = h.caret;
  assert.equal(h.touch(cx, cy + cch / 2), FOCUS);
  [mx, my, mw, mh] = h.box(MENU)!;
  assert.equal(h.touch(mx + mw - 8, my + mh / 2), PASTE);
  h.x.paste(h.put('pasted'), 0, h.now());
  assert.equal(h.markdown(), 'alpha pasted gamma');
  assert.equal(h.box(MENU), null);
  // Select All
  h.touch(h.caret[0], cy + cch / 2);
  [mx, my, mw, mh] = h.box(MENU)!;
  assert.equal(h.touch(mx + mw * 0.55, my + mh / 2), FOCUS);
  assert.equal(h.selectedText, 'alpha pasted gamma');
  assert.ok(h.box(MENU), 'the menu stays open for the new selection');
  // typing closes it
  h.type('x');
  assert.equal(h.box(MENU), null);
  assert.equal(h.box(ACCENT), null);
});

test('a long press selects a word, and dragging extends the selection', () => {
  const h = new Host().load('alpha beta gamma delta');
  const [x, y, , ch] = h.caretAt(8);
  const [ex] = h.caretAt(22);
  h.x.set_selection(0, 0);
  h.x.set_focus(0, h.now()); // no caret blink to tick for
  const t = h.now(1000);
  h.x.touch_start(x, y + ch / 2, t);
  assert.equal(h.x.tick(t + 100), 400, 'the clock is asked to come back for the long press');
  h.x.touch_move(x + 3, y + ch / 2, t + 200); // a wobble is not a pan
  h.x.tick(t + 510);
  assert.equal(h.selectedText, 'beta');
  assert.equal(h.x.scroll_top(), 0);
  h.x.touch_move(ex + 5, y + ch / 2, t + 600);
  assert.equal(h.selectedText, 'beta gamma delta');
  h.x.touch_move(4, y + ch / 2, t + 650);
  assert.equal(h.selectedText, 'alpha beta');
  assert.equal(h.x.touch_end(4, y + ch / 2, t + 700), FOCUS);
  assert.ok(h.box(MENU), 'the menu opens on release');
  // on spaces, a long press just places the caret, and opens the menu
  h.load('a      b');
  const [sx, sy, , sch] = h.caretAt(4);
  h.x.set_selection(0, 0);
  h.x.touch_start(sx, sy + sch / 2, h.now(1000));
  assert.equal(h.x.touch_end(sx, sy + sch / 2, h.now(600)), FOCUS);
  assert.deepEqual(h.selection, [4, 4]);
  assert.ok(h.box(MENU));
});

test('dragging a handle moves that end of the selection', () => {
  const h = new Host().load('alpha beta gamma delta');
  const [x, y, , ch] = h.caretAt(8);
  const [gx] = h.caretAt(16);
  h.touch(x, y + ch / 2);
  h.touch(x, y + ch / 2, [], { gap: 100 });
  assert.equal(h.selectedText, 'beta');
  // the end handle's knob hangs below the line
  const [ax, ay, aw, ah] = h.box(ACCENT)!;
  const endKnob = [ax + aw - 7, ay + ah - 5];
  assert.equal(h.touch(endKnob[0], endKnob[1], [[endKnob[0] + 30, endKnob[1]], [gx, endKnob[1] + 4]]), FOCUS);
  assert.equal(h.selectedText, 'beta gamma');
  assert.ok(h.box(MENU), 'the menu comes back on release');
  // the start handle's knob sits above the line
  const [bx, by] = h.box(ACCENT)!;
  assert.equal(h.touch(bx + 6, by + 5, [[bx - 20, by + 5], [2, by + 5]]), FOCUS);
  assert.equal(h.selectedText, 'alpha beta gamma');
  // a handle cannot be dragged onto the other
  const [cx, cy] = h.box(ACCENT)!;
  h.touch(cx + 6, cy + 5, [[gx + 200, cy + 5], [h.w - 20, cy + 5]]);
  assert.notEqual(h.x.anchor(), h.x.focus(), 'still a selection');
});

test('dragging a selection to the bottom edge scrolls', () => {
  const h = new Host(800, 500).load(LONG);
  const [x, y, , ch] = h.caretAt(4);
  h.x.set_selection(0, 0);
  const t = h.now(1000);
  h.x.touch_start(x, y + ch / 2, t);
  h.x.tick(t + 520);
  assert.equal(h.selectedText, 'Paragraph');
  h.x.touch_move(x, 495, t + 540);
  let now = t + 540;
  for (let i = 0; i < 30; i++) h.x.tick((now += 16));
  assert.ok(h.x.scroll_top() > 100, `scrolled ${h.x.scroll_top()}`);
  assert.ok(h.selectedText.length > 200, 'the selection followed');
  h.x.touch_end(x, 495, now + 16);
  h.x.set_focus(0, h.now());
  assert.equal(settle(h), 0, 'and stopped with the finger');
});

test('the menu and handles repaint only the lines they cross, and leave with focus', () => {
  const h = new Host(800, 600).load('one\n\ntwo words here\n\nthree\n\nfour\n\nfive');
  const [x, y, , ch] = h.caretAt(9);
  h.touch(x, y + ch / 2);
  h.presents.length = 0;
  h.touch(x, y + ch / 2, [], { gap: 100 });
  assert.equal(h.selectedText, 'words');
  const top = Math.min(...h.presents.map(([, py]) => py));
  const bottom = Math.max(...h.presents.map(([, py, , ph]) => py + ph));
  assert.ok(bottom - top < 250, `presented rows ${top}..${bottom}`);
  // a blur takes them away, leaving the selection
  h.x.set_focus(0, h.now());
  assert.equal(h.box(MENU), null);
  assert.equal(h.box(ACCENT), null);
  assert.equal(h.selectedText, 'words');
  // a click does too
  h.x.set_focus(1, h.now());
  h.touch(x, y + ch / 2);
  assert.ok(h.box(MENU));
  h.click(x, y + ch / 2);
  assert.equal(h.box(MENU), null);
  assert.equal(h.box(ACCENT), null);
  assert.equal(h.key(Key.Right), 1);
});

test('tapping a long selection opens the menu without scrolling to its end', () => {
  const h = new Host(800, 500).load(LONG);
  const [x, y, , ch] = h.caretAt(4);
  h.x.set_selection(2, 2000);
  h.x.repaint();
  assert.equal(h.touch(x, y + ch / 2), FOCUS);
  assert.equal(h.x.scroll_top(), 0);
  assert.deepEqual(h.selection, [2, 2000]);
  assert.ok(h.box(MENU), 'the menu is open');
  assert.ok(h.box(ACCENT), 'with a handle at the start in view');
});
