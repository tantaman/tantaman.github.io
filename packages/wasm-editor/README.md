# @tantaman/wasm-editor

A rich text editor written by hand in WebAssembly text. No compiler is
involved. `scripts/assemble.mjs` runs wabt's `wat2wasm`, which maps each text
instruction to its opcode one-for-one.

The same engine (`src/wat/engine.wat`) is assembled into two modules:

- **`editor.wasm`** (`src/editor.wat`, 15 KB): the engine alone. It owns the
  document, every editing command, undo/redo, rendering to HTML, Markdown
  import/export and HTML export. The TypeScript side forwards DOM events,
  copies strings in and out of linear memory, and swaps in the HTML of blocks
  whose hash changed.
- **`canvas.wasm`** (`src/canvas.wat`, 2.2 MB, 0.86 MB gzipped): the engine
  plus a graphical front end that lays out text, draws everything (toolbar
  included) and interprets raw keyboard, mouse and IME input. It either paints
  every pixel into a framebuffer or lists each frame as rectangles and glyphs
  for a GPU. Hosts only show the result and forward events, so the same file
  runs in a browser and in a native window through Wasmtime. See
  [Graphical front end](#graphical-front-end).

```sh
pnpm --filter @tantaman/wasm-editor dev      # demo pages: / (DOM) and /canvas.html
pnpm --filter @tantaman/wasm-editor test     # assemble + engine and canvas tests (node:test)
pnpm --filter @tantaman/wasm-editor build    # demo build in dist/
pnpm --filter @tantaman/wasm-editor desktop -- notes.md   # native window (needs Rust)
```

```ts
import { createEditor, Mark, BlockType, Color } from '@tantaman/wasm-editor';
import '@tantaman/wasm-editor/editor.css';

const editor = await createEditor(element, {
  markdown: '# Hello',
  onChange: (ed) => save(ed.getMarkdown()),
  onStateChange: (state) => updateToolbar(state), // marks, color, block, link, canUndo, ...
});
editor.toggleMark(Mark.Bold);
editor.setColor(Color.Red);
editor.setBlock(BlockType.Heading2);
editor.setLink('example.com');
```

The demo pages are published with `rindle-site` at `/wasm-editor/` (DOM) and
`/wasm-editor/canvas`. rindle-site's build runs `pnpm build:rindle` here, which
builds them into `rindle-site/public/wasm-editor/`, so `pnpm deploy` in
`rindle-site` ships them.

`src/editor.wasm` and `src/canvas.wasm` are generated, so run `pnpm wasm` (or
any of the scripts above) once after checkout before a consumer bundles this
package.

## What it supports

- Marks: bold, italic, underline, strikethrough, inline code, links
- Text colour from a palette: gray, red, orange, yellow, green, blue, purple.
  Each has a shade for light pages and one for dark ones, so coloured text
  stays readable in either theme (the DOM version gets `rt-c1`…`rt-c7`
  classes, themed in `editor.css`). A colour behaves like a mark: typing
  continues it, and it applies to the next typed text at a caret.
- Blocks: paragraph, H1–H3, quote, bulleted, numbered and checklist items, code lines
- Markdown shortcuts while typing: `# `, `## `, `### `, `- `, `* `, `1. `, `> `,
  `[] `, `[x] `, ```` ``` ````. Undo right after one restores the typed text.
- Undo/redo, with typing grouped by word
- Keyboard: Mod-B/I/U/E, Mod-Shift-X (strike), Mod-K (link), Mod-Alt-0…3,
  Mod-Shift-7/8/9 (lists), Tab in code blocks, Mod-Z / Mod-Shift-Z / Mod-Y
- Paste HTML (Google Docs style spans included), Markdown or plain text;
  Mod-Shift-V pastes plain text. Copy writes semantic HTML and plain text.
- IME composition, spellcheck and autocorrect: when the browser changes the
  DOM itself, the edited block is diffed against the model and re-rendered.
  (DOM version; the canvas version has IME but no spellcheck, see below.)
- Markdown in/out: ATX headings, lists (nested ones are flattened), task
  lists, quotes, fenced code, `**`/`__`, `*`/`_`, `~~`, `` ` ``, `<u>`,
  links, images (kept as links), autolinks and backslash escapes. Colours
  are written as `<span style="color: #cf222e">…</span>` with the light
  shade; reading, any `#rgb`/`#rrggbb` colour or palette name goes to the
  palette entry of its hue (near black and white to the text colour), and so
  do colours in pasted HTML.
- Links are limited to http(s), mailto, tel and relative URLs, checked in WASM.

Lists are flat (no nesting) and there are no tables or images.

## Engine layout

A document is a gap buffer of 32-bit cells: a UTF-16 code unit in the low 16
bits, and marks + link id + colour (text) or block type + checked flag (a
`\n` terminator) in the high 16 bits. The block format lives on its
terminator.

A cell has room for 255 link ids. The link table interns URLs, and when it
is full it reuses the entries that nothing refers to any more: no cell of
the document or of the undo history, and nothing interned since the
document last changed (a host may be about to insert it). If the history is
what holds them all, its older half is forgotten, as when the undo log
fills up.

| Address    | Region  |                                                |
| ---------- | ------- | ---------------------------------------------- |
| `0x000100` | strings | NUL-separated tags and Markdown tokens         |
| `0x010000` | DOC     | gap buffer, 1M cells                           |
| `0x410000` | UNDO    | undo log, 4 MiB; oldest steps drop when full   |
| `0x005000` | PALETTE | the text colours, light and dark shades        |
| `0x810000` | LINKS   | link table and URL arena, reused when full     |
| `0x850000` | OUT     | scratch for host input and output; grows at will |

Every edit is a transaction of three primitives (insert cells, delete cells,
rewrite cells in place) logged as `[size kind a b payload... size]` records.
The size at both ends lets undo walk backwards and redo walk forwards.

The tests include a randomized run that checks every undo step lands on a
state seen before, and that undoing and redoing everything round-trips.

## Graphical front end

`canvas.wasm` does everything an editor does between the input devices and
the screen. The host shows what the module drew and forwards events; it never
sees a line or a selection.

```
          keys, text, IME, mouse, wheel, clipboard, resize, time
  host  ─────────────────────────────────────────────────────▶  canvas.wasm
        ◀─────────────────────────────────────────────────────
          present(rect), set_cursor, ime_rect, open_url          engine + layout
                                                                 + paint + input
```

### Hosts

**Browser** (`src/canvas.ts`, 500 lines):

```ts
import { createCanvasEditor } from '@tantaman/wasm-editor';

const editor = await createCanvasEditor(element, {
  markdown: '# Hello',
  theme: 'auto', // or 'light' / 'dark'
  renderer: 'auto', // or 'webgpu' / 'cpu'
  onChange: (ed) => save(ed.getMarkdown()),
});
editor.renderer; // 'webgpu' or 'cpu', whichever it got
editor.setMarkdown('...');
editor.destroy();
```

Where the browser has WebGPU, the module runs with a display list and
`src/gpu.ts` draws it, once per animation frame (see
[On the GPU](#on-the-gpu)). Elsewhere, or with `renderer: 'cpu'`, it puts the
framebuffer on a `<canvas>` with `putImageData` (only the presented
rectangles). Either way a hidden `<textarea>` sits at the caret (`ime_rect`)
so typing, dead keys, IME composition and the system clipboard behave like
any text field. Touches go to the module's `touch_*` exports, which work out
the gesture; the host focuses the textarea from inside the `touchend` handler
(on iOS the keyboard only comes up then) and carries out the edit menu's Cut,
Copy and Paste with the async clipboard API. Demo: `canvas.html`.

**Desktop** (`desktop/`, Rust, 700 lines): Wasmtime runs the module, winit
provides the window, keyboard, IME and mouse, softbuffer shows the
framebuffer (the module paints `0x00RRGGBB` words for it directly), arboard
reaches the clipboard. `canvas.wasm` is embedded at build time.

```sh
pnpm wasm                                   # assemble src/canvas.wasm first
cargo run --release --manifest-path desktop/Cargo.toml -- notes.md
# Ctrl/Cmd-S writes the Markdown back to notes.md (default untitled.md)

# no display needed: render one frame to a PNG
cargo run --release --manifest-path desktop/Cargo.toml -- notes.md \
  --screenshot out.png --size 900x700 --scale 2 --dark --type 'Hello' --keys ctrl+a,ctrl+b
```

Needs Rust 1.94 or newer (Wasmtime 47). On Linux/X11 it also needs
`libxkbcommon-x11` at run time (`apt install libxkbcommon-x11-0`).

### Host interface

Imports (module `host`):

| Function                  | Meaning                                                  |
| ------------------------- | -------------------------------------------------------- |
| `present(x, y, w, h)`     | the framebuffer changed inside this rectangle; with a display list, always the whole window: there is a new frame |
| `set_cursor(kind)`        | 0 arrow, 1 text, 2 pointer                                |
| `ime_rect(x, y, w, h)`    | where the caret is, for IME candidate windows              |
| `open_url(ptr, len)`      | Mod-click on a link; `len` UTF-16 units at `ptr`           |

Exports (all coordinates in device pixels, `now` in milliseconds):

| Function                                    | Meaning                                                          |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `init(w, h, scale, flags)`                  | flags: 1 macOS bindings, 2 dark, 4 `0x00RRGGBB` framebuffer, 8 display list instead of a framebuffer |
| `resize(w, h, scale)`, `set_theme(dark)`    |                                                                  |
| `set_focus(focused, now)`, `repaint()`      |                                                                  |
| `fb_ptr()`                                  | framebuffer: `w*h` pixels, 4 bytes each, rows `w*4` bytes apart   |
| `list_ptr()`, `list_count()`                | display list: `list_count()` 64-byte records at `list_ptr()`      |
| `font_ptr()`, `font_size()`                 | the font atlas the display list's glyphs point into               |
| `tick(now) → ms`                            | advance the caret blink; call again in `ms` (−1: nothing pending) |
| `key_down(key, mods, now) → handled`        | keys below; 0 means the host should handle it (e.g. clipboard)    |
| `text_input(n, now)`, `ime_preedit(n, now)` | `n` UTF-16 units written at `out_ptr()`                           |
| `mouse_down/up(x, y, button, mods, now)`    | button 0 primary                                                 |
| `mouse_move(x, y, mods, now)`, `wheel(dx, dy)` |                                                                |
| `touch_start/move(x, y, now)`, `touch_cancel(now)` | one finger; see [Touch](#touch)                             |
| `touch_end(x, y, now) → action`             | 0 nothing, 1 focus the text input, 2 copy, 3 cut (copy, then `cut`), 4 paste |
| `copy_text() → n`, `copy_html() → n`, `cut(now)` | selection, written at `out_ptr()`                            |
| `paste(n, plain, now)`                      | text at `out_ptr()`; Markdown unless `plain`                      |
| `load_markdown(n)`, `markdown() → n`        | whole document                                                   |
| `refresh()`                                 | paint after the document or remote cursors were changed directly (collab) |

To pass text in, call `scratch(bytes)` (grows OUT, returns its address) and
write UTF-16 there. Key codes: 1 Backspace, 2 Delete, 3 Enter, 4 Tab,
5 Escape, 6–9 Left/Right/Up/Down, 10 Home, 11 End, 12 PageUp, 13 PageDown,
and 32–126 for the printable key (letters lowercase, digits by key
position) when a shortcut modifier is held. Modifiers: 1 Shift, 2 Ctrl,
4 Alt, 8 Meta.

### How it draws

- **Font**: `scripts/font-atlas.mjs` turns Source Serif 4 (regular, bold,
  italic, bold italic), IBM Plex Mono and IBM Plex Sans (interface) into
  signed distance fields, 48 texels per em, plus metrics and a kerning table,
  and the assembler bakes the result into a data segment (`;; @font`). At
  any size the WASM samples the field bilinearly into a coverage bitmap and
  caches it in a glyph cache. The atlas covers the fonts' Latin subset (ASCII,
  Latin-1, typographic quotes, dashes, bullet, €, ™ and a few more); the
  fonts are SIL OFL, via `@fontsource`.
- **Layout** (`ui-layout.wat`): each block type has a style (size, line
  height, face, indent, spacing); lines are wrapped greedily at spaces into
  32-byte line records, with collapsed margins and grouped code blocks.
  After an edit only what it changed is laid out again: the engine notes
  every edit as damaged ranges, and for each one layout restarts a line
  before it and stops at the first line after it that starts where an old
  line did, in the same block context; the old lines from there on are
  moved and kept. A keystroke or someone else's edit in a document of 1M
  characters takes about 0.1 ms instead of 30. When someone else's edit
  above the view changes its height, the view scrolls with the text, so
  what you are reading stays put.
- **Paint** (`ui-paint.wat`, `ui-draw.wat`): the view is split into bands
  (toolbar, link bar, scrollbar, one per visual line). Each band gets a key
  hashed from everything that affects its pixels; only bands whose key
  changed are repainted and presented. Typing a character repaints one line;
  a caret blink repaints a few hundred pixels. Scrolling moves every band,
  though, so each scroll step repaints and presents the whole text area:
  57 MB of pixels a frame on a 5K screen. That is what the GPU path is for.
- **Input** (`ui-input.wat`): hit testing, caret movement by character, word,
  line (with a goal column and wrap affinity), page and document; click,
  double-click word, triple-click block, drag selection with autoscroll;
  toolbar buttons, checkboxes, a link bar for Mod-K, the colour palette,
  scrollbar dragging.
- **Colour** (`ui-paint.wat`): the toolbar's "A" shows the selection's colour
  underneath and opens a row of swatches, an "A" in each colour. A click (or
  tap) on one colours the selection, or what is typed next at a caret;
  Left/Right and Enter pick from the keyboard, Escape or a click elsewhere
  closes it. The row floats over the text like the touch edit menu, so only
  the lines it crosses repaint. Text is drawn in its colour's shade for the
  theme, a coloured link in its colour; a done todo stays muted.
- **Touch** (`ui-touch.wat`), see below.

### Touch

A finger works as in a native text view. A swipe scrolls, and a flick keeps
scrolling with momentum (a touch stops it). A tap places the caret; a double
tap selects a word, a third tap the paragraph; a long press selects the word
under the finger, and dragging then extends the selection, scrolling at the
top and bottom edges. A selection made by touch gets a handle at each end to
drag, and an edit menu (Cut, Copy, Paste; for a caret Select, Select All,
Paste), opened and closed by tapping the selection or the caret. The long
press, momentum and edge scrolling run on `tick`.

The handles and menu are overlays: each text band they cross mixes them into
its key and draws them over its text, so only those bands repaint when they
appear, move or go. The clipboard stays with the host: `touch_end` returns the
command, and the host runs it inside its own touch handler, where browsers
allow clipboard access.

| Address     | Region  |                                                  |
| ----------- | ------- | ------------------------------------------------ |
| `0x0000000` | engine  | as above, up to OUT                              |
| `0x0850000` | FONT    | font atlas                                       |
| `0x0C50000` | UI      | strings, block styles, link bar, preedit, toolbar, bands, edit menu |
| `0x0C60000` | LINES   | laid-out visual lines, 32 bytes each             |
| `0x1060000` | GTAB    | glyph cache hash table                           |
| `0x1080000` | GBMP    | glyph cache bitmaps (cleared when full)          |
| `0x1840000` | LSCR    | lines being laid out again, 8,192 at most        |
| `0x1880000` | OUT     | the engine's scratch, moved up here, 32 MiB cap  |
| `0x3880000` | FB      | framebuffer, grows with the window; or the display list |

### On the GPU

With init flag 8 the module paints no pixels and allocates no framebuffer.
Everything that draws goes through four primitives in `ui-draw.wat` (`$fill`,
`$rrect`, `$line` and `$draw_cp`), and in this mode each call appends a
64-byte record to a display list instead:

| Offset | Field                                                                  |
| ------ | ---------------------------------------------------------------------- |
| 0      | `x, y, w, h` (i32): the quad, device px                                 |
| 16     | clip rectangle: `x0 \| y0 << 16`, `x1 \| y1 << 16`                     |
| 24     | colour, RGBA bytes                                                     |
| 28     | kind: 0 rectangle, 1 rounded rectangle, 2 line segment, 3 glyph        |
| 32     | eight parameters: the radius; the segment's ends and half width; or the glyph's distance field (offset and size in the atlas) and how to sample it |

`src/gpu.ts` uploads the atlas once and the list every frame, and draws each
record as one instanced quad. Its fragment shader computes each pixel's
coverage with the same arithmetic as the pixel code: the distance to a
rounded corner or a segment, or a bilinear sample of the glyph's signed
distance field, which `$raster` would otherwise have baked into the glyph
cache. So neither side keeps a glyph cache or packs a texture atlas, and
frames match the CPU path to within 2/255 per channel (the GPU rounds where
`$blend` truncates). `test/display-list.ts` is a software model of the
shader that the tests hold to the framebuffer.

The host redraws whole frames on the GPU, so the band keys now only decide
whether there is a new frame: `$paint` first runs through the frame without
listing anything, and lists all of it only when some key changed. Pointer
moves that change nothing cost no frame.

A scroll step on a 5K screen (5120×2880 at 2x, a page of wrapped text):

|                  | wasm time | uploaded per frame | wasm memory |
| ---------------- | --------- | ------------------ | ----------- |
| framebuffer      | 5.4 ms    | 57 MB              | 114 MiB     |
| display list     | 0.6 ms    | 143 KB (~2,200 records) | 58 MiB |

The desktop host still uses the framebuffer; the same list and shader would
run on wgpu.

### Editing together

`createCanvasEditor(el, { collab: { url } })` edits a document with everyone
else connected to it: a Durable Object per document sequences the edits,
clients rebase their own, and other people's selections are drawn in their
colours. `canvas.html?doc=<id>` does it on the demo page, served in memory by
`pnpm dev`. See [docs/COLLAB.md](docs/COLLAB.md).

### Limits of the canvas version

- Glyphs outside the atlas (CJK, emoji, most non-Latin scripts) draw as a
  box; there is no shaping, so no right-to-left or complex scripts.
- No spellcheck, autocorrect or screen reader support: the text is pixels.
  The DOM version has all three.
- Pasted HTML is read as its plain text (Markdown is still recognized).
