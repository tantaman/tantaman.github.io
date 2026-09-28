;; ui-input.wat -- the canvas module's exports: set-up, input events,
;; clipboard and document access. Every event export ends by painting, and
;; painting tells the host which rectangles to present. Touch input is in
;; ui-touch.wat.
;;
;; Keys arrive as codes independent of the host:
;;   1 Backspace  2 Delete  3 Enter  4 Tab  5 Escape  6 Left  7 Right
;;   8 Up  9 Down  10 Home  11 End  12 PageUp  13 PageDown
;;   32..126      the key's character (letters lower case, digits by key
;;                position), sent with modifiers for shortcuts
;; Modifiers: 1 Shift, 2 Ctrl, 4 Alt, 8 Meta (Cmd).
;; Plain typing arrives through text_input, not key_down.

  ;; ---------------------------------------------------------------------
  ;; Set-up
  ;; ---------------------------------------------------------------------

  ;; flags: 1 macOS shortcuts, 2 dark theme, 4 framebuffer as 0x00RRGGBB words
  (func (export "init") (param $w i32) (param $h i32) (param $scale f32) (param $flags i32)
    ;; the engine's scratch moves after the interface regions
    (global.set $OUT (global.get $UI_OUT))
    (global.set $out_cap (global.get $UI_OUT_END))
    (call $index_ui_strings)
    (call $init_font)
    (call $init_styles)
    (call $init_buttons)
    (global.set $mac (i32.and (local.get $flags) (i32.const 1)))
    (global.set $dark (i32.and (i32.shr_u (local.get $flags) (i32.const 1)) (i32.const 1)))
    (global.set $fmt (i32.and (i32.shr_u (local.get $flags) (i32.const 2)) (i32.const 1)))
    (call $apply_theme)
    (call $resize (local.get $w) (local.get $h) (local.get $scale)))

  (func $resize (export "resize") (param $w i32) (param $h i32) (param $scale f32)
    (global.set $W (select (local.get $w) (i32.const 1) (i32.gt_s (local.get $w) (i32.const 0))))
    (global.set $H (select (local.get $h) (i32.const 1) (i32.gt_s (local.get $h) (i32.const 0))))
    (global.set $scale (f32.max (f32.const 0.25) (local.get $scale)))
    (call $grow_to (i32.add (global.get $FB) (i32.shl (i32.mul (global.get $W) (global.get $H)) (i32.const 2))))
    (call $cache_clear)
    (call $layout_view)
    (global.set $ready (i32.const 1))
    (global.set $reveal (i32.const 1))
    (call $paint))

  (func (export "set_theme") (param $dark i32)
    (global.set $dark (i32.ne (local.get $dark) (i32.const 0)))
    (call $apply_theme)
    (call $cache_clear)
    (global.set $full (i32.const 1))
    (call $paint))

  (func (export "set_focus") (param $focused i32) (param $now i32)
    (global.set $now (local.get $now))
    (global.set $focused (i32.ne (local.get $focused) (i32.const 0)))
    (global.set $blink_t (local.get $now))
    (global.set $drag (i32.const 0))
    (if (i32.eqz (global.get $focused)) (then (call $touch_off)))
    (call $paint))

  ;; Repaint everything (the host lost its copy of the pixels).
  (func (export "repaint")
    (global.set $full (i32.const 1))
    (call $paint))

  (func (export "fb_ptr") (result i32) (global.get $FB))
  (func (export "scroll_top") (result i32) (global.get $scroll))
  (func (export "out_ptr") (result i32) (global.get $OUT))

  ;; Milliseconds until the next tick is needed (caret blink, or touch: a
  ;; long press, momentum, scrolling at an edge), or -1.
  (func (export "tick") (param $now i32) (result i32)
    (local $el i32) (local $wait i32)
    (global.set $now (local.get $now))
    (local.set $wait (call $touch_tick))
    (call $paint)
    (if (i32.eqz (global.get $focused)) (then (return (local.get $wait))))
    (if (i32.and (i32.ne (global.get $anchor) (global.get $focus)) (i32.eqz (global.get $link_open)))
      (then (return (local.get $wait))))
    (local.set $el (i32.sub (local.get $now) (global.get $blink_t)))
    (if (i32.lt_s (local.get $el) (i32.const 0)) (then (return (call $sooner (local.get $wait) (i32.const 530)))))
    (call $sooner (local.get $wait) (i32.sub (i32.const 530) (i32.rem_u (local.get $el) (i32.const 530)))))

  ;; ---------------------------------------------------------------------
  ;; Document
  ;; ---------------------------------------------------------------------

  ;; Replace the document with $n UTF-16 units of Markdown written at OUT.
  (func (export "load_markdown") (param $n i32)
    (call $reset)
    (if (local.get $n) (then (drop (call $paste_markdown (local.get $n)))))
    (call $clear_history)
    (call $set_selection (i32.const 0) (i32.const 0))
    (call $touch_off)
    (global.set $fling (i32.const 0))
    (global.set $scroll (i32.const 0))
    (global.set $affinity (i32.const 0))
    (global.set $goal_x (f32.const -1))
    (global.set $dirty (i32.const 1))
    (global.set $full (i32.const 1))
    (call $paint))

  ;; The document as Markdown at OUT; returns its length in units.
  (func (export "markdown") (result i32)
    (call $export_markdown (i32.const 0) (i32.sub (call $len) (i32.const 1))))

  ;; ---------------------------------------------------------------------
  ;; Clipboard: the host reads the text these write at OUT.
  ;; ---------------------------------------------------------------------

  (func (export "copy_text") (result i32)
    (if (i32.eq (global.get $anchor) (global.get $focus)) (then (return (i32.const 0))))
    (call $export_text (call $smin) (call $smax)))

  (func (export "copy_html") (result i32)
    (if (i32.eq (global.get $anchor) (global.get $focus)) (then (return (i32.const 0))))
    (call $export_html (call $smin) (call $smax)))

  (func (export "cut") (param $now i32)
    (global.set $now (local.get $now))
    (global.set $menu (i32.const 0))
    (if (i32.ne (global.get $anchor) (global.get $focus))
      (then (drop (call $delete_backward)) (call $edited)))
    (call $paint))

  ;; $n units of pasted text at OUT. Unless $plain, text that looks like
  ;; Markdown is parsed as Markdown.
  (func (export "paste") (param $n i32) (param $plain i32) (param $now i32)
    (global.set $now (local.get $now))
    (global.set $menu (i32.const 0))
    (if (global.get $link_open)
      (then (call $link_append (local.get $n)) (call $paint) (return)))
    (global.set $pre_len (i32.const 0))
    (if (i32.or (local.get $plain)
          (i32.or (i32.eq (i32.and (call $sel_block) (i32.const 15)) (i32.const 8))
                  (i32.eqz (call $looks_like_markdown (local.get $n)))))
      (then (drop (call $insert_text (local.get $n))))
      (else (drop (call $paste_markdown (local.get $n)))))
    (call $edited)
    (call $paint))

  ;; Headings, list or quote markers at a line start, fences, **, __, ~~,
  ;; `code` or ](links).
  (func $looks_like_markdown (param $n i32) (result i32)
    (local $i i32) (local $c i32) (local $next i32) (local $start i32)
    (local.set $start (i32.const 1))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $n)))
        (local.set $c (call $u (i32.add (global.get $OUT) (i32.shl (local.get $i) (i32.const 1)))))
        (local.set $next (i32.const 0))
        (if (i32.lt_u (i32.add (local.get $i) (i32.const 1)) (local.get $n))
          (then (local.set $next (call $u (i32.add (global.get $OUT) (i32.shl (i32.add (local.get $i) (i32.const 1)) (i32.const 1)))))))
        (if (local.get $start)
          (then
            (if (i32.or (i32.eq (local.get $c) (i32.const 35)) (i32.eq (local.get $c) (i32.const 62))) (then (return (i32.const 1))))
            (if (i32.and (i32.eq (local.get $next) (i32.const 32))
                  (i32.or (i32.or (i32.eq (local.get $c) (i32.const 45)) (i32.eq (local.get $c) (i32.const 42))) (i32.eq (local.get $c) (i32.const 43))))
              (then (return (i32.const 1))))
            (if (i32.and (i32.lt_u (i32.sub (local.get $c) (i32.const 48)) (i32.const 10)) (i32.eq (local.get $next) (i32.const 46)))
              (then (return (i32.const 1))))))
        (if (i32.eq (local.get $c) (i32.const 96)) (then (return (i32.const 1))))
        (if (i32.and (i32.eq (local.get $c) (local.get $next))
              (i32.or (i32.or (i32.eq (local.get $c) (i32.const 42)) (i32.eq (local.get $c) (i32.const 95))) (i32.eq (local.get $c) (i32.const 126))))
          (then (return (i32.const 1))))
        (if (i32.and (i32.eq (local.get $c) (i32.const 93)) (i32.eq (local.get $next) (i32.const 40))) (then (return (i32.const 1))))
        (local.set $start (i32.eq (local.get $c) (i32.const 10)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (i32.const 0))

  ;; ---------------------------------------------------------------------
  ;; After an edit or a caret move
  ;; ---------------------------------------------------------------------

  (func $edited
    (global.set $dirty (i32.const 1))
    (global.set $reveal (i32.const 1))
    (global.set $blink_t (global.get $now))
    (global.set $goal_x (f32.const -1))
    (global.set $affinity (i32.const 0)))

  (func $moved
    (global.set $reveal (i32.const 1))
    (global.set $blink_t (global.get $now)))

  ;; Move the focus to $p, extending the selection when $extend.
  (func $go (param $p i32) (param $extend i32)
    (call $set_selection (select (global.get $anchor) (local.get $p) (local.get $extend)) (local.get $p))
    (call $moved))

  ;; ---------------------------------------------------------------------
  ;; Text
  ;; ---------------------------------------------------------------------

  ;; $n UTF-16 units of typed text at OUT (a keystroke or an IME commit).
  (func (export "text_input") (param $n i32) (param $now i32)
    (global.set $now (local.get $now))
    (global.set $menu (i32.const 0))
    (if (global.get $link_open)
      (then (call $link_append (local.get $n)) (call $paint) (return)))
    (global.set $pre_len (i32.const 0))
    (drop (call $insert_text (local.get $n)))
    (call $edited)
    (call $paint))

  ;; IME composition in progress: $n units at OUT, shown at the caret until
  ;; text_input commits it. $n = 0 ends it.
  (func (export "ime_preedit") (param $n i32) (param $now i32)
    (global.set $now (local.get $now))
    (if (i32.gt_u (local.get $n) (global.get $PRE_CAP)) (then (local.set $n (global.get $PRE_CAP))))
    (memory.copy (global.get $PREEDIT) (global.get $OUT) (i32.shl (local.get $n) (i32.const 1)))
    (global.set $pre_len (local.get $n))
    (global.set $blink_t (local.get $now))
    (if (local.get $n) (then (global.set $menu (i32.const 0))))
    (call $paint))

  ;; ---------------------------------------------------------------------
  ;; Keyboard
  ;; ---------------------------------------------------------------------

  ;; One character left or right, never splitting a surrogate pair.
  (func $step (param $p i32) (param $dir i32) (result i32)
    (if (i32.lt_s (local.get $dir) (i32.const 0))
      (then
        (if (i32.eqz (local.get $p)) (then (return (i32.const 0))))
        (local.set $p (i32.sub (local.get $p) (i32.const 1)))
        (if (i32.and (i32.gt_u (local.get $p) (i32.const 0))
                     (i32.eq (i32.and (call $get (local.get $p)) (i32.const 0xFC00)) (i32.const 0xDC00)))
          (then (local.set $p (i32.sub (local.get $p) (i32.const 1)))))
        (return (local.get $p))))
    (if (i32.ge_u (i32.add (local.get $p) (i32.const 1)) (call $len)) (then (return (local.get $p))))
    (local.set $p (i32.add (local.get $p) (i32.const 1)))
    (if (i32.eq (i32.and (call $get (local.get $p)) (i32.const 0xFC00)) (i32.const 0xDC00))
      (then (local.set $p (i32.add (local.get $p) (i32.const 1)))))
    (local.get $p))

  ;; One word left or right: skip spaces, then a run of one character class.
  ;; At a block's edge, step into the next block.
  (func $word_step (param $p i32) (param $dir i32) (result i32)
    (local $bs i32) (local $be i32) (local $k i32)
    (local.set $bs (call $block_start (local.get $p)))
    (local.set $be (call $nl_after (local.get $p)))
    (if (i32.lt_s (local.get $dir) (i32.const 0))
      (then
        (if (i32.eq (local.get $p) (local.get $bs)) (then (return (call $step (local.get $p) (i32.const -1)))))
        (block $d (loop $l
          (br_if $d (i32.le_u (local.get $p) (local.get $bs)))
          (br_if $d (call $char_class (call $get (i32.sub (local.get $p) (i32.const 1)))))
          (local.set $p (i32.sub (local.get $p) (i32.const 1)))
          (br $l)))
        (if (i32.gt_u (local.get $p) (local.get $bs))
          (then
            (local.set $k (call $char_class (call $get (i32.sub (local.get $p) (i32.const 1)))))
            (block $d2 (loop $l2
              (br_if $d2 (i32.le_u (local.get $p) (local.get $bs)))
              (br_if $d2 (i32.ne (call $char_class (call $get (i32.sub (local.get $p) (i32.const 1)))) (local.get $k)))
              (local.set $p (i32.sub (local.get $p) (i32.const 1)))
              (br $l2)))))
        (return (local.get $p))))
    (if (i32.eq (local.get $p) (local.get $be)) (then (return (call $step (local.get $p) (i32.const 1)))))
    (block $d3 (loop $l3
      (br_if $d3 (i32.ge_u (local.get $p) (local.get $be)))
      (br_if $d3 (call $char_class (call $get (local.get $p))))
      (local.set $p (i32.add (local.get $p) (i32.const 1)))
      (br $l3)))
    (if (i32.lt_u (local.get $p) (local.get $be))
      (then
        (local.set $k (call $char_class (call $get (local.get $p))))
        (block $d4 (loop $l4
          (br_if $d4 (i32.ge_u (local.get $p) (local.get $be)))
          (br_if $d4 (i32.ne (call $char_class (call $get (local.get $p))) (local.get $k)))
          (local.set $p (i32.add (local.get $p) (i32.const 1)))
          (br $l4)))))
    (local.get $p))

  ;; Left/Right: collapse a selection, or move by character or word.
  (func $move_h (param $dir i32) (param $word i32) (param $extend i32)
    (local $p i32)
    (global.set $goal_x (f32.const -1))
    (if (i32.and (i32.eqz (local.get $extend)) (i32.ne (global.get $anchor) (global.get $focus)))
      (then
        (global.set $affinity (i32.const 0))
        (call $go (select (call $smin) (call $smax) (i32.lt_s (local.get $dir) (i32.const 0))) (i32.const 0))
        (return)))
    (local.set $p
      (if (result i32) (local.get $word)
        (then (call $word_step (global.get $focus) (local.get $dir)))
        (else (call $step (global.get $focus) (local.get $dir)))))
    (global.set $affinity (i32.const 0))
    (call $go (local.get $p) (local.get $extend)))

  ;; Up/Down by visual line, keeping the column in $goal_x.
  (func $move_v (param $dir i32) (param $extend i32)
    (local $j i32)
    (call $caret_geom (global.get $focus))
    (if (f32.lt (global.get $goal_x) (f32.const 0)) (then (global.set $goal_x (global.get $g_x))))
    (local.set $j (i32.add (global.get $g_line) (local.get $dir)))
    (if (i32.lt_s (local.get $j) (i32.const 0))
      (then (global.set $affinity (i32.const 0)) (call $go (i32.const 0) (local.get $extend)) (return)))
    (if (i32.ge_s (local.get $j) (global.get $nlines))
      (then (global.set $affinity (i32.const 0)) (call $go (i32.sub (call $len) (i32.const 1)) (local.get $extend)) (return)))
    (call $go (call $pos_in_line (local.get $j) (global.get $goal_x)) (local.get $extend)))

  ;; Page Up/Down: move the caret a screenful and scroll with it.
  (func $move_page (param $dir i32) (param $extend i32)
    (local $a i32) (local $y i32) (local $d i32)
    (call $caret_geom (global.get $focus))
    (if (f32.lt (global.get $goal_x) (f32.const 0)) (then (global.set $goal_x (global.get $g_x))))
    (local.set $a (call $line_addr (global.get $g_line)))
    (local.set $d (i32.mul (local.get $dir) (i32.sub (global.get $view_h) (call $px (f32.const 40)))))
    (local.set $y (i32.add (i32.add (i32.load offset=8 (local.get $a)) (i32.shr_s (i32.load offset=12 (local.get $a)) (i32.const 1)))
                           (local.get $d)))
    (global.set $scroll (i32.add (global.get $scroll) (local.get $d)))
    (call $go (call $pos_in_line (call $line_at (local.get $y)) (global.get $goal_x)) (local.get $extend)))

  ;; Home/End of the visual line.
  (func $line_edge (param $end i32) (param $extend i32)
    (local $a i32)
    (global.set $goal_x (f32.const -1))
    (call $caret_geom (global.get $focus))
    (local.set $a (call $line_addr (global.get $g_line)))
    (if (i32.eqz (local.get $end))
      (then (global.set $affinity (i32.const 0)) (call $go (i32.load (local.get $a)) (local.get $extend)) (return)))
    ;; the end of a wrapped line is the next line's start, drawn on this line
    (global.set $affinity (i32.eqz (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x200))))
    (call $go (i32.load offset=4 (local.get $a)) (local.get $extend)))

  ;; Cmd-Backspace / Cmd-Delete: delete to the edge of the visual line.
  (func $delete_to_edge (param $end i32)
    (local $a i32) (local $edge i32)
    (if (i32.ne (global.get $anchor) (global.get $focus)) (then (drop (call $delete_backward)) (return)))
    (call $caret_geom (global.get $focus))
    (local.set $a (call $line_addr (global.get $g_line)))
    (local.set $edge (i32.load (local.get $a)))
    (if (local.get $end) (then (local.set $edge (i32.load offset=4 (local.get $a)))))
    (if (i32.eq (local.get $edge) (global.get $focus))
      (then
        (if (local.get $end) (then (drop (call $delete_forward))) (else (drop (call $delete_backward))))
        (return)))
    (call $set_selection (global.get $focus) (local.get $edge))
    (drop (call $delete_backward)))

  ;; Returns 1 when the key was handled (the host should swallow it).
  (func (export "key_down") (param $key i32) (param $mods i32) (param $now i32) (result i32)
    (local $shift i32) (local $mod i32) (local $word i32) (local $alt i32) (local $handled i32) (local $edit i32)
    (global.set $now (local.get $now))
    (local.set $shift (i32.and (local.get $mods) (i32.const 1)))
    (local.set $alt (i32.ne (i32.and (local.get $mods) (i32.const 4)) (i32.const 0)))
    (local.set $mod (i32.ne (i32.and (local.get $mods) (select (i32.const 8) (i32.const 2) (global.get $mac))) (i32.const 0)))
    ;; word-wise: Option on a Mac, Ctrl elsewhere
    (local.set $word (select (local.get $alt) (i32.ne (i32.and (local.get $mods) (i32.const 2)) (i32.const 0)) (global.get $mac)))
    (global.set $menu (i32.const 0))
    (if (global.get $link_open)
      (then (return (call $link_key (local.get $key) (local.get $mods)))))
    (local.set $handled (i32.const 1))
    (block $done
      ;; movement
      (if (i32.eq (local.get $key) (i32.const 6))
        (then
          (if (i32.and (global.get $mac) (local.get $mod))
            (then (call $line_edge (i32.const 0) (local.get $shift)))
            (else (call $move_h (i32.const -1) (local.get $word) (local.get $shift))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 7))
        (then
          (if (i32.and (global.get $mac) (local.get $mod))
            (then (call $line_edge (i32.const 1) (local.get $shift)))
            (else (call $move_h (i32.const 1) (local.get $word) (local.get $shift))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 8))
        (then
          (if (i32.and (global.get $mac) (local.get $mod))
            (then (global.set $affinity (i32.const 0)) (call $go (i32.const 0) (local.get $shift)))
            (else (call $move_v (i32.const -1) (local.get $shift))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 9))
        (then
          (if (i32.and (global.get $mac) (local.get $mod))
            (then (global.set $affinity (i32.const 0)) (call $go (i32.sub (call $len) (i32.const 1)) (local.get $shift)))
            (else (call $move_v (i32.const 1) (local.get $shift))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 10))
        (then
          (if (local.get $mod)
            (then (global.set $affinity (i32.const 0)) (call $go (i32.const 0) (local.get $shift)))
            (else (call $line_edge (i32.const 0) (local.get $shift))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 11))
        (then
          (if (local.get $mod)
            (then (global.set $affinity (i32.const 0)) (call $go (i32.sub (call $len) (i32.const 1)) (local.get $shift)))
            (else (call $line_edge (i32.const 1) (local.get $shift))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 12)) (then (call $move_page (i32.const -1) (local.get $shift)) (br $done)))
      (if (i32.eq (local.get $key) (i32.const 13)) (then (call $move_page (i32.const 1) (local.get $shift)) (br $done)))
      ;; editing keys
      (local.set $edit (i32.const 1))
      (if (i32.eq (local.get $key) (i32.const 1))
        (then
          (if (i32.and (global.get $mac) (local.get $mod))
            (then (call $delete_to_edge (i32.const 0)))
            (else
              (if (local.get $word)
                (then (drop (call $delete_word_backward)))
                (else (drop (call $delete_backward))))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 2))
        (then
          (if (i32.and (global.get $mac) (local.get $mod))
            (then (call $delete_to_edge (i32.const 1)))
            (else
              (if (local.get $word)
                (then (drop (call $delete_word_forward)))
                (else (drop (call $delete_forward))))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 3))
        (then (drop (call $insert_paragraph)) (br $done)))
      (if (i32.eq (local.get $key) (i32.const 4))
        (then
          ;; a tab character in code; elsewhere Tab is the host's (focus)
          (if (i32.and (i32.eqz (local.get $mods)) (i32.eq (i32.and (call $sel_block) (i32.const 15)) (i32.const 8)))
            (then
              (i32.store16 (call $scratch (i32.const 2)) (i32.const 9))
              (drop (call $insert_text (i32.const 1))))
            (else (local.set $handled (i32.const 0)) (local.set $edit (i32.const 0))))
          (br $done)))
      (if (i32.eq (local.get $key) (i32.const 5))
        (then
          (local.set $edit (i32.const 0))
          (call $go (global.get $focus) (i32.const 0))
          (br $done)))
      ;; shortcuts
      (if (i32.and (local.get $mod) (i32.eqz (local.get $alt)))
        (then
          (if (i32.eq (local.get $key) (i32.const 97)) ;; a: select all
            (then
              (local.set $edit (i32.const 0))
              (call $set_selection (i32.const 0) (i32.sub (call $len) (i32.const 1)))
              (call $moved)
              (br $done)))
          (if (i32.eq (local.get $key) (i32.const 122)) ;; z / shift-z
            (then (drop (if (result i32) (local.get $shift) (then (call $redo)) (else (call $undo)))) (br $done)))
          (if (i32.and (i32.eq (local.get $key) (i32.const 121)) (i32.eqz (global.get $mac))) ;; y
            (then (drop (call $redo)) (br $done)))
          (if (i32.eqz (local.get $shift))
            (then
              (if (i32.eq (local.get $key) (i32.const 98)) (then (drop (call $toggle_mark (i32.const 1))) (br $done)))
              (if (i32.eq (local.get $key) (i32.const 105)) (then (drop (call $toggle_mark (i32.const 2))) (br $done)))
              (if (i32.eq (local.get $key) (i32.const 117)) (then (drop (call $toggle_mark (i32.const 4))) (br $done)))
              (if (i32.eq (local.get $key) (i32.const 101)) (then (drop (call $toggle_mark (i32.const 16))) (br $done)))
              (if (i32.eq (local.get $key) (i32.const 107))
                (then (local.set $edit (i32.const 0)) (call $link_open_bar) (br $done)))))
          (if (local.get $shift)
            (then
              (if (i32.eq (local.get $key) (i32.const 120)) (then (drop (call $toggle_mark (i32.const 8))) (br $done)))
              (if (i32.eq (local.get $key) (i32.const 55)) (then (drop (call $set_block (i32.const 6))) (br $done)))
              (if (i32.eq (local.get $key) (i32.const 56)) (then (drop (call $set_block (i32.const 5))) (br $done)))
              (if (i32.eq (local.get $key) (i32.const 57)) (then (drop (call $set_block (i32.const 7))) (br $done)))))))
      (if (i32.and (local.get $mod) (local.get $alt))
        (then
          (if (i32.lt_u (i32.sub (local.get $key) (i32.const 48)) (i32.const 4))
            (then (drop (call $set_block (i32.sub (local.get $key) (i32.const 48)))) (br $done)))))
      ;; anything else (including copy, cut and paste) is the host's
      (local.set $handled (i32.const 0))
      (local.set $edit (i32.const 0)))
    (if (local.get $edit) (then (call $edited)))
    (call $paint)
    (local.get $handled))

  ;; ---------------------------------------------------------------------
  ;; Link bar
  ;; ---------------------------------------------------------------------

  (func $link_open_bar
    (local $id i32) (local $n i32)
    (local.set $id (call $link_at (global.get $focus)))
    (global.set $link_len (i32.const 0))
    (if (local.get $id)
      (then
        (local.set $n (call $link_len (local.get $id)))
        (if (i32.gt_u (local.get $n) (global.get $LINK_CAP)) (then (local.set $n (global.get $LINK_CAP))))
        (memory.copy (global.get $LINKBUF) (call $link_ptr (local.get $id)) (i32.shl (local.get $n) (i32.const 1)))
        (global.set $link_len (local.get $n))))
    (global.set $link_open (i32.const 1))
    (global.set $blink_t (global.get $now))
    (call $layout_view))

  (func $link_close
    (global.set $link_open (i32.const 0))
    (call $layout_view))

  ;; Append typed or pasted units (control characters dropped).
  (func $link_append (param $n i32)
    (local $i i32) (local $c i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $n)))
        (br_if $d (i32.ge_u (global.get $link_len) (global.get $LINK_CAP)))
        (local.set $c (call $u (i32.add (global.get $OUT) (i32.shl (local.get $i) (i32.const 1)))))
        (if (i32.ge_u (local.get $c) (i32.const 32))
          (then
            (i32.store16 (i32.add (global.get $LINKBUF) (i32.shl (global.get $link_len) (i32.const 1))) (local.get $c))
            (global.set $link_len (i32.add (global.get $link_len) (i32.const 1)))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (global.set $blink_t (global.get $now)))

  ;; Keys while the link bar is open. Enter applies (empty removes the
  ;; link), Escape cancels.
  ;; "example.com/x" becomes "https://example.com/x" and "me@example.com"
  ;; becomes "mailto:me@example.com"; scheme or relative URLs are kept.
  (func $normalize_link
    (local $i i32) (local $c i32) (local $dot i32) (local $at i32) (local $slash i32)
    ;; trim spaces
    (block $d (loop $l
      (br_if $d (i32.eqz (global.get $link_len)))
      (br_if $d (i32.ne (i32.load16_u (global.get $LINKBUF)) (i32.const 32)))
      (memory.copy (global.get $LINKBUF) (i32.add (global.get $LINKBUF) (i32.const 2))
        (i32.shl (global.get $link_len) (i32.const 1)))
      (global.set $link_len (i32.sub (global.get $link_len) (i32.const 1)))
      (br $l)))
    (block $d2 (loop $l2
      (br_if $d2 (i32.eqz (global.get $link_len)))
      (br_if $d2 (i32.ne (i32.load16_u (i32.add (global.get $LINKBUF) (i32.shl (i32.sub (global.get $link_len) (i32.const 1)) (i32.const 1))))
                         (i32.const 32)))
      (global.set $link_len (i32.sub (global.get $link_len) (i32.const 1)))
      (br $l2)))
    (if (i32.eqz (global.get $link_len)) (then (return)))
    ;; relative: starts with / # ? .
    (local.set $c (i32.load16_u (global.get $LINKBUF)))
    (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 47)) (i32.eq (local.get $c) (i32.const 35)))
                (i32.or (i32.eq (local.get $c) (i32.const 63)) (i32.eq (local.get $c) (i32.const 46))))
      (then (return)))
    (block $d3 (loop $l3
      (br_if $d3 (i32.ge_u (local.get $i) (global.get $link_len)))
      (local.set $c (i32.load16_u (i32.add (global.get $LINKBUF) (i32.shl (local.get $i) (i32.const 1)))))
      ;; a scheme before any / ? # means it is already absolute
      (if (i32.and (i32.eq (local.get $c) (i32.const 58)) (i32.eqz (local.get $slash))) (then (return)))
      (if (i32.or (i32.eq (local.get $c) (i32.const 47)) (i32.or (i32.eq (local.get $c) (i32.const 63)) (i32.eq (local.get $c) (i32.const 35))))
        (then (local.set $slash (i32.const 1))))
      (if (i32.eq (local.get $c) (i32.const 46)) (then (local.set $dot (i32.const 1))))
      (if (i32.and (i32.eq (local.get $c) (i32.const 64)) (i32.eqz (local.get $slash))) (then (local.set $at (i32.const 1))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l3)))
    (if (i32.eqz (local.get $dot)) (then (return)))
    (if (local.get $at)
      (then (call $link_prefix (i32.const 66) (i32.const 58)))   ;; "mailto" + ":"
      (else (call $link_prefix (i32.const 69) (i32.const 0)))))  ;; "https://"

  ;; Put engine string $k (and $extra, if not 0) in front of the URL.
  (func $link_prefix (param $k i32) (param $extra i32)
    (local $a i32) (local $n i32) (local $total i32) (local $i i32)
    (local.set $a (i32.add (global.get $STRTAB) (i32.shl (local.get $k) (i32.const 2))))
    (local.set $n (i32.load16_u offset=2 (local.get $a)))
    (local.set $a (i32.load16_u (local.get $a)))
    (local.set $total (i32.add (local.get $n) (i32.ne (local.get $extra) (i32.const 0))))
    (if (i32.gt_u (i32.add (global.get $link_len) (local.get $total)) (global.get $LINK_CAP)) (then (return)))
    (memory.copy (i32.add (global.get $LINKBUF) (i32.shl (local.get $total) (i32.const 1))) (global.get $LINKBUF)
      (i32.shl (global.get $link_len) (i32.const 1)))
    (block $d (loop $l
      (br_if $d (i32.ge_u (local.get $i) (local.get $n)))
      (i32.store16 (i32.add (global.get $LINKBUF) (i32.shl (local.get $i) (i32.const 1)))
        (i32.load8_u (i32.add (local.get $a) (local.get $i))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l)))
    (if (local.get $extra)
      (then (i32.store16 (i32.add (global.get $LINKBUF) (i32.shl (local.get $n) (i32.const 1))) (local.get $extra))))
    (global.set $link_len (i32.add (global.get $link_len) (local.get $total))))

  (func $link_key (param $key i32) (param $mods i32) (result i32)
    (if (i32.eq (local.get $key) (i32.const 3))
      (then
        (call $normalize_link)
        (memory.copy (call $scratch (i32.shl (global.get $link_len) (i32.const 1))) (global.get $LINKBUF)
          (i32.shl (global.get $link_len) (i32.const 1)))
        (if (i32.or (call $set_link (global.get $link_len)) (i32.eqz (global.get $link_len)))
          (then (call $link_close) (call $edited)))
        (call $paint)
        (return (i32.const 1))))
    (if (i32.eq (local.get $key) (i32.const 5))
      (then (call $link_close) (call $paint) (return (i32.const 1))))
    (if (i32.eq (local.get $key) (i32.const 1))
      (then
        (if (global.get $link_len) (then (global.set $link_len (i32.sub (global.get $link_len) (i32.const 1)))))
        (global.set $blink_t (global.get $now))
        (call $paint)
        (return (i32.const 1))))
    ;; other named keys do nothing here; characters arrive as text
    (i32.lt_u (local.get $key) (i32.const 32)))

  ;; ---------------------------------------------------------------------
  ;; Mouse
  ;; ---------------------------------------------------------------------

  (func $toolbar_action (param $i i32)
    (local $b i32) (local $kind i32) (local $v i32)
    (local.set $b (i32.add (global.get $BTNS) (i32.shl (local.get $i) (i32.const 5))))
    (local.set $kind (i32.load offset=16 (local.get $b)))
    (local.set $v (i32.load offset=20 (local.get $b)))
    (if (call $btn_disabled (local.get $b)) (then (return)))
    (if (i32.eq (local.get $kind) (i32.const 1)) (then (drop (call $toggle_mark (local.get $v))) (call $edited) (return)))
    (if (i32.eq (local.get $kind) (i32.const 2)) (then (drop (call $set_block (local.get $v))) (call $edited) (return)))
    (if (i32.eq (local.get $v) (i32.const 1))
      (then
        (if (global.get $link_open) (then (call $link_close)) (else (call $link_open_bar)))
        (return)))
    (if (i32.eq (local.get $v) (i32.const 2)) (then (drop (call $undo)) (call $edited) (return)))
    (if (i32.eq (local.get $v) (i32.const 3)) (then (drop (call $redo)) (call $edited))))

  ;; Is (x, y) on the checkbox of a todo? Returns its position, or -1.
  (func $checkbox_at (param $x i32) (param $y i32) (result i32)
    (local $i i32) (local $a i32) (local $flags i32) (local $top i32)
    (if (i32.lt_s (local.get $y) (global.get $view_top)) (then (return (i32.const -1))))
    (local.set $i (call $line_at (i32.add (i32.sub (local.get $y) (global.get $view_top)) (global.get $scroll))))
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $flags (i32.load offset=24 (local.get $a)))
    (if (i32.or (i32.ne (call $type_of_flags (local.get $flags)) (i32.const 7))
                (i32.eqz (i32.and (local.get $flags) (i32.const 0x100))))
      (then (return (i32.const -1))))
    (local.set $top (i32.add (global.get $view_top) (i32.sub (i32.load offset=8 (local.get $a)) (global.get $scroll))))
    (if (i32.and
          (i32.and (i32.ge_s (local.get $x) (global.get $col_x))
                   (i32.lt_s (local.get $x) (i32.add (global.get $col_x) (i32.load offset=20 (local.get $a)))))
          (i32.and (i32.ge_s (local.get $y) (local.get $top))
                   (i32.lt_s (local.get $y) (i32.add (local.get $top) (i32.load offset=12 (local.get $a))))))
      (then (return (i32.load (local.get $a)))))
    (i32.const -1))

  ;; Link id at a document position under the pointer, or 0.
  (func $link_under (param $p i32) (result i32)
    (local $c i32)
    (local.set $c (call $get (local.get $p)))
    (if (i32.eqz (call $is_nl (local.get $c))) (then (return (i32.shr_u (local.get $c) (i32.const 21)))))
    (i32.const 0))

  ;; scrollbar thumb geometry, shared with painting
  (global $grab (mut i32) (i32.const 0))

  (func $thumb_h (result i32)
    (local $th i32)
    (local.set $th (i32.trunc_sat_f32_s (f32.div
      (f32.mul (f32.convert_i32_s (global.get $view_h)) (f32.convert_i32_s (global.get $view_h)))
      (f32.convert_i32_s (global.get $doc_h)))))
    (select (local.get $th) (call $px (f32.const 28)) (i32.gt_s (local.get $th) (call $px (f32.const 28)))))

  (func $thumb_y (result i32)
    (i32.add (global.get $view_top)
      (i32.trunc_sat_f32_s (f32.div
        (f32.mul (f32.convert_i32_s (i32.sub (global.get $view_h) (call $thumb_h))) (f32.convert_i32_s (global.get $scroll)))
        (f32.convert_i32_s (i32.sub (global.get $doc_h) (global.get $view_h)))))))

  ;; Scroll so the thumb's grab point is at screen y.
  (func $scroll_to_thumb (param $y i32)
    (local $room i32)
    (local.set $room (i32.sub (global.get $view_h) (call $thumb_h)))
    (if (i32.le_s (local.get $room) (i32.const 0)) (then (return)))
    (global.set $scroll (i32.trunc_sat_f32_s (f32.div
      (f32.mul (f32.convert_i32_s (i32.sub (i32.sub (local.get $y) (global.get $grab)) (global.get $view_top)))
               (f32.convert_i32_s (i32.sub (global.get $doc_h) (global.get $view_h))))
      (f32.convert_i32_s (local.get $room))))))

  (func $iabs (param $v i32) (result i32)
    (select (local.get $v) (i32.sub (i32.const 0) (local.get $v)) (i32.ge_s (local.get $v) (i32.const 0))))

  (func $modkey (param $mods i32) (result i32)
    (i32.ne (i32.and (local.get $mods) (select (i32.const 8) (i32.const 2) (global.get $mac))) (i32.const 0)))

  ;; buttons: 0 primary, 1 middle, 2 secondary
  (func (export "mouse_down") (param $x i32) (param $y i32) (param $button i32) (param $mods i32) (param $now i32)
    (local $b i32) (local $p i32) (local $id i32)
    (global.set $now (local.get $now))
    (global.set $focused (i32.const 1))
    (call $touch_off)
    (if (i32.lt_s (local.get $y) (global.get $tb_h))
      (then
        (local.set $b (call $button_at (local.get $x) (local.get $y)))
        (if (i32.ge_s (local.get $b) (i32.const 0)) (then (call $toolbar_action (local.get $b))))
        (call $paint)
        (return)))
    (if (i32.or (i32.lt_s (local.get $y) (global.get $view_top)) (local.get $button))
      (then (call $paint) (return)))
    ;; the scrollbar: grab the thumb, or jump so the thumb centres on the pointer
    (if (i32.and (i32.ge_s (local.get $x) (i32.sub (global.get $W) (global.get $strip_w)))
                 (i32.gt_s (global.get $doc_h) (global.get $view_h)))
      (then
        (global.set $grab (i32.sub (local.get $y) (call $thumb_y)))
        (if (i32.or (i32.lt_s (global.get $grab) (i32.const 0)) (i32.ge_s (global.get $grab) (call $thumb_h)))
          (then
            (global.set $grab (i32.shr_s (call $thumb_h) (i32.const 1)))
            (call $scroll_to_thumb (local.get $y))))
        (global.set $drag (i32.const 3))
        (call $paint)
        (return)))
    (local.set $p (call $checkbox_at (local.get $x) (local.get $y)))
    (if (i32.ge_s (local.get $p) (i32.const 0))
      (then (drop (call $toggle_check (local.get $p))) (global.set $dirty (i32.const 1)) (call $paint) (return)))
    (local.set $p (call $pos_at_point (local.get $x) (local.get $y)))
    (if (call $modkey (local.get $mods))
      (then
        (local.set $id (call $link_under (local.get $p)))
        (if (local.get $id)
          (then
            (call $host_open_url (call $link_ptr (local.get $id)) (call $link_len (local.get $id)))
            (return)))))
    ;; count clicks for double and triple click
    (if (i32.and
          (i32.lt_s (i32.sub (local.get $now) (global.get $click_t)) (i32.const 450))
          (i32.and
            (i32.le_s (call $iabs (i32.sub (local.get $x) (global.get $click_x))) (call $px (f32.const 4)))
            (i32.le_s (call $iabs (i32.sub (local.get $y) (global.get $click_y))) (call $px (f32.const 4)))))
      (then (global.set $clicks (i32.add (i32.rem_u (global.get $clicks) (i32.const 3)) (i32.const 1))))
      (else (global.set $clicks (i32.const 1))))
    (global.set $click_t (local.get $now))
    (global.set $click_x (local.get $x))
    (global.set $click_y (local.get $y))
    (global.set $goal_x (f32.const -1))
    (global.set $pre_len (i32.const 0))
    (if (i32.eq (global.get $clicks) (i32.const 1))
      (then
        (call $set_selection
          (select (global.get $anchor) (local.get $p) (i32.and (local.get $mods) (i32.const 1)))
          (local.get $p))
        (global.set $drag (i32.const 1))))
    (if (i32.eq (global.get $clicks) (i32.const 2))
      (then
        (call $word_range (local.get $p))
        (call $set_selection (global.get $wa) (global.get $wb))
        (global.set $affinity (i32.const 0))
        (global.set $drag (i32.const 0))))
    (if (i32.eq (global.get $clicks) (i32.const 3))
      (then
        (call $set_selection (call $block_start (local.get $p)) (call $nl_after (local.get $p)))
        (global.set $affinity (i32.const 0))
        (global.set $drag (i32.const 0))))
    (call $moved)
    (call $paint))

  (func (export "mouse_move") (param $x i32) (param $y i32) (param $mods i32) (param $now i32)
    (local $cursor i32) (local $hover i32) (local $yy i32)
    (global.set $now (local.get $now))
    ;; hover and cursor shape
    (local.set $hover (i32.const -1))
    (if (i32.lt_s (local.get $y) (global.get $tb_h))
      (then
        (local.set $hover (call $button_at (local.get $x) (local.get $y)))
        (local.set $cursor (select (i32.const 2) (i32.const 0) (i32.ge_s (local.get $hover) (i32.const 0)))))
      (else
        (if (i32.lt_s (local.get $y) (global.get $view_top))
          (then (local.set $cursor (i32.const 1)))
          (else
            (local.set $cursor (i32.const 1))
            (if (i32.eqz (global.get $drag))
              (then
                (if (i32.ge_s (call $checkbox_at (local.get $x) (local.get $y)) (i32.const 0))
                  (then (local.set $cursor (i32.const 2))))
                (if (call $modkey (local.get $mods))
                  (then
                    (if (call $link_under (call $pos_at_point (local.get $x) (local.get $y)))
                      (then (local.set $cursor (i32.const 2))))))))))))
    (if (i32.ne (local.get $cursor) (global.get $cursor))
      (then (global.set $cursor (local.get $cursor)) (call $host_set_cursor (local.get $cursor))))
    (global.set $hover (local.get $hover))
    (if (i32.eq (global.get $drag) (i32.const 3))
      (then (call $scroll_to_thumb (local.get $y)) (call $paint) (return)))
    ;; dragging a selection, scrolling when the pointer leaves the text area
    (if (global.get $drag)
      (then
        (local.set $yy (local.get $y))
        (if (i32.lt_s (local.get $yy) (global.get $view_top))
          (then
            (global.set $scroll (i32.sub (global.get $scroll) (i32.shr_s (i32.sub (global.get $view_top) (local.get $yy)) (i32.const 1))))
            (local.set $yy (global.get $view_top))))
        (if (i32.ge_s (local.get $yy) (global.get $H))
          (then
            (global.set $scroll (i32.add (global.get $scroll) (i32.shr_s (i32.sub (local.get $yy) (global.get $H)) (i32.const 1))))
            (local.set $yy (i32.sub (global.get $H) (i32.const 1)))))
        (call $set_selection (global.get $anchor) (call $pos_at_point (local.get $x) (local.get $yy)))
        (global.set $blink_t (local.get $now))))
    (call $paint))

  (func (export "mouse_up") (param $x i32) (param $y i32) (param $button i32) (param $mods i32) (param $now i32)
    (global.set $now (local.get $now))
    (global.set $drag (i32.const 0))
    (call $paint))

  ;; Scroll by (dx, dy) device pixels.
  (func (export "wheel") (param $dx i32) (param $dy i32)
    (global.set $scroll (i32.add (global.get $scroll) (local.get $dy)))
    (call $paint))
