// The DOM side of the editor. It owns no document state: every edit is
// forwarded to the WASM engine, which re-renders HTML per block. This file
// maps DOM selections to document positions and back, and patches only the
// blocks whose content hash changed.

import { BlockType, CHECKED, Engine, Mark } from './engine.ts';
import { htmlToCells } from './html-import.ts';

export interface EditorState {
  /** Marks active across the selection, or for the next typed text. */
  marks: number;
  block: BlockType;
  checked: boolean;
  link: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

export interface EditorOptions {
  /** Initial content. */
  markdown?: string;
  placeholder?: string;
  /** Called after every change to the document. */
  onChange?(editor: RichTextEditor): void;
  /** Called when the selection, marks or history state may have changed. */
  onStateChange?(state: EditorState, editor: RichTextEditor): void;
  /** Called for Mod-K. Defaults to window.prompt. */
  onLinkRequest?(editor: RichTextEditor): void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

// Heuristic for plain-text pastes: parse as Markdown only if it looks like it.
const MARKDOWN_HINT = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```)|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\([^)\s]+\)|`[^`\n]+`|~~[^~\n]+~~/m;

/** Accept "example.com" and "me@example.com" as well as full URLs. */
export function normalizeUrl(input: string): string | null {
  const url = input.trim();
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || /^[/#?.]/.test(url)) return url;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  if (/^[^\s/]+\.[^\s]+/.test(url)) return `https://${url}`;
  return url;
}

export class RichTextEditor {
  readonly root: HTMLElement;
  readonly engine: Engine;
  private readonly options: EditorOptions;
  // From the last render, one entry per block (= per child of root).
  private hashes: number[] = [];
  private starts: number[] = [];
  private lengths: number[] = [];
  private composing = false;
  private plainPaste = false;
  private readonly cleanup: (() => void)[] = [];

  constructor(root: HTMLElement, engine: Engine, options: EditorOptions = {}) {
    this.root = root;
    this.engine = engine;
    this.options = options;
    root.classList.add('rt-editor');
    root.contentEditable = 'true';
    root.spellcheck = true;
    root.setAttribute('role', 'textbox');
    root.setAttribute('aria-multiline', 'true');
    root.setAttribute('translate', 'no');
    if (options.placeholder) root.dataset.placeholder = options.placeholder;
    root.replaceChildren();
    if (options.markdown) engine.setMarkdown(options.markdown);

    this.listen(root, 'beforeinput', this.onBeforeInput);
    this.listen(root, 'input', this.onInput);
    this.listen(root, 'keydown', this.onKeyDown);
    this.listen(root, 'compositionstart', this.onCompositionStart);
    this.listen(root, 'compositionend', this.onCompositionEnd);
    this.listen(root, 'copy', this.onCopy);
    this.listen(root, 'cut', this.onCut);
    this.listen(root, 'paste', this.onPaste);
    this.listen(root, 'dragstart', (e: Event) => e.preventDefault());
    this.listen(root, 'drop', this.onDrop);
    this.listen(root, 'mousedown', this.onMouseDown);
    this.listen(root, 'click', this.onClick);
    this.listen(root.ownerDocument, 'selectionchange', this.onSelectionChange);
    this.render();
  }

  // ---------------------------------------------------------------------
  // Public API

  get state(): EditorState {
    const e = this.engine;
    const attrs = e.blockAttrs;
    return {
      marks: e.marks,
      block: (attrs & 15) as BlockType,
      checked: (attrs & CHECKED) !== 0,
      link: e.linkAt(e.focus),
      canUndo: e.canUndo,
      canRedo: e.canRedo,
    };
  }

  focus(): void {
    this.root.focus({ preventScroll: true });
    this.applySelection();
  }

  toggleMark(mark: Mark): void {
    this.engine.toggleMark(mark);
    this.changed(true);
  }

  setBlock(type: BlockType): void {
    this.engine.setBlock(type);
    this.changed(true);
  }

  /** Link the selection (or the link at the caret). Returns false if the URL is refused. */
  setLink(url: string | null): boolean {
    const target = url === null ? null : normalizeUrl(url);
    if (url !== null && target === null) return false;
    const ok = this.engine.setLink(target);
    this.changed(true);
    return ok;
  }

  undo(): void {
    this.engine.undo();
    this.changed(true);
  }

  redo(): void {
    this.engine.redo();
    this.changed(true);
  }

  getMarkdown(): string {
    return this.engine.getMarkdown();
  }

  getHTML(): string {
    return this.engine.getHTML();
  }

  getText(): string {
    return this.engine.getText();
  }

  setMarkdown(markdown: string): void {
    this.engine.setMarkdown(markdown);
    this.hashes = [];
    this.changed();
  }

  destroy(): void {
    for (const off of this.cleanup.splice(0)) off();
    this.root.contentEditable = 'false';
  }

  // ---------------------------------------------------------------------
  // Rendering

  private render(): void {
    const root = this.root;
    const { count, blocks, html } = this.engine.render();
    const hashes: number[] = new Array(count);
    const starts: number[] = new Array(count);
    const lengths: number[] = new Array(count);
    for (let i = 0; i < count; i++) {
      starts[i] = blocks[i * 3];
      lengths[i] = blocks[i * 3 + 1];
      hashes[i] = blocks[i * 3 + 2];
    }

    // The DOM should be exactly one element per block from the last render.
    // If something else rearranged it, rebuild everything.
    const old = this.hashes;
    let intact = root.childNodes.length === old.length;
    for (let i = 0; intact && i < root.childNodes.length; i++) {
      if (root.childNodes[i].nodeType !== Node.ELEMENT_NODE) intact = false;
    }
    if (!intact) root.replaceChildren();
    const oldCount = intact ? old.length : 0;

    // Only the run of blocks between an unchanged prefix and suffix is replaced.
    const min = Math.min(oldCount, count);
    let prefix = 0;
    while (prefix < min && old[prefix] === hashes[prefix]) prefix++;
    let suffix = 0;
    while (suffix < min - prefix && old[oldCount - 1 - suffix] === hashes[count - 1 - suffix]) suffix++;

    for (let i = oldCount - suffix - 1; i >= prefix; i--) root.children[i].remove();
    let markup = '';
    for (let i = prefix; i < count - suffix; i++) markup += html(i);
    if (markup) {
      const template = root.ownerDocument.createElement('template');
      template.innerHTML = markup;
      root.insertBefore(template.content, root.children[prefix] ?? null);
    }

    this.hashes = hashes;
    this.starts = starts;
    this.lengths = lengths;
    root.toggleAttribute('data-empty', this.engine.length === 1);
    this.applySelection();
  }

  private changed(focus = false): void {
    if (focus) this.root.focus({ preventScroll: true });
    this.render();
    this.options.onChange?.(this);
    this.emitState();
  }

  private emitState(): void {
    this.options.onStateChange?.(this.state, this);
  }

  // ---------------------------------------------------------------------
  // Positions <-> DOM

  private blockIndexAt(pos: number): number {
    let lo = 0;
    let hi = this.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  private posToDom(pos: number): [Node, number] {
    const i = this.blockIndexAt(pos);
    const el = this.root.children[i];
    let k = pos - this.starts[i];
    const walker = this.root.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      if (k <= n.data.length) return [n, k];
      k -= n.data.length;
      last = n;
    }
    return last ? [last, last.data.length] : [el, 0];
  }

  /** Index of the block element holding `node`, or -1. */
  private blockOf(node: Node): number {
    const root = this.root;
    let el: Node | null = node;
    while (el && el.parentNode !== root) el = el.parentNode;
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return -1;
    return Array.prototype.indexOf.call(root.children, el);
  }

  private domToPos(node: Node, offset: number): number | null {
    const root = this.root;
    if (node === root) {
      return offset < this.starts.length ? this.starts[offset] : this.engine.length - 1;
    }
    const i = this.blockOf(node);
    if (i < 0 || i >= this.starts.length) return null;
    const range = root.ownerDocument.createRange();
    range.setStart(root.children[i], 0);
    range.setEnd(node, offset);
    return this.starts[i] + Math.min(range.toString().length, this.lengths[i] - 1);
  }

  private readSelection(): [number, number] | null {
    const sel = this.root.ownerDocument.getSelection();
    if (!sel?.anchorNode || !sel.focusNode) return null;
    const a = this.domToPos(sel.anchorNode, sel.anchorOffset);
    const f = this.domToPos(sel.focusNode, sel.focusOffset);
    return a === null || f === null ? null : [a, f];
  }

  private syncSelection(): void {
    const sel = this.readSelection();
    if (sel) this.engine.setSelection(sel[0], sel[1]);
  }

  private applySelection(): void {
    const doc = this.root.ownerDocument;
    if (doc.activeElement !== this.root || this.composing) return;
    const sel = doc.getSelection();
    if (!sel) return;
    const [an, ao] = this.posToDom(this.engine.anchor);
    const [fn, fo] = this.posToDom(this.engine.focus);
    if (sel.anchorNode === an && sel.anchorOffset === ao && sel.focusNode === fn && sel.focusOffset === fo) return;
    sel.setBaseAndExtent(an, ao, fn, fo);
  }

  private sameBlock(a: number, b: number): boolean {
    return this.blockIndexAt(a) === this.blockIndexAt(b);
  }

  private targetRange(e: InputEvent): [number, number] | null {
    const ranges = e.getTargetRanges?.() ?? [];
    if (!ranges.length) return null;
    const r = ranges[0];
    const s = this.domToPos(r.startContainer, r.startOffset);
    const t = this.domToPos(r.endContainer, r.endOffset);
    return s === null || t === null ? null : [s, t];
  }

  // ---------------------------------------------------------------------
  // Input

  private listen(target: EventTarget, type: string, handler: (e: never) => void): void {
    const fn = handler as EventListener;
    target.addEventListener(type, fn);
    this.cleanup.push(() => target.removeEventListener(type, fn));
  }

  private onSelectionChange = (): void => {
    if (this.composing) return;
    const sel = this.root.ownerDocument.getSelection();
    if (!sel?.focusNode || !this.root.contains(sel.focusNode)) return;
    this.syncSelection();
    this.emitState();
  };

  /**
   * Delete using the browser's own target range when it stays inside one
   * block (grapheme clusters, words, lines), else the engine's command
   * (which knows how to join blocks and unwrap lists).
   */
  private deleteWith(target: [number, number] | null, command: () => void): void {
    const e = this.engine;
    if (e.anchor === e.focus && target && target[0] !== target[1] && this.sameBlock(target[0], target[1])) {
      e.setSelection(target[0], target[1]);
      e.deleteBackward();
    } else {
      command();
    }
  }

  private deleteToLineEdge(forward: boolean): void {
    const e = this.engine;
    if (e.anchor !== e.focus) {
      e.deleteBackward();
      return;
    }
    const i = this.blockIndexAt(e.focus);
    const edge = forward ? this.starts[i] + this.lengths[i] - 1 : this.starts[i];
    if (edge === e.focus) {
      if (forward) e.deleteForward();
      else e.deleteBackward();
      return;
    }
    e.setSelection(e.focus, edge);
    e.deleteBackward();
  }

  private onBeforeInput = (e: InputEvent): void => {
    if (this.composing || e.isComposing || e.inputType === 'insertCompositionText') return;
    const eng = this.engine;
    const target = this.targetRange(e);
    this.syncSelection();
    switch (e.inputType) {
      case 'insertText':
      case 'insertReplacementText':
      case 'insertFromYank': {
        const text = e.data ?? e.dataTransfer?.getData('text/plain') ?? '';
        // autocorrect and spellcheck say which word they replace
        if (target && target[0] !== target[1]) eng.setSelection(target[0], target[1]);
        if (text) eng.insertText(text);
        else if (eng.anchor !== eng.focus) eng.deleteBackward();
        break;
      }
      case 'insertParagraph':
      case 'insertLineBreak':
        eng.insertParagraph();
        break;
      case 'deleteContentBackward':
        this.deleteWith(target, () => eng.deleteBackward());
        break;
      case 'deleteContentForward':
        this.deleteWith(target, () => eng.deleteForward());
        break;
      case 'deleteWordBackward':
        this.deleteWith(target, () => eng.deleteWordBackward());
        break;
      case 'deleteWordForward':
        this.deleteWith(target, () => eng.deleteWordForward());
        break;
      case 'deleteSoftLineBackward':
      case 'deleteHardLineBackward':
        this.deleteWith(target, () => this.deleteToLineEdge(false));
        break;
      case 'deleteSoftLineForward':
      case 'deleteHardLineForward':
        this.deleteWith(target, () => this.deleteToLineEdge(true));
        break;
      case 'deleteContent':
      case 'deleteByCut':
      case 'deleteByDrag':
        if (eng.anchor !== eng.focus) eng.deleteBackward();
        break;
      case 'formatBold':
        eng.toggleMark(Mark.Bold);
        break;
      case 'formatItalic':
        eng.toggleMark(Mark.Italic);
        break;
      case 'formatUnderline':
        eng.toggleMark(Mark.Underline);
        break;
      case 'formatStrikeThrough':
        eng.toggleMark(Mark.Strike);
        break;
      case 'insertOrderedList':
        eng.setBlock(BlockType.Ordered);
        break;
      case 'insertUnorderedList':
        eng.setBlock(BlockType.Bullet);
        break;
      case 'historyUndo':
        eng.undo();
        break;
      case 'historyRedo':
        eng.redo();
        break;
      case 'insertFromPaste':
      case 'insertFromPasteAsQuotation':
      case 'insertFromDrop':
        if (e.dataTransfer) this.insertTransfer(e.dataTransfer, false);
        break;
      default:
        // Let the browser do it; `input` reconciles the DOM into the model.
        return;
    }
    e.preventDefault();
    this.changed();
  };

  // The browser changed the DOM itself (IME composition, or an input type we
  // do not handle). Diff the caret's block against the model and apply the
  // difference as an edit, then re-render that block from the model.
  private reconcile(): void {
    const root = this.root;
    const sel = root.ownerDocument.getSelection();
    let intact = root.childNodes.length === this.hashes.length;
    for (let i = 0; intact && i < root.childNodes.length; i++) {
      if (root.childNodes[i].nodeType !== Node.ELEMENT_NODE) intact = false;
    }
    const i = intact && sel?.focusNode ? this.blockOf(sel.focusNode) : -1;
    if (i < 0 || !sel?.focusNode) {
      // Structure changed in a way we cannot map: restore from the model.
      this.hashes = [];
      this.changed();
      return;
    }
    const el = root.children[i];
    const start = this.starts[i];
    const modelText = this.engine.getText(start, start + this.lengths[i] - 1);
    const domText = el.textContent ?? '';
    if (domText === modelText) return;

    const range = root.ownerDocument.createRange();
    range.setStart(el, 0);
    range.setEnd(sel.focusNode, sel.focusOffset);
    const caret = range.toString().length;

    const max = Math.min(domText.length, modelText.length);
    let a = 0;
    while (a < max && domText.charCodeAt(a) === modelText.charCodeAt(a)) a++;
    let b = 0;
    while (b < max - a && domText.charCodeAt(domText.length - 1 - b) === modelText.charCodeAt(modelText.length - 1 - b)) b++;
    const inserted = domText.slice(a, domText.length - b);
    this.engine.setSelection(start + a, start + modelText.length - b);
    if (inserted) this.engine.insertText(inserted);
    else this.engine.deleteBackward();
    this.engine.setSelection(start + caret);
    this.hashes[i] = NaN; // that block's DOM no longer matches any render
    this.changed();
  }

  private onInput = (): void => {
    if (!this.composing) this.reconcile();
  };

  private onCompositionStart = (): void => {
    this.syncSelection();
    const e = this.engine;
    // An IME can only work inside one block; clear a selection across blocks first.
    if (e.anchor !== e.focus && !this.sameBlock(e.anchor, e.focus)) {
      e.deleteBackward();
      this.changed();
    }
    this.composing = true;
  };

  private onCompositionEnd = (): void => {
    this.composing = false;
    this.reconcile();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.isComposing || e.keyCode === 229) return;
    const mod = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
    const key = e.key.toLowerCase();
    let command: (() => void) | null = null;
    if (mod && !e.altKey) {
      if (key === 'b') command = () => this.engine.toggleMark(Mark.Bold);
      else if (key === 'i') command = () => this.engine.toggleMark(Mark.Italic);
      else if (key === 'u') command = () => this.engine.toggleMark(Mark.Underline);
      else if (key === 'e') command = () => this.engine.toggleMark(Mark.Code);
      else if (key === 'x' && e.shiftKey) command = () => this.engine.toggleMark(Mark.Strike);
      else if (key === 'z') command = e.shiftKey ? () => this.engine.redo() : () => this.engine.undo();
      else if (key === 'y' && !isMac) command = () => this.engine.redo();
      else if (key === 'k') command = () => this.requestLink();
      else if (e.shiftKey && e.code === 'Digit7') command = () => this.engine.setBlock(BlockType.Ordered);
      else if (e.shiftKey && e.code === 'Digit8') command = () => this.engine.setBlock(BlockType.Bullet);
      else if (e.shiftKey && e.code === 'Digit9') command = () => this.engine.setBlock(BlockType.Todo);
      else if (key === 'v' && e.shiftKey) this.plainPaste = true; // the paste event follows
    } else if (mod && e.altKey && !e.getModifierState('AltGraph')) {
      // (Windows reports AltGr as Ctrl+Alt; those keys type characters)
      const digit = /^Digit([0-3])$/.exec(e.code);
      if (digit) command = () => this.engine.setBlock(Number(digit[1]) as BlockType);
    } else if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      this.syncSelection();
      if ((this.engine.blockAttrs & 15) === BlockType.Code) command = () => this.engine.insertText('\t');
    }
    if (!command) return;
    e.preventDefault();
    this.syncSelection();
    command();
    this.changed();
  };

  private requestLink(): void {
    if (this.options.onLinkRequest) {
      this.options.onLinkRequest(this);
      return;
    }
    const current = this.engine.linkAt(this.engine.focus) ?? '';
    const url = window.prompt('Link URL (empty to remove)', current);
    if (url === null) return;
    if (!url.trim()) this.engine.setLink(null);
    else this.engine.setLink(normalizeUrl(url));
  }

  // ---------------------------------------------------------------------
  // Clipboard, drag & drop, clicks

  private onCopy = (e: ClipboardEvent): void => {
    this.syncSelection();
    const eng = this.engine;
    const s = Math.min(eng.anchor, eng.focus);
    const t = Math.max(eng.anchor, eng.focus);
    if (s === t || !e.clipboardData) return;
    e.preventDefault();
    e.clipboardData.setData('text/html', eng.getHTML(s, t));
    e.clipboardData.setData('text/plain', eng.getText(s, t));
  };

  private onCut = (e: ClipboardEvent): void => {
    this.onCopy(e);
    if (!e.defaultPrevented) return;
    this.engine.deleteBackward();
    this.changed();
  };

  private insertTransfer(data: DataTransfer, plain: boolean): void {
    const eng = this.engine;
    const text = data.getData('text/plain');
    if (plain || (eng.blockAttrs & 15) === BlockType.Code) {
      if (text) eng.insertText(text);
      return;
    }
    const html = data.getData('text/html');
    if (html) {
      const { cells, last } = htmlToCells(html, (url) => eng.internLink(url));
      if (cells.length) {
        eng.insertCells(cells, last);
        return;
      }
    }
    if (!text) return;
    if (MARKDOWN_HINT.test(text)) eng.insertMarkdown(text);
    else eng.insertText(text);
  }

  private onPaste = (e: ClipboardEvent): void => {
    if (!e.clipboardData) return;
    e.preventDefault();
    this.syncSelection();
    this.insertTransfer(e.clipboardData, this.plainPaste);
    this.plainPaste = false;
    this.changed();
  };

  private onDrop = (e: DragEvent): void => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    const doc = this.root.ownerDocument as Document & {
      caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
    };
    let pos: number | null = null;
    const caret = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
    if (caret) pos = this.domToPos(caret.offsetNode, caret.offset);
    else {
      const range = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (range) pos = this.domToPos(range.startContainer, range.startOffset);
    }
    if (pos !== null) this.engine.setSelection(pos);
    this.insertTransfer(e.dataTransfer, false);
    this.changed(true);
  };

  private onMouseDown = (e: MouseEvent): void => {
    // A todo's checkbox is drawn in its left padding.
    const block = (e.target as Element).closest?.('.rt-todo');
    if (!block || block.parentNode !== this.root) return;
    const padding = parseFloat(getComputedStyle(block).paddingLeft) || 24;
    if (e.clientX - block.getBoundingClientRect().left > padding) return;
    e.preventDefault();
    const i = Array.prototype.indexOf.call(this.root.children, block);
    this.engine.toggleCheck(this.starts[i]);
    this.changed();
  };

  private onClick = (e: MouseEvent): void => {
    const a = (e.target as Element).closest?.('a');
    if (!a || !this.root.contains(a) || !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    window.open(a.href, '_blank', 'noopener,noreferrer');
  };
}
