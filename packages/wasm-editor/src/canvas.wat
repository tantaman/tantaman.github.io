;; canvas.wat -- the graphical editor. The engine plus a front end that lays
;; out text, paints it into a framebuffer and handles raw keyboard, mouse and
;; IME input, all in hand-written WebAssembly.
;;
;; The host (a browser page, or a native program embedding a WASM runtime)
;; only shows pixels and forwards events. It provides four functions:
;;
;;   host.present(x, y, w, h)   the framebuffer changed inside this rectangle
;;   host.set_cursor(kind)      mouse cursor: 0 arrow, 1 text, 2 pointer
;;   host.ime_rect(x, y, w, h)  where the caret is, for IME candidate windows
;;   host.open_url(ptr, len)    Mod-click on a link; UTF-16 at ptr
;;
;; and calls the exports in src/wat/ui-input.wat (init, resize, key_down,
;; text_input, mouse_*, wheel, tick, clipboard and document functions) and
;; src/wat/ui-touch.wat (touch_*).
;; The framebuffer is 4 bytes per pixel at fb_ptr(), W*4 bytes per row, in
;; RGBA byte order or, when the host asks for it at init, as 0x00RRGGBB words.

(module
  (import "host" "present" (func $host_present (param i32 i32 i32 i32)))
  (import "host" "set_cursor" (func $host_set_cursor (param i32)))
  (import "host" "ime_rect" (func $host_ime_rect (param i32 i32 i32 i32)))
  (import "host" "open_url" (func $host_open_url (param i32 i32)))

  ;; Covers the fixed regions up to OUT (see ui.wat); OUT and the
  ;; framebuffer are grown on demand.
  (memory (export "memory") 392)

  ;; @include wat/engine.wat
  ;; @include wat/ui.wat
  ;; @include wat/ui-draw.wat
  ;; @include wat/ui-layout.wat
  ;; @include wat/ui-paint.wat
  ;; @include wat/ui-input.wat
  ;; @include wat/ui-touch.wat
  ;; @font
)
