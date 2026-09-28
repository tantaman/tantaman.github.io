// Browser host for canvas.wasm, the editor that draws itself.
//
// The module lays out and paints everything into a framebuffer in its own
// memory and handles raw input. This file only:
//   - copies the rectangles the module presents onto a <canvas>,
//   - forwards keys, mouse, touches, wheel, focus and theme changes,
//   - keeps a hidden <textarea> at the caret so typing, IME composition
//     and the clipboard work like in any text field,
//   - carries out the clipboard commands of the module's touch edit menu.

interface CanvasExports {
  memory: WebAssembly.Memory;
  init(w: number, h: number, scale: number, flags: number): void;
  resize(w: number, h: number, scale: number): void;
  set_theme(dark: number): void;
  set_focus(focused: number, now: number): void;
  repaint(): void;
  fb_ptr(): number;
  out_ptr(): number;
  scratch(bytes: number): number;
  tick(now: number): number;
  load_markdown(n: number): void;
  markdown(): number;
  copy_text(): number;
  copy_html(): number;
  cut(now: number): void;
  paste(n: number, plain: number, now: number): void;
  text_input(n: number, now: number): void;
  ime_preedit(n: number, now: number): void;
  key_down(key: number, mods: number, now: number): number;
  mouse_down(x: number, y: number, button: number, mods: number, now: number): void;
  mouse_move(x: number, y: number, mods: number, now: number): void;
  mouse_up(x: number, y: number, button: number, mods: number, now: number): void;
  wheel(dx: number, dy: number): void;
  touch_start(x: number, y: number, now: number): void;
  touch_move(x: number, y: number, now: number): void;
  touch_end(x: number, y: number, now: number): number;
  touch_cancel(now: number): void;
}

export interface CanvasEditorOptions {
  markdown?: string;
  /** 'auto' follows prefers-color-scheme. */
  theme?: 'light' | 'dark' | 'auto';
  /** Called after changes, at most once per animation frame. */
  onChange?(editor: CanvasEditor): void;
  /** canvas.wasm bytes or module; defaults to the bundled file. */
  wasm?: BufferSource | WebAssembly.Module;
}

const KEYS: Record<string, number> = {
  Backspace: 1, Delete: 2, Enter: 3, Tab: 4, Escape: 5, ArrowLeft: 6, ArrowRight: 7,
  ArrowUp: 8, ArrowDown: 9, Home: 10, End: 11, PageUp: 12, PageDown: 13,
};
const CURSORS = ['default', 'text', 'pointer'];
/** What touch_end asks of the host (0: nothing). */
const FOCUS = 1;
const COPY = 2;
const CUT = 3;
const PASTE = 4;
const hasTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
const now = () => Math.floor(performance.now());

let compiled: Promise<WebAssembly.Module> | null = null;
function bundledModule() {
  compiled ??= (async () => {
    const response = await fetch(new URL('./canvas.wasm', import.meta.url));
    if (!response.ok) throw new Error(`canvas.wasm: HTTP ${response.status}`);
    try {
      return await WebAssembly.compileStreaming(response.clone());
    } catch {
      return WebAssembly.compile(await response.arrayBuffer());
    }
  })();
  return compiled;
}

export async function createCanvasEditor(container: HTMLElement, options: CanvasEditorOptions = {}) {
  const source = options.wasm ?? (await bundledModule());
  const module = source instanceof WebAssembly.Module ? source : await WebAssembly.compile(source);
  return new CanvasEditor(container, module, options);
}

export class CanvasEditor {
  readonly container: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private readonly input: HTMLTextAreaElement;
  private readonly x: CanvasExports;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: CanvasEditorOptions;
  private image: ImageData | null = null;
  private width = 0;
  private height = 0;
  private scale = 1;
  private timer = 0;
  private frame = 0;
  private changeQueued = false;
  private composing = false;
  private plainPaste = false;
  /** Focus came from a tap, so the on-screen keyboard is up. */
  private tapFocused = false;
  /** Blurring only to focus again (see focusFromTouch). */
  private refocusing = false;
  /** The finger being followed; others are ignored. */
  private touchId: number | null = null;
  private readonly cleanup: (() => void)[] = [];
  private readonly dark: MediaQueryList;

  constructor(container: HTMLElement, module: WebAssembly.Module, options: CanvasEditorOptions = {}) {
    this.container = container;
    this.options = options;
    this.canvas = document.createElement('canvas');
    // the module handles every gesture; no page selection, callout or tap flash
    this.canvas.style.cssText =
      'display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;' +
      '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;';
    this.input = document.createElement('textarea');
    this.input.setAttribute('autocapitalize', 'off');
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('aria-label', 'Rich text editor');
    this.input.spellcheck = false;
    this.input.style.cssText =
      'position:absolute;left:0;top:0;width:2px;height:20px;padding:0;border:0;margin:0;opacity:0;' +
      'resize:none;overflow:hidden;white-space:pre;pointer-events:none;caret-color:transparent;font-size:16px;';
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.append(this.canvas, this.input);
    this.ctx = this.canvas.getContext('2d')!;

    const instance = new WebAssembly.Instance(module, {
      host: {
        present: (x: number, y: number, w: number, h: number) => this.present(x, y, w, h),
        set_cursor: (kind: number) => (this.canvas.style.cursor = CURSORS[kind] ?? 'default'),
        ime_rect: (x: number, y: number, _w: number, h: number) => {
          // keep the hidden input at the caret so IME windows open there
          this.input.style.transform = `translate(${x / this.scale}px, ${y / this.scale}px)`;
          this.input.style.height = `${h / this.scale}px`;
        },
        open_url: (ptr: number, n: number) => window.open(this.units(ptr, n), '_blank', 'noopener,noreferrer'),
      },
    });
    this.x = instance.exports as unknown as CanvasExports;

    this.dark = matchMedia('(prefers-color-scheme: dark)');
    const size = this.measure();
    this.x.init(size.w, size.h, this.scale, (isMac ? 1 : 0) | (this.isDark() ? 2 : 0));
    if (options.markdown) this.setMarkdown(options.markdown);
    this.listen();
    this.schedule();
  }

  // --- public API ------------------------------------------------------

  getMarkdown(): string {
    return this.read(this.x.markdown());
  }

  setMarkdown(markdown: string): void {
    this.x.load_markdown(this.write(markdown));
    this.changed();
  }

  focus(): void {
    this.input.focus({ preventScroll: true });
  }

  destroy(): void {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.frame);
    for (const off of this.cleanup.splice(0)) off();
    this.canvas.remove();
    this.input.remove();
  }

  // --- memory ----------------------------------------------------------

  private units(ptr: number, n: number) {
    let s = '';
    const view = new Uint16Array(this.x.memory.buffer, ptr, n);
    for (let i = 0; i < n; i += 4096) s += String.fromCharCode(...view.subarray(i, i + 4096));
    return s;
  }

  private write(text: string) {
    const ptr = this.x.scratch(text.length * 2);
    const view = new Uint16Array(this.x.memory.buffer, ptr, text.length);
    for (let i = 0; i < text.length; i++) view[i] = text.charCodeAt(i);
    return text.length;
  }

  private read(n: number) {
    return this.units(this.x.out_ptr(), n);
  }

  // --- pixels ----------------------------------------------------------

  private measure() {
    const rect = this.container.getBoundingClientRect();
    this.scale = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * this.scale));
    const h = Math.max(1, Math.round(rect.height * this.scale));
    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w;
    this.height = h;
    this.image = null;
    return { w, h };
  }

  private present(x: number, y: number, w: number, h: number) {
    const buffer = this.x.memory.buffer;
    // the view over wasm memory is rebuilt when memory grows or the size changes
    if (!this.image || this.image.data.buffer !== buffer) {
      const bytes = new Uint8ClampedArray(buffer, this.x.fb_ptr(), this.width * this.height * 4);
      this.image = new ImageData(bytes, this.width, this.height);
    }
    this.ctx.putImageData(this.image, 0, 0, x, y, w, h);
  }

  // --- events ----------------------------------------------------------

  /**
   * Focus the textarea from a touch, so the on-screen keyboard comes up. It
   * only does when focus moves during a gesture: focused earlier without one
   * (focus() on load), the keyboard stays down and focusing again changes
   * nothing, so blur first, without telling the module.
   */
  private focusFromTouch() {
    if (this.tapFocused) return;
    this.refocusing = true;
    this.input.blur();
    this.refocusing = false;
    this.focus();
    this.tapFocused = true;
  }

  /** Carry out what touch_end asked for; the edit menu's commands need the clipboard. */
  private touchAction(action: number) {
    const { x } = this;
    if (action === COPY || action === CUT) this.writeClipboard();
    if (action === CUT) x.cut(now());
    if (action === PASTE) {
      // iOS asks the user to confirm with a Paste button of its own
      navigator.clipboard?.readText?.().then(
        (text) => {
          if (!text) return;
          x.paste(this.write(text), 0, now());
          this.changed();
        },
        () => {},
      );
    }
    if (action === FOCUS || action === CUT || action === PASTE) this.focusFromTouch();
    this.changed();
  }

  private writeClipboard() {
    const text = this.read(this.x.copy_text());
    if (!text) return;
    const html = this.read(this.x.copy_html());
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    const plain = () => clipboard.writeText?.(text).catch(() => {});
    if (typeof ClipboardItem === 'undefined' || !clipboard.write) {
      plain();
      return;
    }
    clipboard
      .write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ])
      .catch(plain);
  }

  private isDark() {
    const theme = this.options.theme ?? 'auto';
    return theme === 'dark' || (theme === 'auto' && this.dark.matches);
  }

  /** Run the clock the module asks for: caret blink, long press, momentum. */
  private schedule() {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.frame);
    const wait = this.x.tick(now());
    if (wait < 0) return;
    if (wait <= 16) this.frame = requestAnimationFrame(() => this.schedule());
    else this.timer = window.setTimeout(() => this.schedule(), wait);
  }

  private changed() {
    this.schedule();
    if (!this.options.onChange || this.changeQueued) return;
    this.changeQueued = true;
    requestAnimationFrame(() => {
      this.changeQueued = false;
      this.options.onChange?.(this);
    });
  }

  private on<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, fn as EventListener, opts);
    this.cleanup.push(() => target.removeEventListener(type, fn as EventListener, opts));
  }

  private mods(e: KeyboardEvent | MouseEvent) {
    return (e.shiftKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.altKey ? 4 : 0) | (e.metaKey ? 8 : 0);
  }

  private point(e: { clientX: number; clientY: number }) {
    const rect = this.canvas.getBoundingClientRect();
    return [Math.round((e.clientX - rect.left) * this.scale), Math.round((e.clientY - rect.top) * this.scale)];
  }

  private listen() {
    const { input, canvas, x } = this;

    this.on(input, 'keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      let key = KEYS[e.key] ?? 0;
      // shortcuts are matched by key position, so they survive keyboard layouts
      // (AltGr arrives as Ctrl+Alt on Windows; those keys type characters)
      if (!key && (e.ctrlKey || e.metaKey || e.altKey) && !e.getModifierState('AltGraph')) {
        if (/^Key[A-Z]$/.test(e.code)) key = e.code.charCodeAt(3) + 32;
        else if (/^Digit[0-9]$/.test(e.code)) key = e.code.charCodeAt(5);
      }
      if (key === 118 && e.shiftKey && (isMac ? e.metaKey : e.ctrlKey)) this.plainPaste = true;
      if (!key) return;
      if (x.key_down(key, this.mods(e), now())) {
        e.preventDefault();
        this.changed();
      }
    });

    // Typed text (and IME commits) arrive through the textarea.
    this.on(input, 'input', () => {
      if (this.composing) return;
      if (input.value) x.text_input(this.write(input.value), now());
      input.value = '';
      this.changed();
    });
    // Touch keyboards may send these without a usable keydown.
    this.on(input, 'beforeinput', (e) => {
      const key = { deleteContentBackward: 1, deleteContentForward: 2, insertParagraph: 3, insertLineBreak: 3 }[e.inputType];
      if (!key || this.composing) return;
      e.preventDefault();
      x.key_down(key, 0, now());
      this.changed();
    });
    this.on(input, 'compositionstart', () => (this.composing = true));
    this.on(input, 'compositionupdate', (e) => {
      x.ime_preedit(this.write(e.data ?? ''), now());
    });
    this.on(input, 'compositionend', (e) => {
      this.composing = false;
      x.ime_preedit(0, now());
      if (e.data) x.text_input(this.write(e.data), now());
      input.value = '';
      this.changed();
    });

    this.on(input, 'copy', (e) => {
      const text = this.read(x.copy_text());
      if (!text || !e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', text);
      e.clipboardData.setData('text/html', this.read(x.copy_html()));
    });
    this.on(input, 'cut', (e) => {
      const text = this.read(x.copy_text());
      if (!text || !e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', text);
      e.clipboardData.setData('text/html', this.read(x.copy_html()));
      x.cut(now());
      this.changed();
    });
    this.on(input, 'paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (text) x.paste(this.write(text), this.plainPaste ? 1 : 0, now());
      this.plainPaste = false;
      this.changed();
    });

    this.on(input, 'focus', () => {
      x.set_focus(1, now());
      this.schedule();
    });
    this.on(input, 'blur', () => {
      if (this.refocusing) return;
      this.tapFocused = false;
      x.set_focus(0, now());
      this.schedule();
    });

    // Mouse and pen. Touches arrive as touch events below, where the module
    // tells scrolling, taps and selecting apart.
    const skip = (e: PointerEvent) => hasTouch && e.pointerType === 'touch';
    this.on(canvas, 'pointerdown', (e) => {
      if (skip(e)) return;
      e.preventDefault();
      this.focus();
      canvas.setPointerCapture(e.pointerId);
      const [px, py] = this.point(e);
      x.mouse_down(px, py, e.button, this.mods(e), now());
      this.changed();
    });
    this.on(canvas, 'pointermove', (e) => {
      if (skip(e)) return;
      const [px, py] = this.point(e);
      x.mouse_move(px, py, this.mods(e), now());
    });
    this.on(canvas, 'pointerup', (e) => {
      if (skip(e)) return;
      const [px, py] = this.point(e);
      x.mouse_up(px, py, e.button, this.mods(e), now());
    });

    // Touches. Cancelling touchstart stops the page's own long-press
    // selection and callout, and the mouse events iOS sends after a tap (a
    // mousedown on the canvas, which can't take focus, would blur the
    // textarea and drop the keyboard). One finger is followed; an Apple
    // Pencil is a pointer ('pen') above, and only focuses here.
    const stylus = (t: Touch) => (t as Touch & { touchType?: string }).touchType === 'stylus';
    const follow = (list: TouchList) => {
      for (let i = 0; i < list.length; i++) if (list[i].identifier === this.touchId) return list[i];
      return null;
    };
    const touchOpts = { passive: false };
    this.on(
      canvas,
      'touchstart',
      (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        // the only finger down starts afresh, whatever was missed before
        if (e.touches.length === 1) this.touchId = null;
        if (this.touchId !== null || !t || stylus(t)) return;
        this.touchId = t.identifier;
        const [px, py] = this.point(t);
        x.touch_start(px, py, now());
        this.schedule(); // a long press is timed from here
      },
      touchOpts,
    );
    this.on(
      canvas,
      'touchmove',
      (e) => {
        e.preventDefault();
        const t = follow(e.changedTouches);
        if (!t) return;
        const [px, py] = this.point(t);
        x.touch_move(px, py, now());
        this.schedule();
      },
      touchOpts,
    );
    this.on(
      canvas,
      'touchend',
      (e) => {
        e.preventDefault();
        const t = follow(e.changedTouches);
        if (!t) {
          if (Array.from(e.changedTouches).some(stylus)) this.focusFromTouch();
          return;
        }
        this.touchId = null;
        const [px, py] = this.point(t);
        // still inside the touch's handler, so the keyboard and the
        // clipboard are allowed
        this.touchAction(x.touch_end(px, py, now()));
      },
      touchOpts,
    );
    this.on(canvas, 'touchcancel', (e) => {
      if (!follow(e.changedTouches)) return;
      this.touchId = null;
      x.touch_cancel(now());
      this.schedule();
    });
    this.on(
      canvas,
      'wheel',
      (e) => {
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height / this.scale : 1;
        x.wheel(Math.round(e.deltaX * unit * this.scale), Math.round(e.deltaY * unit * this.scale));
      },
      { passive: false },
    );

    const onTheme = () => x.set_theme(this.isDark() ? 1 : 0);
    this.dark.addEventListener('change', onTheme);
    this.cleanup.push(() => this.dark.removeEventListener('change', onTheme));

    const onResize = () => {
      const { w, h } = this.measure();
      x.resize(w, h, this.scale);
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(this.container);
    this.cleanup.push(() => observer.disconnect());
    // devicePixelRatio changes (zoom, moving between screens) resize nothing
    window.addEventListener('resize', onResize);
    this.cleanup.push(() => window.removeEventListener('resize', onResize));
  }
}
