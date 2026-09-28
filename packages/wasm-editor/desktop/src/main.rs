//! Desktop host for canvas.wasm, the rich text editor written by hand in
//! WebAssembly.
//!
//! The module does all the work: it holds the document, lays out and paints
//! every pixel (toolbar included) into a framebuffer in its own memory, and
//! interprets keys and mouse input. This program is the pipe around it:
//! Wasmtime runs the module, winit provides a window and input, softbuffer
//! puts the framebuffer on screen, arboard reaches the clipboard, and the
//! Markdown file named on the command line is loaded and saved (Ctrl/Cmd-S).
//!
//!     wasm-editor-desktop [notes.md]
//!     wasm-editor-desktop notes.md --screenshot out.png [--size 900x700] [--scale 2]
//!                                  [--dark] [--type TEXT] [--keys ctrl+a,ctrl+b]
//!
//! The screenshot mode needs no display: it renders one frame (after typing
//! and keys, if given) and writes it as a PNG.

use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{anyhow, Context, Result};
use wasmtime::{Caller, Engine, Linker, Memory, Module, Store, TypedFunc};
use winit::application::ApplicationHandler;
use winit::dpi::{PhysicalPosition, PhysicalSize};
use winit::event::{ElementState, Ime, MouseButton, MouseScrollDelta, WindowEvent};
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::keyboard::{Key, KeyCode, ModifiersState, NamedKey, PhysicalKey};
use winit::window::{CursorIcon, Theme, Window, WindowId};

/// The module, embedded at build time (run `pnpm wasm` in the package first).
const WASM: &[u8] = include_bytes!("../../src/canvas.wasm");

const MAC: bool = cfg!(target_os = "macos");

// ---------------------------------------------------------------------------
// The module and the four functions it imports
// ---------------------------------------------------------------------------

#[derive(Default)]
struct HostState {
    /// Rectangles the module presented since they were last drawn.
    damage: Vec<[i32; 4]>,
    cursor: Option<i32>,
    ime_rect: Option<[i32; 4]>,
    open: Vec<String>,
}

struct Editor {
    store: Store<HostState>,
    memory: Memory,
    width: u32,
    height: u32,
    start: Instant,
    f: Funcs,
}

struct Funcs {
    init: TypedFunc<(i32, i32, f32, i32), ()>,
    resize: TypedFunc<(i32, i32, f32), ()>,
    set_theme: TypedFunc<i32, ()>,
    set_focus: TypedFunc<(i32, i32), ()>,
    repaint: TypedFunc<(), ()>,
    fb_ptr: TypedFunc<(), i32>,
    out_ptr: TypedFunc<(), i32>,
    scratch: TypedFunc<i32, i32>,
    tick: TypedFunc<i32, i32>,
    load_markdown: TypedFunc<i32, ()>,
    markdown: TypedFunc<(), i32>,
    copy_text: TypedFunc<(), i32>,
    copy_html: TypedFunc<(), i32>,
    cut: TypedFunc<i32, ()>,
    paste: TypedFunc<(i32, i32, i32), ()>,
    text_input: TypedFunc<(i32, i32), ()>,
    ime_preedit: TypedFunc<(i32, i32), ()>,
    key_down: TypedFunc<(i32, i32, i32), i32>,
    mouse_down: TypedFunc<(i32, i32, i32, i32, i32), ()>,
    mouse_move: TypedFunc<(i32, i32, i32, i32), ()>,
    mouse_up: TypedFunc<(i32, i32, i32, i32, i32), ()>,
    wheel: TypedFunc<(i32, i32), ()>,
}

fn utf16_at(memory: &[u8], ptr: usize, units: usize) -> String {
    let words: Vec<u16> = memory[ptr..ptr + units * 2]
        .chunks_exact(2)
        .map(|b| u16::from_le_bytes([b[0], b[1]]))
        .collect();
    String::from_utf16_lossy(&words)
}

impl Editor {
    fn new(width: u32, height: u32, scale: f32, dark: bool, words: bool) -> Result<Self> {
        let engine = Engine::default();
        let module = Module::new(&engine, WASM).map_err(anyhow::Error::from).context("compiling canvas.wasm")?;
        let mut linker: Linker<HostState> = Linker::new(&engine);
        linker.func_wrap("host", "present", |mut c: Caller<'_, HostState>, x: i32, y: i32, w: i32, h: i32| {
            c.data_mut().damage.push([x, y, w, h]);
        })?;
        linker.func_wrap("host", "set_cursor", |mut c: Caller<'_, HostState>, kind: i32| {
            c.data_mut().cursor = Some(kind);
        })?;
        linker.func_wrap("host", "ime_rect", |mut c: Caller<'_, HostState>, x: i32, y: i32, w: i32, h: i32| {
            c.data_mut().ime_rect = Some([x, y, w, h]);
        })?;
        linker.func_wrap("host", "open_url", |mut c: Caller<'_, HostState>, ptr: i32, len: i32| {
            let Some(memory) = c.get_export("memory").and_then(|e| e.into_memory()) else { return };
            let url = utf16_at(memory.data(&c), ptr as usize, len as usize);
            c.data_mut().open.push(url);
        })?;
        let mut store = Store::new(&engine, HostState::default());
        let instance = linker.instantiate(&mut store, &module)?;
        let memory = instance.get_memory(&mut store, "memory").ok_or_else(|| anyhow!("no memory export"))?;
        macro_rules! f {
            ($name:literal) => {
                instance
                    .get_typed_func(&mut store, $name)
                    .map_err(anyhow::Error::from)
                    .with_context(|| format!("export {}", $name))?
            };
        }
        let f = Funcs {
            init: f!("init"),
            resize: f!("resize"),
            set_theme: f!("set_theme"),
            set_focus: f!("set_focus"),
            repaint: f!("repaint"),
            fb_ptr: f!("fb_ptr"),
            out_ptr: f!("out_ptr"),
            scratch: f!("scratch"),
            tick: f!("tick"),
            load_markdown: f!("load_markdown"),
            markdown: f!("markdown"),
            copy_text: f!("copy_text"),
            copy_html: f!("copy_html"),
            cut: f!("cut"),
            paste: f!("paste"),
            text_input: f!("text_input"),
            ime_preedit: f!("ime_preedit"),
            key_down: f!("key_down"),
            mouse_down: f!("mouse_down"),
            mouse_move: f!("mouse_move"),
            mouse_up: f!("mouse_up"),
            wheel: f!("wheel"),
        };
        let mut editor = Editor { store, memory, width, height, start: Instant::now(), f };
        // flags: 1 macOS shortcuts, 2 dark, 4 pixels as 0x00RRGGBB words (what
        // softbuffer wants); screenshots ask for RGBA bytes instead
        let flags = (MAC as i32) | if dark { 2 } else { 0 } | if words { 4 } else { 0 };
        editor.f.init.call(&mut editor.store, (width as i32, height as i32, scale, flags))?;
        Ok(editor)
    }

    fn now(&self) -> i32 {
        self.start.elapsed().as_millis() as i32
    }

    /// Copy UTF-16 into the module's scratch; returns the length in units.
    fn write(&mut self, text: &str) -> Result<i32> {
        let units: Vec<u16> = text.encode_utf16().collect();
        let ptr = self.f.scratch.call(&mut self.store, units.len() as i32 * 2)? as usize;
        let bytes: Vec<u8> = units.iter().flat_map(|u| u.to_le_bytes()).collect();
        self.memory.write(&mut self.store, ptr, &bytes)?;
        Ok(units.len() as i32)
    }

    fn read(&mut self, units: i32) -> Result<String> {
        let ptr = self.f.out_ptr.call(&mut self.store, ())? as usize;
        Ok(utf16_at(self.memory.data(&self.store), ptr, units as usize))
    }

    fn load_markdown(&mut self, markdown: &str) -> Result<()> {
        let n = self.write(markdown)?;
        Ok(self.f.load_markdown.call(&mut self.store, n)?)
    }

    fn markdown(&mut self) -> Result<String> {
        let n = self.f.markdown.call(&mut self.store, ())?;
        self.read(n)
    }

    fn text(&mut self, text: &str) -> Result<()> {
        let n = self.write(text)?;
        let now = self.now();
        Ok(self.f.text_input.call(&mut self.store, (n, now))?)
    }

    fn preedit(&mut self, text: &str) -> Result<()> {
        let n = self.write(text)?;
        let now = self.now();
        Ok(self.f.ime_preedit.call(&mut self.store, (n, now))?)
    }

    fn key(&mut self, key: i32, mods: i32) -> Result<bool> {
        let now = self.now();
        Ok(self.f.key_down.call(&mut self.store, (key, mods, now))? != 0)
    }

    fn resize(&mut self, width: u32, height: u32, scale: f32) -> Result<()> {
        self.width = width;
        self.height = height;
        Ok(self.f.resize.call(&mut self.store, (width as i32, height as i32, scale))?)
    }

    fn framebuffer(&mut self) -> Result<&[u8]> {
        let ptr = self.f.fb_ptr.call(&mut self.store, ())? as usize;
        let len = (self.width * self.height * 4) as usize;
        Ok(&self.memory.data(&self.store)[ptr..ptr + len])
    }

    fn copy(&mut self) -> Result<Option<(String, String)>> {
        let n = self.f.copy_text.call(&mut self.store, ())?;
        if n == 0 {
            return Ok(None);
        }
        let text = self.read(n)?;
        let n = self.f.copy_html.call(&mut self.store, ())?;
        Ok(Some((text, self.read(n)?)))
    }
}

// ---------------------------------------------------------------------------
// Key codes shared with the module (see src/wat/ui-input.wat)
// ---------------------------------------------------------------------------

fn named_key(key: &Key) -> i32 {
    match key {
        Key::Named(NamedKey::Backspace) => 1,
        Key::Named(NamedKey::Delete) => 2,
        Key::Named(NamedKey::Enter) => 3,
        Key::Named(NamedKey::Tab) => 4,
        Key::Named(NamedKey::Escape) => 5,
        Key::Named(NamedKey::ArrowLeft) => 6,
        Key::Named(NamedKey::ArrowRight) => 7,
        Key::Named(NamedKey::ArrowUp) => 8,
        Key::Named(NamedKey::ArrowDown) => 9,
        Key::Named(NamedKey::Home) => 10,
        Key::Named(NamedKey::End) => 11,
        Key::Named(NamedKey::PageUp) => 12,
        Key::Named(NamedKey::PageDown) => 13,
        _ => 0,
    }
}

/// Letters and digits by key position, so shortcuts survive keyboard layouts.
fn shortcut_key(code: KeyCode) -> i32 {
    use KeyCode::*;
    let letters = [
        KeyA, KeyB, KeyC, KeyD, KeyE, KeyF, KeyG, KeyH, KeyI, KeyJ, KeyK, KeyL, KeyM, KeyN, KeyO, KeyP, KeyQ, KeyR, KeyS,
        KeyT, KeyU, KeyV, KeyW, KeyX, KeyY, KeyZ,
    ];
    let digits = [Digit0, Digit1, Digit2, Digit3, Digit4, Digit5, Digit6, Digit7, Digit8, Digit9];
    if let Some(i) = letters.iter().position(|k| *k == code) {
        return b'a' as i32 + i as i32;
    }
    if let Some(i) = digits.iter().position(|k| *k == code) {
        return b'0' as i32 + i as i32;
    }
    0
}

fn mods_bits(m: ModifiersState) -> i32 {
    (m.shift_key() as i32) | (m.control_key() as i32) << 1 | (m.alt_key() as i32) << 2 | (m.super_key() as i32) << 3
}

fn open_url(url: &str) {
    let result = if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(url).spawn()
    } else if cfg!(target_os = "windows") {
        std::process::Command::new("cmd").args(["/C", "start", "", url]).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(url).spawn()
    };
    if let Err(err) = result {
        eprintln!("could not open {url}: {err}");
    }
}

// ---------------------------------------------------------------------------
// The window
// ---------------------------------------------------------------------------

struct App {
    editor: Option<Editor>,
    file: Option<PathBuf>,
    initial: String,
    window: Option<Arc<Window>>,
    surface: Option<softbuffer::Surface<Arc<Window>, Arc<Window>>>,
    clipboard: Option<arboard::Clipboard>,
    mods: ModifiersState,
    pointer: (i32, i32),
    composing: bool,
    error: Option<anyhow::Error>,
}

impl App {
    fn editor(&mut self) -> &mut Editor {
        self.editor.as_mut().expect("editor exists once the window does")
    }

    /// Apply what the module asked for during the last calls: cursor, IME
    /// position, links to open, and a redraw if it presented anything.
    fn flush(&mut self) {
        let Some(window) = self.window.clone() else { return };
        let state = self.editor().store.data_mut();
        if let Some(kind) = state.cursor.take() {
            window.set_cursor(match kind {
                1 => CursorIcon::Text,
                2 => CursorIcon::Pointer,
                _ => CursorIcon::Default,
            });
        }
        if let Some([x, y, w, h]) = state.ime_rect.take() {
            window.set_ime_cursor_area(PhysicalPosition::new(x, y), PhysicalSize::new(w.max(1) as u32, h.max(1) as u32));
        }
        for url in std::mem::take(&mut state.open) {
            open_url(&url);
        }
        if !state.damage.is_empty() {
            window.request_redraw();
        }
    }

    fn redraw(&mut self) -> Result<()> {
        let Some(surface) = self.surface.as_mut() else { return Ok(()) };
        let editor = self.editor.as_mut().expect("editor");
        let (width, height) = (editor.width, editor.height);
        let damage: Vec<softbuffer::Rect> = std::mem::take(&mut editor.store.data_mut().damage)
            .into_iter()
            .filter(|r| r[2] > 0 && r[3] > 0)
            .map(|[x, y, w, h]| softbuffer::Rect {
                x: x.max(0) as u32,
                y: y.max(0) as u32,
                width: NonZeroU32::new(w as u32).unwrap(),
                height: NonZeroU32::new(h as u32).unwrap(),
            })
            .collect();
        let pixels = editor.framebuffer()?;
        let mut buffer = surface.buffer_mut().map_err(|e| anyhow!("{e}"))?;
        // The module writes 0x00RRGGBB words, softbuffer's format. Copy the
        // whole frame (the buffer may not hold the previous one) and tell the
        // compositor which parts changed.
        for (dst, src) in buffer.iter_mut().zip(pixels.chunks_exact(4)) {
            *dst = u32::from_le_bytes([src[0], src[1], src[2], src[3]]);
        }
        let full = [softbuffer::Rect {
            x: 0,
            y: 0,
            width: NonZeroU32::new(width).unwrap(),
            height: NonZeroU32::new(height).unwrap(),
        }];
        buffer
            .present_with_damage(if damage.is_empty() { &full } else { &damage })
            .map_err(|e| anyhow!("{e}"))?;
        Ok(())
    }

    fn save(&mut self) -> Result<()> {
        let markdown = self.editor().markdown()?;
        let path = self.file.clone().unwrap_or_else(|| PathBuf::from("untitled.md"));
        std::fs::write(&path, markdown + "\n").with_context(|| format!("writing {}", path.display()))?;
        eprintln!("saved {}", path.display());
        self.file = Some(path);
        Ok(())
    }

    /// Clipboard and save shortcuts belong to the host; everything else goes
    /// to the module. Returns true when the key was used.
    fn host_shortcut(&mut self, code: i32) -> Result<bool> {
        let primary = if MAC { self.mods.super_key() } else { self.mods.control_key() };
        if !primary || self.mods.alt_key() {
            return Ok(false);
        }
        match code as u8 {
            b'c' | b'x' => {
                if let Some((text, html)) = self.editor().copy()? {
                    if let Some(clipboard) = self.clipboard.as_mut() {
                        let _ = clipboard.set_html(html, Some(text));
                    }
                    if code == b'x' as i32 {
                        let now = self.editor().now();
                        let editor = self.editor();
                        editor.f.cut.call(&mut editor.store, now)?;
                    }
                }
                Ok(true)
            }
            b'v' => {
                let text = self.clipboard.as_mut().and_then(|c| c.get_text().ok()).unwrap_or_default();
                if !text.is_empty() {
                    let plain = self.mods.shift_key() as i32;
                    let editor = self.editor();
                    let n = editor.write(&text)?;
                    let now = editor.now();
                    editor.f.paste.call(&mut editor.store, (n, plain, now))?;
                }
                Ok(true)
            }
            b's' => {
                self.save()?;
                Ok(true)
            }
            _ => Ok(false),
        }
    }

    fn on_window_event(&mut self, event_loop: &ActiveEventLoop, event: WindowEvent) -> Result<()> {
        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::RedrawRequested => self.redraw()?,
            WindowEvent::Resized(size) => {
                let (w, h) = (size.width.max(1), size.height.max(1));
                if let Some(surface) = self.surface.as_mut() {
                    surface
                        .resize(NonZeroU32::new(w).unwrap(), NonZeroU32::new(h).unwrap())
                        .map_err(|e| anyhow!("{e}"))?;
                }
                let scale = self.window.as_ref().map_or(1.0, |w| w.scale_factor() as f32);
                self.editor().resize(w, h, scale)?;
            }
            WindowEvent::ModifiersChanged(m) => self.mods = m.state(),
            WindowEvent::Focused(focused) => {
                let now = self.editor().now();
                let editor = self.editor();
                editor.f.set_focus.call(&mut editor.store, (focused as i32, now))?;
            }
            WindowEvent::ThemeChanged(theme) => {
                let editor = self.editor();
                editor.f.set_theme.call(&mut editor.store, (theme == Theme::Dark) as i32)?;
            }
            WindowEvent::KeyboardInput { event, .. } if event.state == ElementState::Pressed => {
                let mut code = named_key(&event.logical_key);
                let modified = self.mods.control_key() || self.mods.super_key() || self.mods.alt_key();
                if code == 0 && modified {
                    if let PhysicalKey::Code(physical) = event.physical_key {
                        code = shortcut_key(physical);
                    }
                }
                if code != 0 && self.host_shortcut(code)? {
                    return Ok(());
                }
                let mods = mods_bits(self.mods);
                let handled = code != 0 && self.editor().key(code, mods)?;
                // printable text, unless an IME composition owns the keyboard
                let primary = if MAC { self.mods.super_key() } else { self.mods.control_key() };
                if !handled && !primary && !self.composing {
                    if let Some(text) = event.text.as_ref().filter(|t| t.chars().all(|c| !c.is_control())) {
                        self.editor().text(text)?;
                    }
                }
            }
            WindowEvent::Ime(Ime::Preedit(text, _)) => {
                self.composing = !text.is_empty();
                self.editor().preedit(&text)?;
            }
            WindowEvent::Ime(Ime::Commit(text)) => {
                self.composing = false;
                self.editor().preedit("")?;
                self.editor().text(&text)?;
            }
            WindowEvent::CursorMoved { position, .. } => {
                self.pointer = (position.x as i32, position.y as i32);
                let (x, y) = self.pointer;
                let mods = mods_bits(self.mods);
                let now = self.editor().now();
                let editor = self.editor();
                editor.f.mouse_move.call(&mut editor.store, (x, y, mods, now))?;
            }
            WindowEvent::MouseInput { state, button, .. } => {
                let button = match button {
                    MouseButton::Left => 0,
                    MouseButton::Middle => 1,
                    MouseButton::Right => 2,
                    _ => return Ok(()),
                };
                let (x, y) = self.pointer;
                let mods = mods_bits(self.mods);
                let now = self.editor().now();
                let editor = self.editor();
                if state == ElementState::Pressed {
                    editor.f.mouse_down.call(&mut editor.store, (x, y, button, mods, now))?;
                } else {
                    editor.f.mouse_up.call(&mut editor.store, (x, y, button, mods, now))?;
                }
            }
            WindowEvent::MouseWheel { delta, .. } => {
                let scale = self.window.as_ref().map_or(1.0, |w| w.scale_factor());
                let (dx, dy) = match delta {
                    MouseScrollDelta::LineDelta(x, y) => (-x as f64 * 48.0 * scale, -y as f64 * 48.0 * scale),
                    MouseScrollDelta::PixelDelta(p) => (-p.x, -p.y),
                };
                let editor = self.editor();
                editor.f.wheel.call(&mut editor.store, (dx as i32, dy as i32))?;
            }
            _ => {}
        }
        Ok(())
    }
}

impl ApplicationHandler for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        if self.window.is_some() {
            return;
        }
        let name = self.file.as_ref().and_then(|p| p.file_name()).map(|n| n.to_string_lossy().into_owned());
        let title = match name {
            Some(n) => format!("{n} - WASM editor"),
            None => "WASM editor".to_string(),
        };
        let attrs = Window::default_attributes().with_title(title).with_inner_size(winit::dpi::LogicalSize::new(900.0, 760.0));
        let result = (|| -> Result<()> {
            let window = Arc::new(event_loop.create_window(attrs)?);
            window.set_ime_allowed(true);
            let size = window.inner_size();
            let context = softbuffer::Context::new(window.clone()).map_err(|e| anyhow!("{e}"))?;
            let mut surface = softbuffer::Surface::new(&context, window.clone()).map_err(|e| anyhow!("{e}"))?;
            let (w, h) = (size.width.max(1), size.height.max(1));
            surface.resize(NonZeroU32::new(w).unwrap(), NonZeroU32::new(h).unwrap()).map_err(|e| anyhow!("{e}"))?;
            let dark = window.theme() == Some(Theme::Dark);
            let mut editor = Editor::new(w, h, window.scale_factor() as f32, dark, true)?;
            if !self.initial.is_empty() {
                editor.load_markdown(&self.initial)?;
            }
            editor.f.repaint.call(&mut editor.store, ())?;
            self.editor = Some(editor);
            self.surface = Some(surface);
            self.window = Some(window);
            self.clipboard = arboard::Clipboard::new().ok();
            Ok(())
        })();
        if let Err(err) = result {
            self.error = Some(err);
            event_loop.exit();
            return;
        }
        self.flush();
    }

    fn window_event(&mut self, event_loop: &ActiveEventLoop, _id: WindowId, event: WindowEvent) {
        if self.editor.is_none() {
            return;
        }
        if let Err(err) = self.on_window_event(event_loop, event) {
            self.error = Some(err);
            event_loop.exit();
            return;
        }
        self.flush();
    }

    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        if self.editor.is_none() {
            return;
        }
        // the module says when it next needs a tick (the caret blink)
        let now = self.editor().now();
        let editor = self.editor();
        let wait = editor.f.tick.call(&mut editor.store, now).unwrap_or(-1);
        self.flush();
        event_loop.set_control_flow(if wait >= 0 {
            ControlFlow::WaitUntil(Instant::now() + Duration::from_millis(wait.max(16) as u64))
        } else {
            ControlFlow::Wait
        });
    }
}

// ---------------------------------------------------------------------------
// Headless screenshots
// ---------------------------------------------------------------------------

struct Shot {
    out: PathBuf,
    width: u32,
    height: u32,
    scale: f32,
    dark: bool,
    typed: Option<String>,
    keys: Vec<String>,
}

fn screenshot(shot: &Shot, markdown: &str) -> Result<()> {
    let mut editor = Editor::new(shot.width, shot.height, shot.scale, shot.dark, false)?;
    editor.load_markdown(markdown)?;
    for key in &shot.keys {
        let mut mods = 0;
        let mut code = 0;
        for part in key.split('+') {
            match part {
                "shift" => mods |= 1,
                "ctrl" => mods |= 2,
                "alt" => mods |= 4,
                "cmd" | "meta" => mods |= 8,
                "backspace" => code = 1,
                "delete" => code = 2,
                "enter" => code = 3,
                "left" => code = 6,
                "right" => code = 7,
                "up" => code = 8,
                "down" => code = 9,
                "home" => code = 10,
                "end" => code = 11,
                c if c.len() == 1 => code = c.as_bytes()[0] as i32,
                other => return Err(anyhow!("unknown key {other}")),
            }
        }
        editor.key(code, mods)?;
    }
    if let Some(text) = &shot.typed {
        for line in text.split('\n').enumerate() {
            if line.0 > 0 {
                editor.key(3, 0)?;
            }
            for ch in line.1.chars() {
                editor.text(&ch.to_string())?;
            }
        }
    }
    let (w, h) = (editor.width, editor.height);
    let pixels = editor.framebuffer()?.to_vec();
    let file = std::fs::File::create(&shot.out)?;
    let mut encoder = png::Encoder::new(std::io::BufWriter::new(file), w, h);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder.write_header()?.write_image_data(&pixels)?;
    println!("markdown after edits:\n{}", editor.markdown()?);
    Ok(())
}

fn main() -> Result<()> {
    let mut args = std::env::args().skip(1);
    let mut file = None;
    let mut shot: Option<Shot> = None;
    let mut width = 900;
    let mut height = 760;
    let mut scale = 1.0;
    let mut dark = false;
    let mut typed = None;
    let mut keys = Vec::new();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--screenshot" => {
                shot = Some(Shot {
                    out: args.next().context("--screenshot needs a path")?.into(),
                    width,
                    height,
                    scale,
                    dark,
                    typed: None,
                    keys: Vec::new(),
                })
            }
            "--size" => {
                let v = args.next().context("--size WxH")?;
                let (w, h) = v.split_once('x').context("--size WxH")?;
                width = w.parse()?;
                height = h.parse()?;
            }
            "--scale" => scale = args.next().context("--scale N")?.parse()?,
            "--dark" => dark = true,
            "--type" => typed = Some(args.next().context("--type TEXT")?.replace("\\n", "\n")),
            "--keys" => keys = args.next().context("--keys a,b")?.split(',').map(str::to_string).collect(),
            "-h" | "--help" => {
                println!("usage: wasm-editor-desktop [FILE.md] [--screenshot OUT.png [--size WxH] [--scale N] [--dark] [--type TEXT] [--keys ctrl+a,...]]");
                return Ok(());
            }
            _ => file = Some(PathBuf::from(arg)),
        }
    }
    let initial = match &file {
        Some(path) if path.exists() => std::fs::read_to_string(path).with_context(|| format!("reading {}", path.display()))?,
        _ => String::new(),
    };

    if let Some(mut shot) = shot {
        shot.width = width;
        shot.height = height;
        shot.scale = scale;
        shot.dark = dark;
        shot.typed = typed;
        shot.keys = keys;
        return screenshot(&shot, &initial);
    }

    let event_loop = EventLoop::new()?;
    let mut app = App {
        editor: None,
        file,
        initial,
        window: None,
        surface: None,
        clipboard: None,
        mods: ModifiersState::empty(),
        pointer: (0, 0),
        composing: false,
        error: None,
    };
    event_loop.run_app(&mut app)?;
    match app.error {
        Some(err) => Err(err),
        None => Ok(()),
    }
}
