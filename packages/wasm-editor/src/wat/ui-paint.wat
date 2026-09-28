;; ui-paint.wat -- painting the framebuffer and telling the host what changed.
;;
;; The text area is painted in bands, one per visual line (see ui-layout.wat).
;; Each visible band gets a key hashing everything that affects its pixels:
;; its text, position, selection, caret, theme. Only bands whose key or
;; position changed since the last frame are repainted and presented, so
;; typing repaints a line and a caret blink repaints a line. The toolbar,
;; link bar and scrollbar have keys of their own. The touch overlays (the
;; selection handles and the edit menu, ui-touch.wat) are drawn over the
;; bands they cross, and hashed into those bands' keys.

  (global $d0 (mut i32) (i32.const 0))  ;; damaged rows of the text area
  (global $d1 (mut i32) (i32.const 0))

  (func $mix (param $h i32) (param $v i32) (result i32)
    (i32.mul (i32.xor (local.get $h) (local.get $v)) (i32.const 0x01000193)))

  ;; Caret blink phase: on for 530 ms after any edit or move, then alternating.
  (func $blink_on (result i32)
    (local $el i32)
    (local.set $el (i32.sub (global.get $now) (global.get $blink_t)))
    (if (i32.lt_s (local.get $el) (i32.const 0)) (then (local.set $el (i32.const 0))))
    (i32.and (global.get $focused)
      (i32.eqz (i32.and (i32.div_u (local.get $el) (i32.const 530)) (i32.const 1)))))

  ;; Is the text caret drawn? Not while the link bar has the keyboard, nor
  ;; with a selection.
  (func $caret_on (result i32)
    (i32.and (call $blink_on)
      (i32.and (i32.eqz (global.get $link_open)) (i32.eq (global.get $anchor) (global.get $focus)))))

  ;; UTF-16 run: width, and drawing (returns the end x).
  (func $units_width (param $ptr i32) (param $n i32) (param $face i32) (param $size f32) (result f32)
    (local $w f32) (local $i i32) (local $c i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $n)))
        (local.set $c (i32.load16_u (i32.add (local.get $ptr) (i32.shl (local.get $i) (i32.const 1)))))
        (local.set $w (f32.add (local.get $w)
          (f32.mul (f32.load (call $grec (local.get $face) (call $gid (local.get $c)))) (local.get $size))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (local.get $w))

  (func $draw_units (param $ptr i32) (param $n i32) (param $face i32) (param $size f32) (param $x f32) (param $y i32) (param $col i32) (result f32)
    (local $i i32) (local $c i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $n)))
        (local.set $c (i32.load16_u (i32.add (local.get $ptr) (i32.shl (local.get $i) (i32.const 1)))))
        (call $draw_cp (local.get $c) (local.get $face) (local.get $size) (i32.const 0)
          (i32.trunc_sat_f32_s (f32.nearest (local.get $x))) (local.get $y) (local.get $col))
        (local.set $x (f32.add (local.get $x)
          (f32.mul (f32.load (call $grec (local.get $face) (call $gid (local.get $c)))) (local.get $size))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (local.get $x))

  ;; ---------------------------------------------------------------------
  ;; Toolbar
  ;; ---------------------------------------------------------------------

  (func $link_active (result i32)
    (i32.or (global.get $link_open) (i32.ne (call $link_at (global.get $focus)) (i32.const 0))))

  (func $btn_active (param $b i32) (result i32)
    (local $kind i32) (local $v i32)
    (local.set $kind (i32.load offset=16 (local.get $b)))
    (local.set $v (i32.load offset=20 (local.get $b)))
    (if (i32.eq (local.get $kind) (i32.const 1))
      (then (return (i32.ne (i32.and (call $sel_marks) (local.get $v)) (i32.const 0)))))
    (if (i32.eq (local.get $kind) (i32.const 2))
      (then (return (i32.eq (i32.and (call $sel_block) (i32.const 15)) (local.get $v)))))
    (if (i32.eq (local.get $v) (i32.const 1)) (then (return (call $link_active))))
    (i32.const 0))

  (func $btn_disabled (param $b i32) (result i32)
    (if (i32.ne (i32.load offset=16 (local.get $b)) (i32.const 3)) (then (return (i32.const 0))))
    (if (i32.eq (i32.load offset=20 (local.get $b)) (i32.const 2)) (then (return (i32.eqz (call $can_undo)))))
    (if (i32.eq (i32.load offset=20 (local.get $b)) (i32.const 3)) (then (return (i32.eqz (call $can_redo)))))
    (i32.const 0))

  (func $toolbar_key (result i32)
    (local $h i32) (local $i i32) (local $b i32)
    (local.set $h (call $mix (i32.const 0x811c9dc5) (global.get $W)))
    (local.set $h (call $mix (local.get $h) (global.get $tb_h)))
    (local.set $h (call $mix (local.get $h) (global.get $dark)))
    (local.set $h (call $mix (local.get $h) (global.get $hover)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (global.get $nbtns)))
        (local.set $b (i32.add (global.get $BTNS) (i32.shl (local.get $i) (i32.const 5))))
        (local.set $h (call $mix (local.get $h)
          (i32.or (call $btn_active (local.get $b)) (i32.shl (call $btn_disabled (local.get $b)) (i32.const 1)))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (local.get $h))

  (func $paint_toolbar
    (local $i i32) (local $b i32) (local $bx i32) (local $by i32) (local $bw i32) (local $bh i32)
    (local $face i32) (local $deco i32) (local $size f32) (local $tw f32) (local $x f32) (local $base i32)
    (local $col i32) (local $bg i32) (local $icon i32) (local $s i32) (local $iy i32) (local $bd i32)
    (call $clip (i32.const 0) (i32.const 0) (global.get $W) (global.get $tb_h))
    (call $fill (i32.const 0) (i32.const 0) (global.get $W) (global.get $tb_h) (global.get $c_bar))
    (call $fill (i32.const 0) (i32.sub (global.get $tb_h) (i32.const 1)) (global.get $W) (i32.const 1) (global.get $c_rule))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (global.get $nbtns)))
        (local.set $b (i32.add (global.get $BTNS) (i32.shl (local.get $i) (i32.const 5))))
        (local.set $bx (i32.load (local.get $b)))
        (local.set $by (i32.load offset=4 (local.get $b)))
        (local.set $bw (i32.load offset=8 (local.get $b)))
        (local.set $bh (i32.load offset=12 (local.get $b)))
        (local.set $face (i32.and (i32.load offset=28 (local.get $b)) (i32.const 0xFF)))
        (local.set $deco (i32.and (i32.shr_u (i32.load offset=28 (local.get $b)) (i32.const 8)) (i32.const 0xFF)))
        ;; group separator
        (if (i32.and (i32.ne (i32.and (i32.load offset=28 (local.get $b)) (i32.const 0x10000)) (i32.const 0))
                     (i32.gt_u (local.get $i) (i32.const 0)))
          (then
            (call $fill (i32.sub (local.get $bx) (call $px (f32.const 8))) (i32.add (local.get $by) (call $px (f32.const 6)))
              (select (call $px (f32.const 1)) (i32.const 1) (i32.gt_s (call $px (f32.const 1)) (i32.const 0)))
              (i32.sub (local.get $bh) (call $px (f32.const 12))) (global.get $c_rule))))
        ;; background and colour by state
        (local.set $bg (global.get $c_bar))
        (local.set $col (global.get $c_text))
        (if (call $btn_active (local.get $b))
          (then (local.set $bg (global.get $c_active)) (local.set $col (global.get $c_active_fg)))
          (else
            (if (i32.eq (local.get $i) (global.get $hover))
              (then (local.set $bg (global.get $c_hover))))))
        (if (call $btn_disabled (local.get $b)) (then (local.set $col (global.get $c_thumb))))
        (if (i32.ne (local.get $bg) (global.get $c_bar))
          (then (call $rrect (local.get $bx) (local.get $by) (local.get $bw) (local.get $bh) (call $px (f32.const 6)) (local.get $bg))))
        ;; label, centred, with an optional checkbox icon before it
        (local.set $size (call $btn_size (local.get $face)))
        (local.set $tw (call $str_width (i32.load offset=24 (local.get $b)) (local.get $face) (local.get $size)))
        (local.set $icon (select (call $px (f32.const 17)) (i32.const 0) (i32.eq (local.get $deco) (i32.const 3))))
        (local.set $x (f32.add (f32.convert_i32_s (local.get $bx))
          (f32.mul (f32.sub (f32.convert_i32_s (local.get $bw)) (f32.add (local.get $tw) (f32.convert_i32_s (local.get $icon)))) (f32.const 0.5))))
        (local.set $base (i32.add (local.get $by)
          (i32.trunc_sat_f32_s (f32.nearest (f32.add (f32.mul (f32.convert_i32_s (local.get $bh)) (f32.const 0.5))
                                                     (f32.mul (local.get $size) (f32.const 0.36)))))))
        (if (local.get $icon)
          (then
            (local.set $s (call $px (f32.const 11)))
            (local.set $iy (i32.add (local.get $by) (i32.shr_s (i32.sub (local.get $bh) (local.get $s)) (i32.const 1))))
            (local.set $bd (select (call $px (f32.const 1.4)) (i32.const 1) (i32.gt_s (call $px (f32.const 1.4)) (i32.const 1))))
            (call $rrect (i32.trunc_sat_f32_s (local.get $x)) (local.get $iy) (local.get $s) (local.get $s) (call $px (f32.const 2.5)) (local.get $col))
            (call $rrect (i32.add (i32.trunc_sat_f32_s (local.get $x)) (local.get $bd)) (i32.add (local.get $iy) (local.get $bd))
              (i32.sub (local.get $s) (i32.shl (local.get $bd) (i32.const 1))) (i32.sub (local.get $s) (i32.shl (local.get $bd) (i32.const 1)))
              (call $px (f32.const 1.5)) (local.get $bg))
            (local.set $x (f32.add (local.get $x) (f32.convert_i32_s (local.get $icon))))))
        (drop (call $draw_str (i32.load offset=24 (local.get $b)) (local.get $face) (local.get $size) (local.get $x) (local.get $base) (local.get $col)))
        (if (i32.eq (local.get $deco) (i32.const 1))
          (then (call $fill (i32.trunc_sat_f32_s (local.get $x)) (i32.add (local.get $base) (call $px (f32.const 2)))
                  (i32.trunc_sat_f32_s (f32.ceil (local.get $tw))) (call $thin) (local.get $col))))
        (if (i32.eq (local.get $deco) (i32.const 2))
          (then (call $fill (i32.trunc_sat_f32_s (local.get $x))
                  (i32.sub (local.get $base) (i32.trunc_sat_f32_s (f32.nearest (f32.mul (local.get $size) (f32.const 0.3)))))
                  (i32.trunc_sat_f32_s (f32.ceil (local.get $tw))) (call $thin) (local.get $col))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l))))

  ;; a hairline: one CSS pixel, at least one device pixel
  (func $thin (result i32)
    (select (call $px (f32.const 1.25)) (i32.const 1) (i32.gt_s (call $px (f32.const 1.25)) (i32.const 1))))

  ;; ---------------------------------------------------------------------
  ;; Link bar: a one-line text field under the toolbar
  ;; ---------------------------------------------------------------------

  (func $linkbar_key (result i32)
    (local $h i32) (local $i i32)
    (local.set $h (call $mix (i32.const 0x811c9dc5) (global.get $link_len)))
    (local.set $h (call $mix (local.get $h) (call $blink_on)))
    (local.set $h (call $mix (local.get $h) (global.get $W)))
    (local.set $h (call $mix (local.get $h) (global.get $dark)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (global.get $link_len)))
        (local.set $h (call $mix (local.get $h) (i32.load16_u (i32.add (global.get $LINKBUF) (i32.shl (local.get $i) (i32.const 1))))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (local.get $h))

  (func $paint_linkbar
    (local $y0 i32) (local $h i32) (local $size f32) (local $base i32) (local $fx i32) (local $fy i32) (local $fw i32) (local $fh i32)
    (local $hint f32) (local $tw f32) (local $tx f32) (local $room i32)
    (local.set $y0 (global.get $tb_h))
    (local.set $h (global.get $lb_h))
    (call $clip (i32.const 0) (local.get $y0) (global.get $W) (i32.add (local.get $y0) (local.get $h)))
    (call $fill (i32.const 0) (local.get $y0) (global.get $W) (local.get $h) (global.get $c_bar))
    (call $fill (i32.const 0) (i32.sub (i32.add (local.get $y0) (local.get $h)) (i32.const 1)) (global.get $W) (i32.const 1) (global.get $c_rule))
    (local.set $size (f32.mul (global.get $scale) (f32.const 13.5)))
    (local.set $base (i32.add (local.get $y0)
      (i32.trunc_sat_f32_s (f32.nearest (f32.add (f32.mul (f32.convert_i32_s (local.get $h)) (f32.const 0.5))
                                                 (f32.mul (local.get $size) (f32.const 0.36)))))))
    (local.set $fx (i32.add (call $px (f32.const 22))
      (i32.trunc_sat_f32_s (f32.ceil (call $str_width (i32.const 17) (i32.const 5) (local.get $size))))))
    (drop (call $draw_str (i32.const 17) (i32.const 5) (local.get $size) (f32.convert_i32_s (call $px (f32.const 12)))
      (local.get $base) (global.get $c_text)))
    ;; hint on the right when there is room for it
    (local.set $hint (call $str_width (i32.const 18) (i32.const 5) (f32.mul (global.get $scale) (f32.const 12.5))))
    (local.set $room (i32.gt_s (i32.sub (global.get $W) (i32.trunc_sat_f32_s (local.get $hint))) (i32.add (local.get $fx) (call $px (f32.const 260)))))
    (local.set $fw (i32.sub (i32.sub (global.get $W) (local.get $fx)) (call $px (f32.const 12))))
    (if (local.get $room)
      (then
        (local.set $fw (i32.sub (local.get $fw) (i32.add (i32.trunc_sat_f32_s (f32.ceil (local.get $hint))) (call $px (f32.const 14)))))
        (drop (call $draw_str (i32.const 18) (i32.const 5) (f32.mul (global.get $scale) (f32.const 12.5))
          (f32.sub (f32.convert_i32_s (i32.sub (global.get $W) (call $px (f32.const 12)))) (local.get $hint))
          (local.get $base) (global.get $c_muted)))))
    (local.set $fy (i32.add (local.get $y0) (call $px (f32.const 8))))
    (local.set $fh (i32.sub (local.get $h) (call $px (f32.const 16))))
    (call $rrect (local.get $fx) (local.get $fy) (local.get $fw) (local.get $fh) (call $px (f32.const 6)) (global.get $c_accent))
    (call $rrect (i32.add (local.get $fx) (call $thin)) (i32.add (local.get $fy) (call $thin))
      (i32.sub (local.get $fw) (i32.shl (call $thin) (i32.const 1))) (i32.sub (local.get $fh) (i32.shl (call $thin) (i32.const 1)))
      (call $px (f32.const 5)) (global.get $c_field))
    ;; the URL, scrolled so its end stays visible
    (call $clip (i32.add (local.get $fx) (call $px (f32.const 4))) (local.get $fy)
      (i32.sub (i32.add (local.get $fx) (local.get $fw)) (call $px (f32.const 4))) (i32.add (local.get $fy) (local.get $fh)))
    (local.set $size (f32.mul (global.get $scale) (f32.const 14)))
    (local.set $tw (call $units_width (global.get $LINKBUF) (global.get $link_len) (i32.const 5) (local.get $size)))
    (local.set $tx (f32.convert_i32_s (i32.add (local.get $fx) (call $px (f32.const 9)))))
    (if (f32.gt (local.get $tw) (f32.convert_i32_s (i32.sub (local.get $fw) (call $px (f32.const 22)))))
      (then (local.set $tx (f32.sub (local.get $tx)
              (f32.sub (local.get $tw) (f32.convert_i32_s (i32.sub (local.get $fw) (call $px (f32.const 22)))))))))
    (local.set $tx (call $draw_units (global.get $LINKBUF) (global.get $link_len) (i32.const 5) (local.get $size) (local.get $tx)
      (local.get $base) (global.get $c_text)))
    (if (call $blink_on)
      (then (call $fill (i32.trunc_sat_f32_s (f32.nearest (local.get $tx))) (i32.add (local.get $fy) (call $px (f32.const 6)))
              (call $thin) (i32.sub (local.get $fh) (call $px (f32.const 12))) (global.get $c_text)))))

  ;; ---------------------------------------------------------------------
  ;; Scrollbar strip
  ;; ---------------------------------------------------------------------

  (func $strip_key (result i32)
    (local $h i32)
    (local.set $h (call $mix (i32.const 0x811c9dc5) (global.get $scroll)))
    (local.set $h (call $mix (local.get $h) (global.get $doc_h)))
    (local.set $h (call $mix (local.get $h) (global.get $view_h)))
    (local.set $h (call $mix (local.get $h) (global.get $view_top)))
    (local.set $h (call $mix (local.get $h) (i32.eq (global.get $drag) (i32.const 3))))
    (call $mix (local.get $h) (global.get $dark)))

  (func $paint_strip
    (local $x i32) (local $th i32) (local $ty i32)
    (local.set $x (i32.sub (global.get $W) (global.get $strip_w)))
    (call $clip (local.get $x) (global.get $view_top) (global.get $W) (global.get $H))
    (call $fill (local.get $x) (global.get $view_top) (global.get $strip_w) (global.get $view_h) (global.get $c_bg))
    (if (i32.gt_s (global.get $doc_h) (global.get $view_h))
      (then
        (local.set $th (call $thumb_h))
        (local.set $ty (call $thumb_y))
        (call $rrect (i32.add (local.get $x) (call $px (f32.const 3))) (i32.add (local.get $ty) (call $px (f32.const 2)))
          (i32.sub (global.get $strip_w) (call $px (f32.const 6))) (i32.sub (local.get $th) (call $px (f32.const 4)))
          (call $px (f32.const 2)) (select (global.get $c_muted) (global.get $c_thumb) (i32.eq (global.get $drag) (i32.const 3)))))))

  ;; ---------------------------------------------------------------------
  ;; Text bands
  ;; ---------------------------------------------------------------------

  (func $band_key (param $i i32) (param $top i32) (result i32)
    (local $h i32) (local $a i32) (local $p i32) (local $end i32) (local $s i32) (local $e i32) (local $k i32)
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $p (i32.load (local.get $a)))
    (local.set $end (i32.load offset=4 (local.get $a)))
    (local.set $h (call $mix (i32.const 0x811c9dc5) (local.get $top)))
    (local.set $h (call $mix (local.get $h) (i32.sub (i32.load offset=8 (local.get $a)) (global.get $scroll))))
    (local.set $h (call $mix (local.get $h) (i32.load offset=12 (local.get $a))))
    (local.set $h (call $mix (local.get $h) (i32.load offset=16 (local.get $a))))
    (local.set $h (call $mix (local.get $h) (i32.load offset=20 (local.get $a))))
    (local.set $h (call $mix (local.get $h) (i32.load offset=24 (local.get $a))))
    ;; text, terminator included
    (local.set $k (local.get $p))
    (block $d
      (loop $l
        (local.set $h (call $mix (local.get $h) (call $get (local.get $k))))
        (br_if $d (i32.ge_u (local.get $k) (local.get $end)))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l)))
    ;; the part of the selection on this line
    (local.set $s (call $smin))
    (local.set $e (call $smax))
    (if (i32.and (i32.lt_u (local.get $s) (local.get $e))
                 (i32.and (i32.le_u (local.get $s) (local.get $end)) (i32.gt_u (local.get $e) (local.get $p))))
      (then
        (local.set $h (call $mix (local.get $h) (i32.sub (local.get $s) (local.get $p))))
        (local.set $h (call $mix (local.get $h) (i32.sub (local.get $e) (local.get $p))))))
    (if (i32.eq (global.get $g_line) (local.get $i))
      (then
        (if (call $caret_on)
          (then (local.set $h (call $mix (local.get $h) (i32.reinterpret_f32 (global.get $g_x))))))
        (if (global.get $pre_len)
          (then
            (local.set $h (call $mix (local.get $h) (global.get $pre_len)))
            (local.set $k (i32.const 0))
            (block $pd
              (loop $pl
                (br_if $pd (i32.ge_u (local.get $k) (global.get $pre_len)))
                (local.set $h (call $mix (local.get $h) (i32.load16_u (i32.add (global.get $PREEDIT) (i32.shl (local.get $k) (i32.const 1))))))
                (local.set $k (i32.add (local.get $k) (i32.const 1)))
                (br $pl)))))))
    (local.set $h (call $mix (local.get $h) (global.get $focused)))
    (local.set $h (call $mix (local.get $h) (global.get $dark)))
    (local.set $h (call $mix (local.get $h) (global.get $col_x)))
    (local.set $h (call $mix (local.get $h) (global.get $col_w)))
    (call $mix (local.get $h) (i32.eq (call $len) (i32.const 1))))

  ;; Repaint the visible bands whose key changed; sets $d0/$d1.
  (func $paint_bands
    (local $old i32) (local $new i32) (local $nold i32) (local $n i32) (local $j i32) (local $i i32)
    (local $a i32) (local $btop i32) (local $bbot i32) (local $top i32) (local $bot i32) (local $key i32)
    (local $vis_end i32) (local $o i32)
    (local.set $old (i32.add (global.get $BANDS) (i32.mul (global.get $band_list) (i32.const 16384))))
    (local.set $new (i32.add (global.get $BANDS) (i32.mul (i32.sub (i32.const 1) (global.get $band_list)) (i32.const 16384))))
    (local.set $nold (select (i32.const 0) (global.get $nbands) (global.get $full)))
    (global.set $d0 (global.get $H))
    (global.set $d1 (i32.const 0))
    (local.set $vis_end (i32.add (global.get $scroll) (global.get $view_h)))
    (local.set $i (call $line_at (global.get $scroll)))
    (block $done
      (loop $each
        (br_if $done (i32.ge_s (local.get $i) (global.get $nlines)))
        (br_if $done (i32.ge_u (local.get $n) (global.get $BAND_MAX)))
        (local.set $a (call $line_addr (local.get $i)))
        (local.set $btop (i32.load offset=28 (local.get $a)))
        (br_if $done (i32.ge_s (local.get $btop) (local.get $vis_end)))
        ;; the last band runs to the bottom of the window
        (local.set $bbot
          (if (result i32) (i32.lt_s (i32.add (local.get $i) (i32.const 1)) (global.get $nlines))
            (then (i32.load offset=28 (call $line_addr (i32.add (local.get $i) (i32.const 1)))))
            (else (select (global.get $doc_h) (local.get $vis_end) (i32.gt_s (global.get $doc_h) (local.get $vis_end))))))
        (local.set $top (i32.add (global.get $view_top) (i32.sub (local.get $btop) (global.get $scroll))))
        (local.set $bot (i32.add (global.get $view_top) (i32.sub (local.get $bbot) (global.get $scroll))))
        (if (i32.lt_s (local.get $top) (global.get $view_top)) (then (local.set $top (global.get $view_top))))
        (if (i32.gt_s (local.get $bot) (global.get $H)) (then (local.set $bot (global.get $H))))
        (if (i32.gt_s (local.get $bot) (local.get $top))
          (then
            (local.set $key (call $mix (call $band_key (local.get $i) (local.get $top))
                                       (call $overlay_key (local.get $top) (local.get $bot))))
            ;; find this band in last frame's list (both are sorted by top)
            (block $f
              (loop $fl
                (br_if $f (i32.ge_u (local.get $j) (local.get $nold)))
                (local.set $o (i32.add (local.get $old) (i32.shl (local.get $j) (i32.const 4))))
                (br_if $f (i32.ge_s (i32.load (local.get $o)) (local.get $top)))
                (local.set $j (i32.add (local.get $j) (i32.const 1)))
                (br $fl)))
            (local.set $o (i32.add (local.get $old) (i32.shl (local.get $j) (i32.const 4))))
            (if (i32.eqz
                  (i32.and (i32.lt_u (local.get $j) (local.get $nold))
                    (i32.and (i32.eq (i32.load (local.get $o)) (local.get $top))
                      (i32.and (i32.eq (i32.load offset=4 (local.get $o)) (local.get $bot))
                               (i32.eq (i32.load offset=8 (local.get $o)) (local.get $key))))))
              (then
                (call $paint_band (local.get $i) (local.get $top) (local.get $bot))
                (if (i32.lt_s (local.get $top) (global.get $d0)) (then (global.set $d0 (local.get $top))))
                (if (i32.gt_s (local.get $bot) (global.get $d1)) (then (global.set $d1 (local.get $bot))))))
            (local.set $o (i32.add (local.get $new) (i32.shl (local.get $n) (i32.const 4))))
            (i32.store (local.get $o) (local.get $top))
            (i32.store offset=4 (local.get $o) (local.get $bot))
            (i32.store offset=8 (local.get $o) (local.get $key))
            (local.set $n (i32.add (local.get $n) (i32.const 1)))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $each)))
    (global.set $nbands (local.get $n))
    (global.set $band_list (i32.sub (i32.const 1) (global.get $band_list))))

  (func $paint_band (param $i i32) (param $top i32) (param $bot i32)
    (local $a i32) (local $flags i32) (local $t i32) (local $ys i32) (local $h i32) (local $base i32) (local $x0 i32)
    (local $pad i32) (local $r i32) (local $y0 i32) (local $y1 i32) (local $size f32) (local $face i32) (local $cx i32)
    (local $pw f32)
    (call $clip (i32.const 0) (local.get $top) (i32.sub (global.get $W) (global.get $strip_w)) (local.get $bot))
    (call $fill (i32.const 0) (local.get $top) (i32.sub (global.get $W) (global.get $strip_w)) (i32.sub (local.get $bot) (local.get $top)) (global.get $c_bg))
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $flags (i32.load offset=24 (local.get $a)))
    (local.set $t (call $type_of_flags (local.get $flags)))
    (local.set $ys (i32.add (global.get $view_top) (i32.sub (i32.load offset=8 (local.get $a)) (global.get $scroll))))
    (local.set $h (i32.load offset=12 (local.get $a)))
    (local.set $base (i32.load offset=16 (local.get $a)))
    (local.set $x0 (i32.load offset=20 (local.get $a)))
    (local.set $size (call $size_for (local.get $t) (i32.const 0)))
    (local.set $face (call $face_for (local.get $t) (i32.const 0)))
    ;; code block background; only the group's ends are rounded, so the
    ;; rectangle runs past the band where the group continues
    (if (i32.eq (local.get $t) (i32.const 8))
      (then
        (local.set $pad (call $px (f32.const 12)))
        (local.set $r (call $px (f32.const 6)))
        (local.set $y0 (i32.sub (local.get $ys)
          (select (local.get $pad) (i32.shl (local.get $r) (i32.const 1)) (i32.and (local.get $flags) (i32.const 0x400)))))
        (local.set $y1 (i32.add (i32.add (local.get $ys) (local.get $h))
          (select (local.get $pad) (i32.shl (local.get $r) (i32.const 1)) (i32.and (local.get $flags) (i32.const 0x800)))))
        (call $rrect (global.get $col_x) (local.get $y0) (global.get $col_w) (i32.sub (local.get $y1) (local.get $y0))
          (local.get $r) (global.get $c_code))))
    ;; quote bar, continuous down a run of quote lines
    (if (i32.eq (local.get $t) (i32.const 4))
      (then
        (local.set $y0 (select (local.get $ys) (local.get $top) (i32.and (local.get $flags) (i32.const 0x100))))
        (local.set $y1
          (select
            (select (local.get $bot) (i32.add (local.get $ys) (local.get $h)) (i32.and (local.get $flags) (i32.const 0x1000)))
            (local.get $bot)
            (i32.and (local.get $flags) (i32.const 0x200))))
        (call $fill (global.get $col_x) (local.get $y0) (call $px (f32.const 3)) (i32.sub (local.get $y1) (local.get $y0))
          (global.get $c_thumb))))
    (if (i32.and (local.get $flags) (i32.const 0x100))
      (then (call $draw_marker (local.get $t) (local.get $flags) (local.get $ys) (local.get $base) (local.get $x0) (local.get $size))))
    (call $draw_text (local.get $i) (local.get $ys))
    ;; placeholder in an empty document
    (if (i32.and (i32.eq (call $len) (i32.const 1)) (i32.eqz (local.get $i)))
      (then
        (drop (call $draw_str (i32.const 16) (i32.const 2) (local.get $size)
          (f32.convert_i32_s (i32.add (global.get $col_x) (local.get $x0))) (i32.add (local.get $ys) (local.get $base))
          (global.get $c_muted)))))
    (if (i32.eq (global.get $g_line) (local.get $i))
      (then
        (local.set $cx (i32.add (global.get $col_x) (i32.trunc_sat_f32_s (f32.nearest (global.get $g_x)))))
        ;; IME composition, drawn over the text at the caret
        (if (global.get $pre_len)
          (then
            (local.set $pw (call $units_width (global.get $PREEDIT) (global.get $pre_len) (local.get $face) (local.get $size)))
            (call $fill (local.get $cx) (local.get $ys) (i32.trunc_sat_f32_s (f32.ceil (local.get $pw))) (local.get $h) (global.get $c_bg))
            (drop (call $draw_units (global.get $PREEDIT) (global.get $pre_len) (local.get $face) (local.get $size)
              (f32.convert_i32_s (local.get $cx)) (i32.add (local.get $ys) (local.get $base)) (global.get $c_text)))
            (call $fill (local.get $cx) (i32.add (i32.add (local.get $ys) (local.get $base)) (call $px (f32.const 3)))
              (i32.trunc_sat_f32_s (f32.ceil (local.get $pw))) (call $thin) (global.get $c_accent))
            (local.set $cx (i32.add (local.get $cx) (i32.trunc_sat_f32_s (f32.nearest (local.get $pw)))))))
        (if (call $caret_on)
          (then
            (call $fill (local.get $cx)
              (i32.sub (i32.add (local.get $ys) (local.get $base))
                       (i32.trunc_sat_f32_s (f32.nearest (f32.mul (call $ascent (local.get $face)) (local.get $size)))))
              (select (call $px (f32.const 1.6)) (i32.const 1) (i32.gt_s (call $px (f32.const 1.6)) (i32.const 1)))
              (i32.trunc_sat_f32_s (f32.nearest (f32.mul (f32.add (call $ascent (local.get $face)) (call $descent (local.get $face))) (local.get $size))))
              (global.get $c_text))))))
    (call $paint_overlays))

  ;; Bullet, number or checkbox in a list item's indent.
  (func $draw_marker (param $t i32) (param $flags i32) (param $ys i32) (param $base i32) (param $x0 i32) (param $size f32)
    (local $n i32) (local $d i32) (local $w f32) (local $x f32) (local $digits i32) (local $s i32) (local $bx i32) (local $by i32)
    (local $sf f32) (local $bxf f32) (local $byf f32)
    (if (i32.eq (local.get $t) (i32.const 5))
      (then
        (call $draw_cp (i32.const 0x2022) (i32.const 0) (local.get $size) (i32.const 0)
          (i32.add (global.get $col_x) (call $px (f32.const 7))) (i32.add (local.get $ys) (local.get $base)) (global.get $c_text))
        (return)))
    (if (i32.eq (local.get $t) (i32.const 6))
      (then
        ;; "12." right-aligned in the indent
        (local.set $n (i32.shr_u (local.get $flags) (i32.const 16)))
        (local.set $w (f32.mul (f32.load (call $grec (i32.const 0) (call $gid (i32.const 46)))) (local.get $size)))
        (local.set $d (local.get $n))
        (loop $count
          (local.set $w (f32.add (local.get $w)
            (f32.mul (f32.load (call $grec (i32.const 0) (call $gid (i32.add (i32.const 48) (i32.rem_u (local.get $d) (i32.const 10))))))
                     (local.get $size))))
          (local.set $digits (i32.add (local.get $digits) (i32.const 1)))
          (local.set $d (i32.div_u (local.get $d) (i32.const 10)))
          (br_if $count (local.get $d)))
        (local.set $x (f32.sub (f32.convert_i32_s (i32.sub (i32.add (global.get $col_x) (local.get $x0)) (call $px (f32.const 7))))
                               (local.get $w)))
        (local.set $x (call $draw_number (local.get $n) (local.get $digits) (local.get $x) (i32.add (local.get $ys) (local.get $base)) (local.get $size)))
        (call $draw_cp (i32.const 46) (i32.const 0) (local.get $size) (i32.const 0)
          (i32.trunc_sat_f32_s (f32.nearest (local.get $x))) (i32.add (local.get $ys) (local.get $base)) (global.get $c_text))
        (return)))
    (if (i32.eq (local.get $t) (i32.const 7))
      (then
        (local.set $s (i32.trunc_sat_f32_s (f32.nearest (f32.mul (local.get $size) (f32.const 0.86)))))
        (local.set $bx (i32.add (global.get $col_x) (call $px (f32.const 2))))
        (local.set $by (i32.sub (i32.add (local.get $ys) (local.get $base))
                                (i32.trunc_sat_f32_s (f32.nearest (f32.mul (local.get $size) (f32.const 0.76))))))
        (if (i32.and (local.get $flags) (i32.const 16))
          (then
            (call $rrect (local.get $bx) (local.get $by) (local.get $s) (local.get $s) (call $px (f32.const 3.5)) (global.get $c_accent))
            (local.set $sf (f32.convert_i32_s (local.get $s)))
            (local.set $bxf (f32.convert_i32_s (local.get $bx)))
            (local.set $byf (f32.convert_i32_s (local.get $by)))
            (call $line
              (f32.add (local.get $bxf) (f32.mul (local.get $sf) (f32.const 0.25)))
              (f32.add (local.get $byf) (f32.mul (local.get $sf) (f32.const 0.52)))
              (f32.add (local.get $bxf) (f32.mul (local.get $sf) (f32.const 0.43)))
              (f32.add (local.get $byf) (f32.mul (local.get $sf) (f32.const 0.71)))
              (f32.mul (global.get $scale) (f32.const 1.8)) (global.get $c_bg))
            (call $line
              (f32.add (local.get $bxf) (f32.mul (local.get $sf) (f32.const 0.43)))
              (f32.add (local.get $byf) (f32.mul (local.get $sf) (f32.const 0.71)))
              (f32.add (local.get $bxf) (f32.mul (local.get $sf) (f32.const 0.77)))
              (f32.add (local.get $byf) (f32.mul (local.get $sf) (f32.const 0.3)))
              (f32.mul (global.get $scale) (f32.const 1.8)) (global.get $c_bg)))
          (else
            (call $rrect (local.get $bx) (local.get $by) (local.get $s) (local.get $s) (call $px (f32.const 3.5)) (global.get $c_muted))
            (call $rrect (i32.add (local.get $bx) (call $px (f32.const 1.5))) (i32.add (local.get $by) (call $px (f32.const 1.5)))
              (i32.sub (local.get $s) (call $px (f32.const 3))) (i32.sub (local.get $s) (call $px (f32.const 3)))
              (call $px (f32.const 2)) (global.get $c_bg)))))))

  ;; Draw the $digits decimal digits of $n from x; returns the end x.
  (func $draw_number (param $n i32) (param $digits i32) (param $x f32) (param $y i32) (param $size f32) (result f32)
    (local $div i32) (local $k i32) (local $d i32)
    (local.set $div (i32.const 1))
    (local.set $k (i32.const 1))
    (block $d0 (loop $l0
      (br_if $d0 (i32.ge_u (local.get $k) (local.get $digits)))
      (local.set $div (i32.mul (local.get $div) (i32.const 10)))
      (local.set $k (i32.add (local.get $k) (i32.const 1)))
      (br $l0)))
    (loop $l
      (local.set $d (i32.add (i32.const 48) (i32.rem_u (i32.div_u (local.get $n) (local.get $div)) (i32.const 10))))
      (call $draw_cp (local.get $d) (i32.const 0) (local.get $size) (i32.const 0)
        (i32.trunc_sat_f32_s (f32.nearest (local.get $x))) (local.get $y) (global.get $c_text))
      (local.set $x (f32.add (local.get $x) (f32.mul (f32.load (call $grec (i32.const 0) (call $gid (local.get $d)))) (local.get $size))))
      (local.set $div (i32.div_u (local.get $div) (i32.const 10)))
      (br_if $l (local.get $div)))
    (local.get $x))

  ;; The text of line $i with its line box at screen y $ys: backgrounds
  ;; (selection, inline code) in a first pass, glyphs and lines in a second.
  (func $draw_text (param $i i32) (param $ys i32)
    (local $a i32) (local $p i32) (local $end i32) (local $flags i32) (local $t i32) (local $h i32) (local $base i32)
    (local $x f32) (local $x0 f32) (local $c i32) (local $next i32) (local $w f32) (local $m i32) (local $s i32) (local $e i32)
    (local $xi i32) (local $xj i32) (local $sel i32) (local $face i32) (local $size f32) (local $col i32) (local $done i32)
    (local $ch i32) (local $link i32) (local $by i32) (local $fr i32)
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $p (i32.load (local.get $a)))
    (local.set $end (i32.load offset=4 (local.get $a)))
    (local.set $flags (i32.load offset=24 (local.get $a)))
    (local.set $t (call $type_of_flags (local.get $flags)))
    (local.set $h (i32.load offset=12 (local.get $a)))
    (local.set $base (i32.add (local.get $ys) (i32.load offset=16 (local.get $a))))
    (local.set $x0 (f32.convert_i32_s (i32.add (global.get $col_x) (i32.load offset=20 (local.get $a)))))
    (local.set $s (call $smin))
    (local.set $e (call $smax))
    (local.set $sel (select (global.get $c_sel) (global.get $c_sel_blur) (global.get $focused)))
    (local.set $done (i32.and (i32.eq (local.get $t) (i32.const 7)) (i32.ne (i32.and (local.get $flags) (i32.const 16)) (i32.const 0))))
    ;; pass 1: backgrounds
    (local.set $x (local.get $x0))
    (local.set $c (local.get $p))
    (block $d1
      (loop $l1
        (br_if $d1 (i32.ge_u (local.get $c) (local.get $end)))
        (local.set $ch (call $get (local.get $c)))
        (local.set $w (call $adv (local.get $ch) (call $get (i32.add (local.get $c) (i32.const 1))) (local.get $t)))
        (local.set $xi (i32.trunc_sat_f32_s (f32.nearest (local.get $x))))
        (local.set $xj (i32.trunc_sat_f32_s (f32.nearest (f32.add (local.get $x) (local.get $w)))))
        (local.set $m (call $marks_of (local.get $ch)))
        (if (i32.and (i32.ne (i32.and (local.get $m) (i32.const 16)) (i32.const 0)) (i32.ne (local.get $t) (i32.const 8)))
          (then
            (local.set $size (call $size_for (local.get $t) (i32.const 0)))
            (call $fill (local.get $xi)
              (i32.sub (local.get $base) (i32.trunc_sat_f32_s (f32.nearest (f32.mul (local.get $size) (f32.const 0.86)))))
              (i32.sub (local.get $xj) (local.get $xi))
              (i32.trunc_sat_f32_s (f32.nearest (f32.mul (local.get $size) (f32.const 1.16))))
              (global.get $c_code))))
        (if (i32.and (i32.ge_u (local.get $c) (local.get $s)) (i32.lt_u (local.get $c) (local.get $e)))
          (then (call $fill (local.get $xi) (local.get $ys) (i32.sub (local.get $xj) (local.get $xi)) (local.get $h) (local.get $sel))))
        (local.set $x (f32.add (local.get $x) (local.get $w)))
        (local.set $c (i32.add (local.get $c) (i32.const 1)))
        (br $l1)))
    ;; a selected block end shows as a little extra highlight
    (if (i32.and (i32.and (local.get $flags) (i32.const 0x200))
                 (i32.and (i32.ge_u (local.get $end) (local.get $s)) (i32.lt_u (local.get $end) (local.get $e))))
      (then (call $fill (i32.trunc_sat_f32_s (f32.nearest (local.get $x))) (local.get $ys) (call $px (f32.const 7)) (local.get $h) (local.get $sel))))
    ;; pass 2: glyphs, underlines, strikes
    (local.set $x (local.get $x0))
    (local.set $c (local.get $p))
    (block $d2
      (loop $l2
        (br_if $d2 (i32.ge_u (local.get $c) (local.get $end)))
        (local.set $ch (call $get (local.get $c)))
        (local.set $next (call $get (i32.add (local.get $c) (i32.const 1))))
        (local.set $w (call $adv (local.get $ch) (local.get $next) (local.get $t)))
        (local.set $m (call $marks_of (local.get $ch)))
        (local.set $link (i32.shr_u (local.get $ch) (i32.const 21)))
        (local.set $face (call $face_for (local.get $t) (local.get $m)))
        (local.set $size (call $size_for (local.get $t) (local.get $m)))
        (local.set $col
          (if (result i32) (local.get $link)
            (then (global.get $c_accent))
            (else
              (select (global.get $c_muted) (global.get $c_text)
                (i32.or (local.get $done) (i32.load offset=24 (call $style (local.get $t))))))))
        (local.set $xi (i32.trunc_sat_f32_s (f32.nearest (local.get $x))))
        (local.set $xj (i32.trunc_sat_f32_s (f32.nearest (f32.add (local.get $x) (local.get $w)))))
        (local.set $fr (i32.and (local.get $ch) (i32.const 0xFFFF)))
        (if (i32.eqz (i32.or (i32.or (i32.eq (local.get $fr) (i32.const 32)) (i32.eq (local.get $fr) (i32.const 9)))
                             (i32.eq (i32.and (local.get $fr) (i32.const 0xFC00)) (i32.const 0xDC00))))
          (then
            (call $draw_cp
              ;; the high half of a surrogate pair stands for a character outside the atlas
              (select (i32.const 0xFFFF) (local.get $fr) (i32.eq (i32.and (local.get $fr) (i32.const 0xFC00)) (i32.const 0xD800)))
              (local.get $face) (local.get $size)
              (i32.and (i32.eq (local.get $face) (i32.const 4)) (i32.ne (i32.and (local.get $m) (i32.const 1)) (i32.const 0)))
              (local.get $xi) (local.get $base) (local.get $col))))
        ;; underline (and links)
        (if (i32.or (local.get $link) (i32.ne (i32.and (local.get $m) (i32.const 4)) (i32.const 0)))
          (then
            (call $fill (local.get $xi)
              (i32.add (local.get $base)
                (i32.trunc_sat_f32_s (f32.nearest (f32.mul (f32.load offset=8 (call $face_rec (local.get $face))) (local.get $size)))))
              (i32.sub (local.get $xj) (local.get $xi)) (call $thin) (local.get $col))))
        ;; strikethrough (and done todos)
        (if (i32.or (local.get $done) (i32.ne (i32.and (local.get $m) (i32.const 8)) (i32.const 0)))
          (then
            (local.set $by (i32.sub (local.get $base)
              (i32.trunc_sat_f32_s (f32.nearest (f32.mul (f32.mul (f32.load offset=16 (call $face_rec (local.get $face))) (f32.const 0.55))
                                                         (local.get $size))))))
            (call $fill (local.get $xi) (local.get $by) (i32.sub (local.get $xj) (local.get $xi)) (call $thin) (local.get $col))))
        (local.set $x (f32.add (local.get $x) (local.get $w)))
        (local.set $c (i32.add (local.get $c) (i32.const 1)))
        (br $l2))))

  ;; ---------------------------------------------------------------------
  ;; The frame
  ;; ---------------------------------------------------------------------

  (func $paint
    (local $k i32) (local $a i32) (local $cy i32) (local $margin i32)
    (if (i32.eqz (global.get $ready)) (then (return)))
    (if (global.get $dirty) (then (call $relayout)))
    ;; scroll the caret into view when asked
    (global.set $g_line (call $line_of (global.get $focus)))
    (if (global.get $reveal)
      (then
        (local.set $a (call $line_addr (global.get $g_line)))
        (local.set $cy (i32.load offset=8 (local.get $a)))
        (local.set $margin (call $px (f32.const 24)))
        (if (i32.lt_s (i32.sub (local.get $cy) (local.get $margin)) (global.get $scroll))
          (then (global.set $scroll (i32.sub (local.get $cy) (local.get $margin)))))
        (if (i32.gt_s (i32.add (i32.add (local.get $cy) (i32.load offset=12 (local.get $a))) (local.get $margin))
                      (i32.add (global.get $scroll) (global.get $view_h)))
          (then (global.set $scroll (i32.sub (i32.add (i32.add (local.get $cy) (i32.load offset=12 (local.get $a))) (local.get $margin))
                                             (global.get $view_h)))))
        (global.set $reveal (i32.const 0))))
    (call $clamp_scroll)
    (call $touch_geom)
    (call $caret_geom (global.get $focus))
    (if (global.get $full)
      (then
        (call $clip (i32.const 0) (i32.const 0) (global.get $W) (global.get $H))
        (call $fill (i32.const 0) (i32.const 0) (global.get $W) (global.get $H) (global.get $c_bg))))
    ;; toolbar
    (local.set $k (call $toolbar_key))
    (if (i32.or (global.get $full) (i32.ne (local.get $k) (global.get $tb_key)))
      (then
        (global.set $tb_key (local.get $k))
        (call $paint_toolbar)
        (if (i32.eqz (global.get $full)) (then (call $host_present (i32.const 0) (i32.const 0) (global.get $W) (global.get $tb_h))))))
    ;; link bar
    (if (global.get $link_open)
      (then
        (local.set $k (call $linkbar_key))
        (if (i32.or (global.get $full) (i32.ne (local.get $k) (global.get $lb_key)))
          (then
            (global.set $lb_key (local.get $k))
            (call $paint_linkbar)
            (if (i32.eqz (global.get $full))
              (then (call $host_present (i32.const 0) (global.get $tb_h) (global.get $W) (global.get $lb_h))))))))
    ;; text
    (call $paint_bands)
    (if (i32.and (i32.eqz (global.get $full)) (i32.lt_s (global.get $d0) (global.get $d1)))
      (then (call $host_present (i32.const 0) (global.get $d0) (i32.sub (global.get $W) (global.get $strip_w))
              (i32.sub (global.get $d1) (global.get $d0)))))
    ;; scrollbar
    (local.set $k (call $strip_key))
    (if (i32.or (global.get $full) (i32.ne (local.get $k) (global.get $strip_key)))
      (then
        (global.set $strip_key (local.get $k))
        (call $paint_strip)
        (if (i32.eqz (global.get $full))
          (then (call $host_present (i32.sub (global.get $W) (global.get $strip_w)) (global.get $view_top)
                  (global.get $strip_w) (global.get $view_h))))))
    (if (global.get $full)
      (then
        (call $host_present (i32.const 0) (i32.const 0) (global.get $W) (global.get $H))
        (global.set $full (i32.const 0))))
    ;; tell the host where the caret is, for IME windows
    (local.set $a (call $line_addr (global.get $g_line)))
    (call $host_ime_rect
      (i32.add (global.get $col_x) (i32.trunc_sat_f32_s (global.get $g_x)))
      (i32.add (global.get $view_top) (i32.sub (i32.load offset=8 (local.get $a)) (global.get $scroll)))
      (call $px (f32.const 2))
      (i32.load offset=12 (local.get $a))))
