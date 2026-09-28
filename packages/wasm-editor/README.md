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
  plus a graphical front end that lays out text, paints every pixel (toolbar
  included) into a framebuffer and interprets raw keyboard, mouse and IME
  input. Hosts only show pixels and forward events, so the same file runs in
  a browser and in a native window through Wasmtime. See
  [Graphical front end](#graphical-front-end).

```sh
pnpm --filter @tantaman/wasm-editor dev      # demo pages: / (DOM) and /canvas.html
pnpm --filter @tantaman/wasm-editor test     # assemble + engine and canvas tests (node:test)
pnpm --filter @tantaman/wasm-editor build    # demo build in dist/
pnpm --filter @tantaman/wasm-editor desktop -- notes.md   # native window (needs Rust)
```

```ts
import { createEditor, Mark, BlockType } from '@tantaman/wasm-editor';
import '@tantaman/wasm-editor/editor.css';

const editor = await createEditor(element, {
  markdown: '# Hello',
  onChange: (ed) => save(ed.getMarkdown()),
  onStateChange: (state) => updateToolbar(state), // marks, block, link, canUndo, ...
});
editor.toggleMark(Mark.Bold);
editor.setBlock(BlockType.Heading2);
editor.setLink('example.com');
```

`src/editor.wasm` and `src/canvas.wasm` are generated, so run `pnpm wasm` (or
any of the scripts above) once after checkout before a consumer bundles this
package.

## What it supports

- Marks: bold, italic, underline, strikethrough, inline code, links
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
  links, images (kept as links), autolinks and backslash escapes.
- Links are limited to http(s), mailto, tel and relative URLs, checked in WASM.

Lists are flat (no nesting) and there are no tables or images.

## Engine layout

A document is a gap buffer of 32-bit cells: a UTF-16 code unit in the low 16
bits, and marks + link id (text) or block type + checked flag (a `\n`
terminator) in the high 16 bits. The block format lives on its terminator.

| Address    | Region  |                                                |
| ---------- | ------- | ---------------------------------------------- |
| `0x000100` | strings | NUL-separated tags and Markdown tokens         |
| `0x010000` | DOC     | gap buffer, 1M cells                           |
| `0x410000` | UNDO    | undo log, 4 MiB; oldest steps drop when full   |
| `0x810000` | LINKS   | link table and URL arena (append-only)         |
| `0x850000` | OUT     | scratch for host input and output; grows at will |

Every edit is a transaction of three primitives (insert cells, delete cells,
rewrite cells in place) logged as `[size kind a b payload... size]` records.
The size at both ends lets undo walk backwards and redo walk forwards.

The tests include a randomized run that checks every undo step lands on a
state seen before, and that undoing and redoing everything round-trips.

## Graphical front end

`canvas.wasm` does everything an editor does between the input devices and
the screen. The host copies pixels and forwards events; it never sees a line,
a glyph or a selection.

```
          keys, text, IME, mouse, wheel, clipboard, resize, time
  host  ─────────────────────────────────────────────────────▶  canvas.wasm
        ◀─────────────────────────────────────────────────────
          present(rect), set_cursor, ime_rect, open_url          engine + layout
                                                                 + paint + input
```

### Hosts

**Browser** (`src/canvas.ts`, 360 lines):

```ts
import { createCanvasEditor } from '@tantaman/wasm-editor';

const editor = await createCanvasEditor(element, {
  markdown: '# Hello',
  theme: 'auto', // or 'light' / 'dark'
  onChange: (ed) => save(ed.getMarkdown()),
});
editor.setMarkdown('...');
editor.destroy();
```

It puts the framebuffer on a `<canvas>` with `putImageData` (only the
presented rectangles), and keeps a hidden `<textarea>` at the caret
(`ime_rect`) so typing, dead keys, IME composition and the system clipboard
behave like any text field. Demo: `canvas.html`.

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
| `present(x, y, w, h)`     | the framebuffer changed inside this rectangle             |
| `set_cursor(kind)`        | 0 arrow, 1 text, 2 pointer                                |
| `ime_rect(x, y, w, h)`    | where the caret is, for IME candidate windows              |
| `open_url(ptr, len)`      | Mod-click on a link; `len` UTF-16 units at `ptr`           |

Exports (all coordinates in device pixels, `now` in milliseconds):

| Function                                    | Meaning                                                          |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `init(w, h, scale, flags)`                  | flags: 1 macOS bindings, 2 dark, 4 `0x00RRGGBB` framebuffer       |
| `resize(w, h, scale)`, `set_theme(dark)`    |                                                                  |
| `set_focus(focused, now)`, `repaint()`      |                                                                  |
| `fb_ptr()`                                  | framebuffer: `w*h` pixels, 4 bytes each, rows `w*4` bytes apart   |
| `tick(now) → ms`                            | advance the caret blink; call again in `ms` (−1: nothing pending) |
| `key_down(key, mods, now) → handled`        | keys below; 0 means the host should handle it (e.g. clipboard)    |
| `text_input(n, now)`, `ime_preedit(n, now)` | `n` UTF-16 units written at `out_ptr()`                           |
| `mouse_down/up(x, y, button, mods, now)`    | button 0 primary                                                 |
| `mouse_move(x, y, mods, now)`, `wheel(dx, dy)` |                                                                |
| `copy_text() → n`, `copy_html() → n`, `cut(now)` | selection, written at `out_ptr()`                            |
| `paste(n, plain, now)`                      | text at `out_ptr()`; Markdown unless `plain`                      |
| `load_markdown(n)`, `markdown() → n`        | whole document                                                   |

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
- **Paint** (`ui-paint.wat`, `ui-draw.wat`): the view is split into bands
  (toolbar, link bar, scrollbar, one per visual line). Each band gets a key
  hashed from everything that affects its pixels; only bands whose key
  changed are repainted and presented. Typing a character repaints one line;
  a caret blink repaints a few hundred pixels.
- **Input** (`ui-input.wat`): hit testing, caret movement by character, word,
  line (with a goal column and wrap affinity), page and document; click,
  double-click word, triple-click block, drag selection with autoscroll;
  toolbar buttons, checkboxes, a link bar for Mod-K, scrollbar dragging.

| Address     | Region  |                                                  |
| ----------- | ------- | ------------------------------------------------ |
| `0x0000000` | engine  | as above, up to OUT                              |
| `0x0850000` | FONT    | font atlas                                       |
| `0x0C50000` | UI      | strings, block styles, link bar, preedit, toolbar, bands |
| `0x0C60000` | LINES   | laid-out visual lines, 32 bytes each             |
| `0x1060000` | GTAB    | glyph cache hash table                           |
| `0x1080000` | GBMP    | glyph cache bitmaps (cleared when full)          |
| `0x1880000` | OUT     | the engine's scratch, moved up here, 32 MiB cap  |
| `0x3880000` | FB      | framebuffer, grows with the window               |

### Limits of the canvas version

- Glyphs outside the atlas (CJK, emoji, most non-Latin scripts) draw as a
  box; there is no shaping, so no right-to-left or complex scripts.
- No spellcheck, autocorrect or screen reader support: the text is pixels.
  The DOM version has all three.
- Pasted HTML is read as its plain text (Markdown is still recognized).
