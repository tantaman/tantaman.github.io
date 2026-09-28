// Converts pasted/dropped HTML into editor cells (see editor.wat for the
// layout). The DOM walk has to happen in JS; everything it produces is
// plain numbers handed to the WASM `insert_cells`.

import { BlockType, CHECKED, Mark } from './engine.ts';

const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P',
  'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL',
]);
const SKIP_TAGS = new Set(['HEAD', 'IFRAME', 'LINK', 'META', 'NOSCRIPT', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG', 'TEMPLATE', 'TITLE']);

interface Context {
  marks: number;
  link: number;
  /** Block attrs for text that starts a block here. */
  block: number;
  pre: boolean;
}

export interface ImportedCells {
  cells: number[];
  /** Attrs of the final block, or -1 when the HTML was inline-only. */
  last: number;
}

/**
 * @param intern maps a URL to a link id (0 when refused, e.g. `javascript:`).
 */
export function htmlToCells(html: string, intern: (url: string) => number): ImportedCells {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const cells: number[] = [];
  let started = false; // a block exists
  let open = false; // the current block accepts text
  let attrs = 0; // attrs of the current block
  let lastWasSpace = true;
  let sawBlock = false;

  const startBlock = (blockAttrs: number) => {
    if (started) cells.push(10 | (attrs << 16));
    started = true;
    open = true;
    attrs = blockAttrs;
    lastWasSpace = true;
  };

  // A line break: text after it goes in a new block. Two in a row leave an
  // empty block between them; a trailing one adds nothing.
  const lineBreak = (ctx: Context) => {
    if (!open) startBlock(ctx.block);
    open = false;
  };

  const text = (data: string, ctx: Context) => {
    const cellAttrs = (ctx.marks | (ctx.link << 5)) << 16;
    for (let i = 0; i < data.length; i++) {
      let c = data.charCodeAt(i);
      if (ctx.pre) {
        if (c === 13) continue;
        if (c === 10) {
          lineBreak(ctx);
          continue;
        }
      } else if (c === 32 || c === 9 || c === 10 || c === 13 || c === 12) {
        // collapse whitespace like HTML rendering does
        if (lastWasSpace || !open) continue;
        c = 32;
      }
      if (!open) startBlock(ctx.block);
      cells.push(c | cellAttrs);
      lastWasSpace = c === 32 && !ctx.pre;
    }
  };

  const walk = (node: Node, ctx: Context) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text((node as Text).data, ctx);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (SKIP_TAGS.has(tag)) return;
    if (tag === 'BR') {
      lineBreak(ctx);
      return;
    }
    if (tag === 'IMG') {
      const alt = el.getAttribute('alt');
      if (alt) text(alt, ctx);
      return;
    }
    if (tag === 'INPUT') return;

    const c: Context = { ...ctx };
    switch (tag) {
      case 'B':
      case 'STRONG':
        c.marks |= Mark.Bold;
        break;
      case 'I':
      case 'EM':
      case 'CITE':
      case 'DFN':
        c.marks |= Mark.Italic;
        break;
      case 'U':
      case 'INS':
        c.marks |= Mark.Underline;
        break;
      case 'S':
      case 'STRIKE':
      case 'DEL':
        c.marks |= Mark.Strike;
        break;
      case 'CODE':
      case 'KBD':
      case 'SAMP':
      case 'TT':
        if (!c.pre) c.marks |= Mark.Code;
        break;
      case 'A': {
        const href = el.getAttribute('href');
        if (href) c.link = intern(href.trim());
        break;
      }
    }
    // Inline styles, as produced by Google Docs and friends.
    const style = el.style;
    const weight = style.fontWeight;
    if (weight) {
      if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) c.marks |= Mark.Bold;
      else c.marks &= ~Mark.Bold;
    }
    if (style.fontStyle === 'italic') c.marks |= Mark.Italic;
    else if (style.fontStyle === 'normal') c.marks &= ~Mark.Italic;
    const decoration = `${style.textDecorationLine} ${style.textDecoration}`;
    if (decoration.includes('underline')) c.marks |= Mark.Underline;
    if (decoration.includes('line-through')) c.marks |= Mark.Strike;

    if (!BLOCK_TAGS.has(tag)) {
      for (const child of el.childNodes) walk(child, c);
      return;
    }

    sawBlock = true;
    if (/^H[1-6]$/.test(tag)) {
      c.block = Math.min(3, Number(tag[1]));
    } else if (tag === 'BLOCKQUOTE') {
      c.block = BlockType.Quote;
    } else if (tag === 'PRE') {
      c.block = BlockType.Code;
      c.pre = true;
      c.marks &= ~Mark.Code;
    } else if (tag === 'LI') {
      const box = el.querySelector<HTMLInputElement>(
        ':scope > input[type="checkbox"], :scope > p > input[type="checkbox"], :scope > label > input[type="checkbox"]',
      );
      if (box) c.block = BlockType.Todo | (box.checked || box.hasAttribute('checked') ? CHECKED : 0);
      else c.block = el.parentElement?.tagName.toUpperCase() === 'OL' ? BlockType.Ordered : BlockType.Bullet;
    }
    // Other blocks (p, div, ul, td, ...) keep the enclosing format, so a
    // <p> inside an <li> or <blockquote> stays a list item or quote.
    open = false;
    for (const child of el.childNodes) walk(child, c);
    open = false;
  };

  walk(doc.body, { marks: 0, link: 0, block: BlockType.Paragraph, pre: false });
  return { cells, last: sawBlock && started ? attrs : -1 };
}
