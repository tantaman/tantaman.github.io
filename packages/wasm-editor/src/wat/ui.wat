;; ui.wat -- state, memory map, palette, block styles and the toolbar model
;; of the graphical front end (canvas.wat).
;;
;; ------------------------------------------------------------------------
;; Memory map (canvas build; the engine keeps 0 .. 0x850000)
;; ------------------------------------------------------------------------
;;   0x0850000  FONT     font atlas, see scripts/font-atlas.mjs for the format
;;   0x0C50000  UISTR    NUL-separated interface strings
;;   0x0C51000  UITAB    (u16 addr, u16 len) per interface string
;;   0x0C52000  STYLES   32 bytes per block type
;;   0x0C53000  LINKBUF  URL being typed in the link bar, UTF-16
;;   0x0C54000  PREEDIT  IME composition text, UTF-16
;;   0x0C55000  BTNS     toolbar buttons, 32 bytes each
;;   0x0C56000  BANDS    bands painted in the last frame, two lists of 1024
;;   0x0C60000  LINES    laid-out visual lines, 32 bytes each
;;   0x1060000  GTAB     glyph cache hash table, 16 bytes per slot
;;   0x1080000  GBMP     glyph cache coverage bitmaps
;;   0x1880000  OUT      the engine's scratch, capped at 32 MiB
;;   0x3880000  FB       framebuffer, grows with the window
;;
;; Everything on screen is measured in device pixels. CSS-like sizes in
;; this file are multiplied by $scale (the host's device pixel ratio).

  (global $FONT      i32 (i32.const 0x0850000))
  (global $UISTR     i32 (i32.const 0x0C50000))
  (global $UITAB     i32 (i32.const 0x0C51000))
  (global $STYLES    i32 (i32.const 0x0C52000))
  (global $LINKBUF   i32 (i32.const 0x0C53000))
  (global $LINK_CAP  i32 (i32.const 2000))
  (global $PREEDIT   i32 (i32.const 0x0C54000))
  (global $PRE_CAP   i32 (i32.const 1000))
  (global $BTNS      i32 (i32.const 0x0C55000))
  (global $BANDS     i32 (i32.const 0x0C56000))
  (global $BAND_MAX  i32 (i32.const 1024))
  (global $LINES     i32 (i32.const 0x0C60000))
  (global $LINE_MAX  i32 (i32.const 131072))
  (global $GTAB      i32 (i32.const 0x1060000))
  (global $GBMP      i32 (i32.const 0x1080000))
  (global $GBMP_END  i32 (i32.const 0x1880000))
  (global $UI_OUT    i32 (i32.const 0x1880000))
  (global $UI_OUT_END i32 (i32.const 0x3880000))
  (global $FB        i32 (i32.const 0x3880000))

  ;; font atlas, read from its header at init
  (global $E (mut f32) (f32.const 48))        ;; texels per em
  (global $S (mut f32) (f32.const 6))         ;; distance field spread, texels
  (global $cmap (mut i32) (i32.const 0))
  (global $cmap_n (mut i32) (i32.const 0))
  (global $faces (mut i32) (i32.const 0))
  (global $kern (mut i32) (i32.const 0))

  ;; host and window
  (global $ready (mut i32) (i32.const 0))
  (global $W (mut i32) (i32.const 0))
  (global $H (mut i32) (i32.const 0))
  (global $scale (mut f32) (f32.const 1))
  (global $fmt (mut i32) (i32.const 0))       ;; 0 RGBA bytes, 1 0x00RRGGBB words
  (global $mac (mut i32) (i32.const 0))       ;; Cmd instead of Ctrl
  (global $dark (mut i32) (i32.const 0))
  (global $focused (mut i32) (i32.const 1))
  (global $now (mut i32) (i32.const 0))       ;; host clock, ms

  ;; geometry
  (global $tb_h (mut i32) (i32.const 0))      ;; toolbar height
  (global $lb_h (mut i32) (i32.const 0))      ;; link bar height, 0 when closed
  (global $view_top (mut i32) (i32.const 0))  ;; first row of the text area
  (global $view_h (mut i32) (i32.const 0))
  (global $col_x (mut i32) (i32.const 0))     ;; text column, screen x
  (global $col_w (mut i32) (i32.const 0))
  (global $strip_w (mut i32) (i32.const 0))   ;; scrollbar strip at the right edge
  (global $scroll (mut i32) (i32.const 0))
  (global $doc_h (mut i32) (i32.const 0))
  (global $nlines (mut i32) (i32.const 0))

  ;; editing view state
  (global $dirty (mut i32) (i32.const 1))     ;; lines need laying out
  (global $full (mut i32) (i32.const 1))      ;; repaint everything
  (global $reveal (mut i32) (i32.const 0))    ;; scroll the caret into view
  (global $affinity (mut i32) (i32.const 0))  ;; 1: caret at the end of the previous visual line
  (global $goal_x (mut f32) (f32.const -1))   ;; column kept by Up/Down
  (global $blink_t (mut i32) (i32.const 0))
  (global $drag (mut i32) (i32.const 0))
  (global $clicks (mut i32) (i32.const 0))
  (global $click_t (mut i32) (i32.const -100000))
  (global $click_x (mut i32) (i32.const 0))
  (global $click_y (mut i32) (i32.const 0))
  (global $hover (mut i32) (i32.const -1))    ;; toolbar button under the pointer
  (global $cursor (mut i32) (i32.const -1))
  (global $link_open (mut i32) (i32.const 0))
  (global $link_len (mut i32) (i32.const 0))
  (global $pre_len (mut i32) (i32.const 0))
  (global $nbtns (mut i32) (i32.const 0))

  ;; painting
  (global $cx0 (mut i32) (i32.const 0))       ;; clip rectangle
  (global $cy0 (mut i32) (i32.const 0))
  (global $cx1 (mut i32) (i32.const 0))
  (global $cy1 (mut i32) (i32.const 0))
  (global $nbands (mut i32) (i32.const 0))
  (global $band_list (mut i32) (i32.const 0)) ;; which of the two lists is current
  (global $tb_key (mut i32) (i32.const 0))
  (global $lb_key (mut i32) (i32.const 0))
  (global $strip_key (mut i32) (i32.const 0))
  (global $emb (mut f32) (f32.const 0))       ;; glyph emboldening, px

  ;; glyph cache
  (global $gtop (mut i32) (i32.const 0x1080000))
  (global $gcount (mut i32) (i32.const 0))

  ;; palette, packed for the framebuffer
  (global $c_bg (mut i32) (i32.const 0))
  (global $c_text (mut i32) (i32.const 0))
  (global $c_muted (mut i32) (i32.const 0))
  (global $c_accent (mut i32) (i32.const 0))
  (global $c_sel (mut i32) (i32.const 0))
  (global $c_sel_blur (mut i32) (i32.const 0))
  (global $c_code (mut i32) (i32.const 0))
  (global $c_rule (mut i32) (i32.const 0))
  (global $c_bar (mut i32) (i32.const 0))
  (global $c_hover (mut i32) (i32.const 0))
  (global $c_active (mut i32) (i32.const 0))
  (global $c_active_fg (mut i32) (i32.const 0))
  (global $c_field (mut i32) (i32.const 0))
  (global $c_thumb (mut i32) (i32.const 0))

  ;; Interface strings. Byte 1 stands for U+2022 (bullet).
  ;;  0 B   1 I   2 U   3 S   4 Code   5 Link   6 H1   7 H2   8 H3   9 Quote
  ;; 10 "* List"  11 "1. List"  12 Todo  13 "{ }"  14 Undo  15 Redo
  ;; 16 Start writing   17 Link   18 Enter to apply, Esc to cancel
  (data (i32.const 0x0C50000)
    "B\00I\00U\00S\00Code\00Link\00H1\00H2\00H3\00Quote\00"
    "\01 List\001. List\00Todo\00{ }\00Undo\00Redo\00"
    "Start writing\00Link\00Enter to apply, Esc to cancel\00")

  ;; ---------------------------------------------------------------------
  ;; Colours
  ;; ---------------------------------------------------------------------

  ;; 0xRRGGBB to a framebuffer word: RGBA bytes, or a 0x00RRGGBB word.
  (func $rgb (param $c i32) (result i32)
    (if (result i32) (global.get $fmt)
      (then (local.get $c))
      (else
        (i32.or
          (i32.const 0xFF000000)
          (i32.or
            (i32.or (i32.shr_u (i32.and (local.get $c) (i32.const 0xFF0000)) (i32.const 16))
                    (i32.and (local.get $c) (i32.const 0xFF00)))
            (i32.shl (i32.and (local.get $c) (i32.const 0xFF)) (i32.const 16)))))))

  (func $apply_theme
    (if (global.get $dark)
      (then
        (global.set $c_bg (call $rgb (i32.const 0x16181D)))
        (global.set $c_text (call $rgb (i32.const 0xE4E6EB)))
        (global.set $c_muted (call $rgb (i32.const 0x979EAB)))
        (global.set $c_accent (call $rgb (i32.const 0xA597FF)))
        (global.set $c_sel (call $rgb (i32.const 0x3A3470)))
        (global.set $c_sel_blur (call $rgb (i32.const 0x33363E)))
        (global.set $c_code (call $rgb (i32.const 0x22252C)))
        (global.set $c_rule (call $rgb (i32.const 0x2C3038)))
        (global.set $c_bar (call $rgb (i32.const 0x1C1F25)))
        (global.set $c_hover (call $rgb (i32.const 0x2A2E36)))
        (global.set $c_active (call $rgb (i32.const 0x2E2952)))
        (global.set $c_active_fg (call $rgb (i32.const 0xC0B6FF)))
        (global.set $c_field (call $rgb (i32.const 0x111317)))
        (global.set $c_thumb (call $rgb (i32.const 0x4A4F5A)))
        (global.set $emb (f32.const 0)))
      (else
        (global.set $c_bg (call $rgb (i32.const 0xFFFFFF)))
        (global.set $c_text (call $rgb (i32.const 0x1B1D22)))
        (global.set $c_muted (call $rgb (i32.const 0x68707D)))
        (global.set $c_accent (call $rgb (i32.const 0x5842DD)))
        (global.set $c_sel (call $rgb (i32.const 0xD9D3FF)))
        (global.set $c_sel_blur (call $rgb (i32.const 0xE4E5EA)))
        (global.set $c_code (call $rgb (i32.const 0xF2F3F6)))
        (global.set $c_rule (call $rgb (i32.const 0xE1E4E9)))
        (global.set $c_bar (call $rgb (i32.const 0xF7F8FA)))
        (global.set $c_hover (call $rgb (i32.const 0xE9EBF0)))
        (global.set $c_active (call $rgb (i32.const 0xE6E0FF)))
        (global.set $c_active_fg (call $rgb (i32.const 0x4631C9)))
        (global.set $c_field (call $rgb (i32.const 0xFFFFFF)))
        (global.set $c_thumb (call $rgb (i32.const 0xC4C8D0)))
        ;; dark text on white reads thin with linear coverage; thicken a little
        (global.set $emb (f32.const 0.12)))))

  ;; ---------------------------------------------------------------------
  ;; Block styles: 32 bytes per block type, sizes in CSS px
  ;;   +0 font size  +4 line height (x size)  +8 face  +12 indent
  ;;   +16 space before  +20 space after  +24 colour (0 text, 1 muted)
  ;;   +28 space between two blocks of this type, -1 = use before/after
  ;; ---------------------------------------------------------------------

  (func $def_style (param $t i32) (param $size f32) (param $lh f32) (param $face i32) (param $indent f32)
                   (param $before f32) (param $after f32) (param $color i32) (param $tight f32)
    (local $a i32)
    (local.set $a (i32.add (global.get $STYLES) (i32.shl (local.get $t) (i32.const 5))))
    (f32.store (local.get $a) (local.get $size))
    (f32.store offset=4 (local.get $a) (local.get $lh))
    (i32.store offset=8 (local.get $a) (local.get $face))
    (f32.store offset=12 (local.get $a) (local.get $indent))
    (f32.store offset=16 (local.get $a) (local.get $before))
    (f32.store offset=20 (local.get $a) (local.get $after))
    (i32.store offset=24 (local.get $a) (local.get $color))
    (f32.store offset=28 (local.get $a) (local.get $tight)))

  (func $init_styles
    ;;              type size          lh             face        indent         before         after          colour      tight
    (call $def_style (i32.const 0) (f32.const 18) (f32.const 1.6) (i32.const 0) (f32.const 0)  (f32.const 0)  (f32.const 14) (i32.const 0) (f32.const -1))
    (call $def_style (i32.const 1) (f32.const 31) (f32.const 1.22) (i32.const 1) (f32.const 0) (f32.const 28) (f32.const 10) (i32.const 0) (f32.const -1))
    (call $def_style (i32.const 2) (f32.const 24) (f32.const 1.3) (i32.const 1) (f32.const 0)  (f32.const 24) (f32.const 8)  (i32.const 0) (f32.const -1))
    (call $def_style (i32.const 3) (f32.const 20) (f32.const 1.35) (i32.const 1) (f32.const 0) (f32.const 18) (f32.const 6)  (i32.const 0) (f32.const -1))
    (call $def_style (i32.const 4) (f32.const 18) (f32.const 1.6) (i32.const 0) (f32.const 22) (f32.const 0)  (f32.const 14) (i32.const 1) (f32.const 6))
    (call $def_style (i32.const 5) (f32.const 18) (f32.const 1.6) (i32.const 0) (f32.const 28) (f32.const 0)  (f32.const 14) (i32.const 0) (f32.const 4))
    (call $def_style (i32.const 6) (f32.const 18) (f32.const 1.6) (i32.const 0) (f32.const 28) (f32.const 0)  (f32.const 14) (i32.const 0) (f32.const 4))
    (call $def_style (i32.const 7) (f32.const 18) (f32.const 1.6) (i32.const 0) (f32.const 30) (f32.const 0)  (f32.const 14) (i32.const 0) (f32.const 4))
    (call $def_style (i32.const 8) (f32.const 15) (f32.const 1.55) (i32.const 4) (f32.const 18) (f32.const 0) (f32.const 14) (i32.const 0) (f32.const 0)))

  (func $style (param $t i32) (result i32)
    (i32.add (global.get $STYLES)
      (i32.shl (select (local.get $t) (i32.const 0) (i32.le_u (local.get $t) (i32.const 8))) (i32.const 5))))

  ;; CSS px to device px
  (func $px (param $css f32) (result i32)
    (i32.trunc_sat_f32_s (f32.nearest (f32.mul (local.get $css) (global.get $scale)))))

  ;; ---------------------------------------------------------------------
  ;; Interface strings
  ;; ---------------------------------------------------------------------

  (func $index_ui_strings
    (local $p i32) (local $s i32) (local $k i32) (local $row i32)
    (local.set $p (global.get $UISTR))
    (local.set $s (global.get $UISTR))
    (block $done
      (loop $scan
        (if (i32.eqz (i32.load8_u (local.get $p)))
          (then
            (br_if $done (i32.eq (local.get $p) (local.get $s)))
            (local.set $row (i32.add (global.get $UITAB) (i32.shl (local.get $k) (i32.const 2))))
            (i32.store16 (local.get $row) (i32.sub (local.get $s) (global.get $UISTR)))
            (i32.store16 offset=2 (local.get $row) (i32.sub (local.get $p) (local.get $s)))
            (local.set $k (i32.add (local.get $k) (i32.const 1)))
            (local.set $s (i32.add (local.get $p) (i32.const 1)))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $scan))))

  (func $ui_str (param $k i32) (result i32)
    (i32.add (global.get $UISTR) (i32.load16_u (i32.add (global.get $UITAB) (i32.shl (local.get $k) (i32.const 2))))))

  (func $ui_len (param $k i32) (result i32)
    (i32.load16_u offset=2 (i32.add (global.get $UITAB) (i32.shl (local.get $k) (i32.const 2)))))

  ;; code point for an interface string byte
  (func $ui_cp (param $b i32) (result i32)
    (select (i32.const 0x2022) (local.get $b) (i32.eq (local.get $b) (i32.const 1))))

  ;; ---------------------------------------------------------------------
  ;; Toolbar model. A button is 32 bytes:
  ;;   +0 x  +4 y  +8 w  +12 h  +16 kind  +20 value  +24 label
  ;;   +28 face | decoration << 8 | starts a group << 16
  ;; kind 1 toggles marks, 2 sets a block type, 3 is a command
  ;; (1 link, 2 undo, 3 redo). Decoration 1 underline, 2 strike, 3 checkbox.
  ;; ---------------------------------------------------------------------

  (func $def_btn (param $kind i32) (param $value i32) (param $label i32) (param $face i32) (param $deco i32) (param $group i32)
    (local $b i32)
    (local.set $b (i32.add (global.get $BTNS) (i32.shl (global.get $nbtns) (i32.const 5))))
    (i32.store offset=16 (local.get $b) (local.get $kind))
    (i32.store offset=20 (local.get $b) (local.get $value))
    (i32.store offset=24 (local.get $b) (local.get $label))
    (i32.store offset=28 (local.get $b)
      (i32.or (local.get $face) (i32.or (i32.shl (local.get $deco) (i32.const 8)) (i32.shl (local.get $group) (i32.const 16)))))
    (global.set $nbtns (i32.add (global.get $nbtns) (i32.const 1))))

  (func $init_buttons
    (global.set $nbtns (i32.const 0))
    ;;             kind          value          label          face          deco          group
    (call $def_btn (i32.const 1) (i32.const 1)  (i32.const 0)  (i32.const 1) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 1) (i32.const 2)  (i32.const 1)  (i32.const 2) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 1) (i32.const 4)  (i32.const 2)  (i32.const 5) (i32.const 1) (i32.const 0))
    (call $def_btn (i32.const 1) (i32.const 8)  (i32.const 3)  (i32.const 5) (i32.const 2) (i32.const 0))
    (call $def_btn (i32.const 1) (i32.const 16) (i32.const 4)  (i32.const 4) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 3) (i32.const 1)  (i32.const 5)  (i32.const 5) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 2) (i32.const 1)  (i32.const 6)  (i32.const 5) (i32.const 0) (i32.const 1))
    (call $def_btn (i32.const 2) (i32.const 2)  (i32.const 7)  (i32.const 5) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 2) (i32.const 3)  (i32.const 8)  (i32.const 5) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 2) (i32.const 4)  (i32.const 9)  (i32.const 5) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 2) (i32.const 5)  (i32.const 10) (i32.const 5) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 2) (i32.const 6)  (i32.const 11) (i32.const 5) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 2) (i32.const 7)  (i32.const 12) (i32.const 5) (i32.const 3) (i32.const 0))
    (call $def_btn (i32.const 2) (i32.const 8)  (i32.const 13) (i32.const 4) (i32.const 0) (i32.const 0))
    (call $def_btn (i32.const 3) (i32.const 2)  (i32.const 14) (i32.const 5) (i32.const 0) (i32.const 1))
    (call $def_btn (i32.const 3) (i32.const 3)  (i32.const 15) (i32.const 5) (i32.const 0) (i32.const 0)))

  ;; Button label size in device px.
  (func $btn_size (param $face i32) (result f32)
    (f32.mul (global.get $scale) (select (f32.const 15) (f32.const 13.5) (i32.lt_u (local.get $face) (i32.const 4)))))

  ;; Place the buttons in rows that fit the window; sets $tb_h.
  (func $layout_toolbar
    (local $i i32) (local $b i32) (local $x i32) (local $y i32) (local $w i32) (local $h i32)
    (local $gap i32) (local $sep i32) (local $margin i32) (local $face i32)
    (local.set $h (call $px (f32.const 30)))
    (local.set $gap (call $px (f32.const 3)))
    (local.set $sep (call $px (f32.const 14)))
    (local.set $margin (call $px (f32.const 10)))
    (local.set $x (local.get $margin))
    (local.set $y (call $px (f32.const 7)))
    (block $done
      (loop $each
        (br_if $done (i32.ge_u (local.get $i) (global.get $nbtns)))
        (local.set $b (i32.add (global.get $BTNS) (i32.shl (local.get $i) (i32.const 5))))
        (local.set $face (i32.and (i32.load offset=28 (local.get $b)) (i32.const 0xFF)))
        (local.set $w
          (i32.add
            (i32.trunc_sat_f32_s (f32.ceil
              (call $str_width (i32.load offset=24 (local.get $b)) (local.get $face) (call $btn_size (local.get $face)))))
            (call $px (f32.const 18))))
        ;; room for the checkbox icon
        (if (i32.eq (i32.and (i32.shr_u (i32.load offset=28 (local.get $b)) (i32.const 8)) (i32.const 0xFF)) (i32.const 3))
          (then (local.set $w (i32.add (local.get $w) (call $px (f32.const 18))))))
        (if (i32.lt_s (local.get $w) (call $px (f32.const 32))) (then (local.set $w (call $px (f32.const 32)))))
        (if (i32.and (i32.ne (i32.and (i32.shr_u (i32.load offset=28 (local.get $b)) (i32.const 16)) (i32.const 1)) (i32.const 0))
                     (i32.gt_u (local.get $i) (i32.const 0)))
          (then (local.set $x (i32.add (local.get $x) (local.get $sep)))))
        ;; wrap to a new row
        (if (i32.and (i32.gt_s (i32.add (local.get $x) (local.get $w)) (i32.sub (global.get $W) (local.get $margin)))
                     (i32.gt_s (local.get $x) (local.get $margin)))
          (then
            (local.set $x (local.get $margin))
            (local.set $y (i32.add (local.get $y) (i32.add (local.get $h) (call $px (f32.const 4)))))))
        (i32.store (local.get $b) (local.get $x))
        (i32.store offset=4 (local.get $b) (local.get $y))
        (i32.store offset=8 (local.get $b) (local.get $w))
        (i32.store offset=12 (local.get $b) (local.get $h))
        (local.set $x (i32.add (local.get $x) (i32.add (local.get $w) (local.get $gap))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $each)))
    (global.set $tb_h (i32.add (i32.add (local.get $y) (local.get $h)) (call $px (f32.const 8)))))

  ;; Index of the toolbar button at (x, y), or -1.
  (func $button_at (param $x i32) (param $y i32) (result i32)
    (local $i i32) (local $b i32)
    (block $done
      (loop $each
        (br_if $done (i32.ge_u (local.get $i) (global.get $nbtns)))
        (local.set $b (i32.add (global.get $BTNS) (i32.shl (local.get $i) (i32.const 5))))
        (if (i32.and
              (i32.and (i32.ge_s (local.get $x) (i32.load (local.get $b)))
                       (i32.lt_s (local.get $x) (i32.add (i32.load (local.get $b)) (i32.load offset=8 (local.get $b)))))
              (i32.and (i32.ge_s (local.get $y) (i32.load offset=4 (local.get $b)))
                       (i32.lt_s (local.get $y) (i32.add (i32.load offset=4 (local.get $b)) (i32.load offset=12 (local.get $b))))))
          (then (return (local.get $i))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $each)))
    (i32.const -1))

  ;; ---------------------------------------------------------------------
  ;; Geometry
  ;; ---------------------------------------------------------------------

  ;; Recompute everything that depends on the window size or the link bar.
  (func $layout_view
    (local $pad i32) (local $maxw i32)
    (call $layout_toolbar)
    (global.set $lb_h (select (call $px (f32.const 44)) (i32.const 0) (global.get $link_open)))
    (global.set $view_top (i32.add (global.get $tb_h) (global.get $lb_h)))
    (global.set $view_h (i32.sub (global.get $H) (global.get $view_top)))
    (if (i32.lt_s (global.get $view_h) (i32.const 1)) (then (global.set $view_h (i32.const 1))))
    (global.set $strip_w (call $px (f32.const 10)))
    (local.set $pad (select (call $px (f32.const 18)) (call $px (f32.const 44))
                            (i32.lt_s (global.get $W) (call $px (f32.const 640)))))
    (local.set $maxw (call $px (f32.const 700)))
    (global.set $col_w (i32.sub (i32.sub (global.get $W) (global.get $strip_w)) (i32.shl (local.get $pad) (i32.const 1))))
    (if (i32.gt_s (global.get $col_w) (local.get $maxw)) (then (global.set $col_w (local.get $maxw))))
    (if (i32.lt_s (global.get $col_w) (call $px (f32.const 80))) (then (global.set $col_w (call $px (f32.const 80)))))
    (global.set $col_x (i32.shr_s (i32.sub (i32.sub (global.get $W) (global.get $strip_w)) (global.get $col_w)) (i32.const 1)))
    (global.set $dirty (i32.const 1))
    (global.set $full (i32.const 1)))

  ;; Read the font atlas header.
  (func $init_font
    (global.set $E (f32.convert_i32_u (i32.load offset=4 (global.get $FONT))))
    (global.set $S (f32.convert_i32_u (i32.load offset=8 (global.get $FONT))))
    (global.set $cmap (i32.add (global.get $FONT) (i32.load offset=20 (global.get $FONT))))
    (global.set $faces (i32.add (global.get $FONT) (i32.load offset=24 (global.get $FONT))))
    (global.set $kern (i32.add (global.get $FONT) (i32.load offset=28 (global.get $FONT))))
    (global.set $cmap_n (i32.load offset=32 (global.get $FONT))))
