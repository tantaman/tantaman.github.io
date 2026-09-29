// Typed wrapper around the hand-written WebAssembly module (editor.wat).
// Everything here is string marshalling; the editing logic lives in the WASM.
// No DOM APIs are used so this also runs under Node (see test/).

export const Mark = {
  Bold: 1,
  Italic: 2,
  Underline: 4,
  Strike: 8,
  Code: 16,
} as const;
export type Mark = (typeof Mark)[keyof typeof Mark];

export const BlockType = {
  Paragraph: 0,
  Heading1: 1,
  Heading2: 2,
  Heading3: 3,
  Quote: 4,
  Bullet: 5,
  Ordered: 6,
  Todo: 7,
  Code: 8,
} as const;
export type BlockType = (typeof BlockType)[keyof typeof BlockType];

/** Bit set on a todo block's attrs when it is checked. */
export const CHECKED = 16;

/**
 * Text colours: palette entries, each with a shade for a light page and one
 * for a dark page (the canvas draws the right one; the DOM editor gets
 * `rt-c<n>` classes, see editor.css). 0 is the ordinary text colour.
 */
export const Color = {
  Default: 0,
  Gray: 1,
  Red: 2,
  Orange: 3,
  Yellow: 4,
  Green: 5,
  Blue: 6,
  Purple: 7,
} as const;
export type Color = (typeof Color)[keyof typeof Color];

interface Exports {
  memory: WebAssembly.Memory;
  reset(): void;
  clear_history(): void;
  scratch(bytes: number): number;
  length(): number;
  block_count(): number;
  cells(): number;
  anchor(): number;
  focus(): number;
  set_selection(anchor: number, focus: number): void;
  sel_marks(): number;
  sel_color(): number;
  sel_block(): number;
  insert_text(n: number): number;
  insert_cells(n: number, last: number): number;
  insert_paragraph(): number;
  delete_backward(): number;
  delete_forward(): number;
  delete_word_backward(): number;
  delete_word_forward(): number;
  toggle_mark(mask: number): number;
  set_color(color: number): number;
  set_block(type: number): number;
  toggle_check(pos: number): number;
  intern_link(n: number): number;
  set_link(n: number): number;
  link_at(pos: number): number;
  link_ptr(id: number): number;
  link_len(id: number): number;
  undo(): number;
  redo(): number;
  can_undo(): number;
  can_redo(): number;
  layout(): number;
  block_html(pos: number): number;
  export_text(s: number, e: number): number;
  export_html(s: number, e: number): number;
  export_markdown(s: number, e: number): number;
  paste_markdown(n: number): number;
  gap_start(): number;
  gap_end(): number;
  undo_bytes(): number;
  undo_cursor(): number;
  link_count(): number;
  read_cells(pos: number, n: number): number;
  // collaboration (docs/COLLAB.md; src/collab/ drives these)
  set_collab(on: number): void;
  undo_ptr(): number;
  journal_lost(): number;
  undo_request(): number;
  set_undo_state(bits: number): void;
  doc_version(): number;
  apply_insert(pos: number, n: number, who: number): number;
  apply_delete(pos: number, n: number): number;
  apply_format(pos: number, n: number, mask: number, value: number): number;
  load_cells(n: number): void;
  remote_ptr(): number;
  remote_count(): number;
  set_remote_count(n: number): void;
}

/** One rendered block: its HTML and where it sits in the document. */
export interface RenderedBlock {
  start: number;
  /** Cells including the terminator, so the text is `length - 1` units. */
  length: number;
  hash: number;
  html: string;
}

export interface EngineStats {
  length: number;
  blocks: number;
  gapStart: number;
  gapEnd: number;
  undoBytes: number;
  undoCursor: number;
  links: number;
  memoryBytes: number;
}

const decoder = new TextDecoder('utf-16le');

export type WasmSource = BufferSource | WebAssembly.Module | Response | Promise<Response>;

export class Engine {
  readonly wasm: Exports;

  constructor(instance: WebAssembly.Instance) {
    this.wasm = instance.exports as unknown as Exports;
  }

  static async load(source: WasmSource): Promise<Engine> {
    if (source instanceof WebAssembly.Module) {
      return new Engine(await WebAssembly.instantiate(source));
    }
    if (source instanceof Response || source instanceof Promise) {
      const response = await source;
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        try {
          const { instance } = await WebAssembly.instantiateStreaming(response.clone());
          return new Engine(instance);
        } catch {
          // Wrong MIME type from the server: fall back to bytes.
        }
      }
      const { instance } = await WebAssembly.instantiate(await response.arrayBuffer());
      return new Engine(instance);
    }
    const { instance } = await WebAssembly.instantiate(source);
    return new Engine(instance);
  }

  // --- marshalling -------------------------------------------------------

  /** Copy `text` into scratch as UTF-16; returns its length in units. */
  private put(text: string): number {
    const n = text.length;
    const ptr = this.wasm.scratch(n * 2);
    const view = new Uint16Array(this.wasm.memory.buffer, ptr, n);
    for (let i = 0; i < n; i++) view[i] = text.charCodeAt(i);
    return n;
  }

  /** Read `units` UTF-16 units written at scratch. */
  private take(units: number): string {
    const ptr = this.wasm.scratch(0);
    return decoder.decode(new Uint8Array(this.wasm.memory.buffer, ptr, units * 2));
  }

  // --- document ----------------------------------------------------------

  get length(): number {
    return this.wasm.length();
  }

  get blockCount(): number {
    return this.wasm.block_count();
  }

  /** Empty document and history. */
  reset(): void {
    this.wasm.reset();
  }

  /** Replace the document with parsed Markdown. History is cleared. */
  setMarkdown(markdown: string): void {
    this.wasm.reset();
    if (markdown) this.wasm.paste_markdown(this.put(markdown));
    this.wasm.clear_history();
    this.wasm.set_selection(0, 0);
  }

  /** Raw cells, for debugging and tests. */
  cells(): Uint32Array {
    const n = this.wasm.cells();
    return new Uint32Array(this.wasm.memory.buffer, this.wasm.scratch(0), n).slice();
  }

  // --- selection ---------------------------------------------------------

  get anchor(): number {
    return this.wasm.anchor();
  }

  get focus(): number {
    return this.wasm.focus();
  }

  setSelection(anchor: number, focus = anchor): void {
    this.wasm.set_selection(anchor, focus);
  }

  /** Marks active across the selection (or for the next typed text). */
  get marks(): number {
    return this.wasm.sel_marks();
  }

  /** Colour of the whole selection (or of the next typed text); -1 when it is mixed. */
  get color(): number {
    return this.wasm.sel_color();
  }

  /** Block attrs at the focus: `attrs & 15` is the type, `attrs & CHECKED` the todo state. */
  get blockAttrs(): number {
    return this.wasm.sel_block();
  }

  // --- editing -----------------------------------------------------------

  insertText(text: string): boolean {
    if (!text) return false;
    return this.wasm.insert_text(this.put(text)) === 1;
  }

  /** Insert pre-built cells (see editor.wat for the cell layout). */
  insertCells(cells: ArrayLike<number>, lastBlockAttrs = -1): boolean {
    if (!cells.length) return false;
    const ptr = this.wasm.scratch(cells.length * 4);
    new Uint32Array(this.wasm.memory.buffer, ptr, cells.length).set(cells);
    return this.wasm.insert_cells(cells.length, lastBlockAttrs) === 1;
  }

  /** Parse Markdown and insert it at the selection. */
  insertMarkdown(markdown: string): boolean {
    if (!markdown) return false;
    return this.wasm.paste_markdown(this.put(markdown)) === 1;
  }

  insertParagraph(): boolean {
    return this.wasm.insert_paragraph() === 1;
  }

  deleteBackward(): boolean {
    return this.wasm.delete_backward() === 1;
  }

  deleteForward(): boolean {
    return this.wasm.delete_forward() === 1;
  }

  deleteWordBackward(): boolean {
    return this.wasm.delete_word_backward() === 1;
  }

  deleteWordForward(): boolean {
    return this.wasm.delete_word_forward() === 1;
  }

  toggleMark(mark: number): boolean {
    return this.wasm.toggle_mark(mark) === 1;
  }

  /** Colour the selection, or the next typed text at a caret. */
  setColor(color: Color): boolean {
    return this.wasm.set_color(color) === 1;
  }

  setBlock(type: BlockType): boolean {
    return this.wasm.set_block(type) === 1;
  }

  toggleCheck(pos: number): boolean {
    return this.wasm.toggle_check(pos) === 1;
  }

  // --- links -------------------------------------------------------------

  /** Link id for `url`, or 0 if it is not http(s)/mailto/tel/relative. */
  internLink(url: string): number {
    return url ? this.wasm.intern_link(this.put(url)) : 0;
  }

  /** Link the selection (or the link at the caret); `null` unlinks. */
  setLink(url: string | null): boolean {
    return this.wasm.set_link(url ? this.put(url) : 0) === 1;
  }

  linkUrl(id: number): string | null {
    if (!id) return null;
    const ptr = this.wasm.link_ptr(id);
    const len = this.wasm.link_len(id);
    return decoder.decode(new Uint8Array(this.wasm.memory.buffer, ptr, len * 2));
  }

  linkAt(pos: number): string | null {
    return this.linkUrl(this.wasm.link_at(pos));
  }

  // --- history -----------------------------------------------------------

  undo(): boolean {
    return this.wasm.undo() === 1;
  }

  redo(): boolean {
    return this.wasm.redo() === 1;
  }

  get canUndo(): boolean {
    return this.wasm.can_undo() === 1;
  }

  get canRedo(): boolean {
    return this.wasm.can_redo() === 1;
  }

  clearHistory(): void {
    this.wasm.clear_history();
  }

  // --- output ------------------------------------------------------------

  /**
   * Lay out every block: `blocks` holds [start, length, hash] per block.
   * `html(i)` renders one block on demand, so unchanged blocks cost nothing.
   */
  render(): { count: number; blocks: Int32Array; html(i: number): string } {
    const count = this.wasm.layout();
    const blocks = new Int32Array(this.wasm.memory.buffer, this.wasm.scratch(0), count * 3).slice();
    return { count, blocks, html: (i) => this.take(this.wasm.block_html(blocks[i * 3])) };
  }

  renderAll(): RenderedBlock[] {
    const { count, blocks, html } = this.render();
    const out: RenderedBlock[] = [];
    for (let i = 0; i < count; i++) {
      out.push({ start: blocks[i * 3], length: blocks[i * 3 + 1], hash: blocks[i * 3 + 2], html: html(i) });
    }
    return out;
  }

  getText(start = 0, end = this.length - 1): string {
    return this.take(this.wasm.export_text(start, end));
  }

  getHTML(start = 0, end = this.length - 1): string {
    return this.take(this.wasm.export_html(start, end));
  }

  getMarkdown(start = 0, end = this.length - 1): string {
    return this.take(this.wasm.export_markdown(start, end));
  }

  stats(): EngineStats {
    const w = this.wasm;
    return {
      length: w.length(),
      blocks: w.block_count(),
      gapStart: w.gap_start(),
      gapEnd: w.gap_end(),
      undoBytes: w.undo_bytes(),
      undoCursor: w.undo_cursor(),
      links: w.link_count(),
      memoryBytes: w.memory.buffer.byteLength,
    };
  }
}
