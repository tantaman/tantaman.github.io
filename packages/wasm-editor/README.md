# @tantaman/wasm-editor

A rich text editor whose engine is written by hand in WebAssembly text
(`src/editor.wat`). No compiler is involved. `scripts/assemble.mjs` runs wabt's
`wat2wasm`, which maps each text instruction to its opcode one-for-one.

The WASM owns the document, every editing command, undo/redo, rendering,
Markdown import/export and HTML export. The TypeScript side forwards DOM
events, copies strings in and out of linear memory, and swaps in the HTML of
blocks whose hash changed.

```sh
pnpm --filter @tantaman/wasm-editor dev    # demo page with toolbar and live Markdown/HTML
pnpm --filter @tantaman/wasm-editor test   # assemble + engine tests (node:test)
pnpm --filter @tantaman/wasm-editor build  # demo build in dist/
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

`src/editor.wasm` is generated, so run `pnpm wasm` (or any of the scripts
above) once after checkout before a consumer bundles this package.

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
| `0x850000` | OUT     | scratch for JS input and output; grows at will |

Every edit is a transaction of three primitives (insert cells, delete cells,
rewrite cells in place) logged as `[size kind a b payload... size]` records.
The size at both ends lets undo walk backwards and redo walk forwards.

The tests include a randomized run that checks every undo step lands on a
state seen before, and that undoing and redoing everything round-trips.
