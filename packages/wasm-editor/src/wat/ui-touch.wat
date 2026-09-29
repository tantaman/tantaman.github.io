;; ui-touch.wat -- touch input: gestures, selection handles and the edit menu.
;;
;; A finger works as it does in a native text view:
;;   swipe        scrolls, and a flick keeps scrolling (momentum)
;;   tap          places the caret; a tap on the caret or on the selection
;;                opens or closes the edit menu
;;   double tap   selects a word, a third tap the paragraph
;;   long press   selects the word under the finger; dragging extends it
;;   handles      a selection made by touch has a handle at each end, and
;;                dragging one moves that end
;; The edit menu floats by the selection: Cut, Copy, Paste, or for a caret
;; Select, Select All, Paste. The clipboard is the host's, so touch_end
;; returns what the host should do:
;;   0 nothing   1 focus its text input (for the on-screen keyboard)
;;   2 copy      3 cut: copy, then call cut   4 paste: read the clipboard,
;;               then call paste
;; The long press, momentum and scrolling while a selection is dragged to
;; the edge run on the clock: tick() calls $touch_tick, which says when it
;; next wants to run.
;;
;; The handles and the menu are overlays. Each text band they cross mixes
;; them into its key and draws them over its text, so they are repainted
;; wherever they appear, move or leave.

  ;; the gesture
  (global $tmode (mut i32) (i32.const 0))   ;; 0 none, 1 undecided, 2 pan, 3 long press,
                                            ;; 4 handle, 5 ignored, 6 menu
  (global $tx0 (mut i32) (i32.const 0))     ;; where and when the finger came down
  (global $ty0 (mut i32) (i32.const 0))
  (global $tt0 (mut i32) (i32.const 0))
  (global $tx (mut i32) (i32.const 0))      ;; where it was last, and when
  (global $ty (mut i32) (i32.const 0))
  (global $tt (mut i32) (i32.const 0))
  (global $pan_y (mut i32) (i32.const 0))   ;; finger y and scroll when the pan began
  (global $pan_s (mut i32) (i32.const 0))
  (global $vel (mut f32) (f32.const 0))     ;; scroll speed, device px per ms
  (global $fling (mut i32) (i32.const 0))   ;; momentum scrolling
  (global $fpos (mut f32) (f32.const 0))    ;; the exact scroll during momentum
  (global $ft (mut i32) (i32.const 0))      ;; its last step
  (global $edge_t (mut i32) (i32.const 0))  ;; last step of scrolling at the edge
  (global $caught (mut i32) (i32.const 0))  ;; this touch stopped momentum: not a tap
  (global $taps (mut i32) (i32.const 0))
  (global $tap_t (mut i32) (i32.const -100000))
  (global $tap_x (mut i32) (i32.const 0))
  (global $tap_y (mut i32) (i32.const 0))
  (global $la (mut i32) (i32.const 0))      ;; the word a long press selected
  (global $lb (mut i32) (i32.const 0))
  (global $hgrab (mut i32) (i32.const -1)) ;; handle under the finger when it came down
  (global $grab_dy (mut i32) (i32.const 0)) ;; from the finger to the middle of that handle's line

  ;; what is shown
  (global $tsel (mut i32) (i32.const 0))    ;; the selection has handles
  (global $menu (mut i32) (i32.const 0))    ;; the edit menu is open
  (global $press (mut i32) (i32.const -1))  ;; menu item under the finger

  ;; this frame's geometry, in screen px: the selection's ends (caret x,
  ;; line top and height), whether handles are drawn, and the menu
  (global $h0x (mut i32) (i32.const 0))
  (global $h0y (mut i32) (i32.const 0))
  (global $h0h (mut i32) (i32.const 0))
  (global $h1x (mut i32) (i32.const 0))
  (global $h1y (mut i32) (i32.const 0))
  (global $h1h (mut i32) (i32.const 0))
  (global $hon (mut i32) (i32.const 0))
  (global $mon (mut i32) (i32.const 0))
  (global $mx (mut i32) (i32.const 0))
  (global $my (mut i32) (i32.const 0))
  (global $mw (mut i32) (i32.const 0))
  (global $mh (mut i32) (i32.const 0))
  (global $mn (mut i32) (i32.const 0))      ;; items at MENU

  ;; The menu and the handles go away (an edit, a click, a blur).
  (func $touch_off
    (global.set $menu (i32.const 0))
    (global.set $tsel (i32.const 0)))

  ;; Keep the scroll inside the document.
  (func $clamp_scroll
    (local $max i32)
    (local.set $max (i32.sub (global.get $doc_h) (global.get $view_h)))
    (if (i32.gt_s (global.get $scroll) (local.get $max)) (then (global.set $scroll (local.get $max))))
    (if (i32.lt_s (global.get $scroll) (i32.const 0)) (then (global.set $scroll (i32.const 0)))))

  ;; Screen y clamped to the text area.
  (func $clamp_y (param $y i32) (result i32)
    (if (i32.lt_s (local.get $y) (global.get $view_top)) (then (return (global.get $view_top))))
    (if (i32.ge_s (local.get $y) (global.get $H)) (then (return (i32.sub (global.get $H) (i32.const 1)))))
    (local.get $y))

  ;; The sooner of two waits, where -1 is never.
  (func $sooner (param $a i32) (param $b i32) (result i32)
    (if (i32.lt_s (local.get $a) (i32.const 0)) (then (return (local.get $b))))
    (if (i32.lt_s (local.get $b) (i32.const 0)) (then (return (local.get $a))))
    (select (local.get $a) (local.get $b) (i32.lt_s (local.get $a) (local.get $b))))

  ;; Radius of a handle's knob.
  (func $knob (result i32)
    (call $px (f32.const 6)))

  ;; ---------------------------------------------------------------------
  ;; Geometry, worked out at the start of each frame
  ;; ---------------------------------------------------------------------

  ;; The caret at $pos, stuck to the end of a wrapped line when $aff: sets
  ;; $g_line and $g_x, and returns the line's top on screen.
  (func $screen_caret (param $pos i32) (param $aff i32) (result i32)
    (local $keep i32)
    (local.set $keep (global.get $affinity))
    (global.set $affinity (local.get $aff))
    (call $caret_geom (local.get $pos))
    (global.set $affinity (local.get $keep))
    (i32.add (global.get $view_top) (i32.sub (i32.load offset=8 (call $line_addr (global.get $g_line))) (global.get $scroll))))

  (func $touch_geom
    (local $sel i32)
    (local.set $sel (i32.ne (global.get $anchor) (global.get $focus)))
    (if (local.get $sel)
      (then
        ;; the end handle stays on the line a wrapped selection ends on
        (global.set $h0y (call $screen_caret (call $smin) (i32.const 0)))
        (global.set $h0x (i32.add (global.get $col_x) (i32.trunc_sat_f32_s (f32.nearest (global.get $g_x)))))
        (global.set $h0h (i32.load offset=12 (call $line_addr (global.get $g_line))))
        (global.set $h1y (call $screen_caret (call $smax) (i32.const 1)))
        (global.set $h1x (i32.add (global.get $col_x) (i32.trunc_sat_f32_s (f32.nearest (global.get $g_x)))))
        (global.set $h1h (i32.load offset=12 (call $line_addr (global.get $g_line))))))
    (global.set $hon (i32.and (i32.and (global.get $tsel) (local.get $sel)) (i32.eqz (global.get $link_open))))
    (global.set $mon (i32.const 0))
    (if (i32.and (global.get $menu) (i32.eqz (global.get $link_open)))
      (then (call $layout_menu))))

  (func $menu_item (param $label i32) (param $action i32)
    (local $a i32)
    (local.set $a (i32.add (global.get $MENU) (i32.shl (global.get $mn) (i32.const 4))))
    (i32.store offset=8 (local.get $a) (local.get $label))
    (i32.store offset=12 (local.get $a) (local.get $action))
    (global.set $mn (i32.add (global.get $mn) (i32.const 1))))

  ;; Menu items are 16 bytes at MENU: +0 x  +4 w  +8 label  +12 action
  ;; (2 copy, 3 cut, 4 paste, 5 select the word, 6 select all). The menu
  ;; sits above the selection, below it when there is no room, and is
  ;; hidden while the selection is scrolled out of sight.
  (func $layout_menu
    (local $top i32) (local $bot i32) (local $cx i32) (local $gap i32) (local $pad i32) (local $size f32)
    (local $i i32) (local $a i32) (local $x i32) (local $w i32) (local $edge i32)
    (global.set $mn (i32.const 0))
    (if (i32.ne (global.get $anchor) (global.get $focus))
      (then
        (call $menu_item (i32.const 19) (i32.const 3))
        (call $menu_item (i32.const 20) (i32.const 2))
        (local.set $top (global.get $h0y))
        (local.set $bot (i32.add (global.get $h1y) (global.get $h1h)))
        (local.set $cx
          (if (result i32) (i32.eq (global.get $h0y) (global.get $h1y))
            (then (i32.shr_s (i32.add (global.get $h0x) (global.get $h1x)) (i32.const 1)))
            (else (i32.add (global.get $col_x) (i32.shr_s (global.get $col_w) (i32.const 1)))))))
      (else
        (if (i32.gt_u (call $len) (i32.const 1))
          (then
            (call $menu_item (i32.const 22) (i32.const 5))
            (call $menu_item (i32.const 23) (i32.const 6))))
        (local.set $top (call $screen_caret (global.get $focus) (global.get $affinity)))
        (local.set $bot (i32.add (local.get $top) (i32.load offset=12 (call $line_addr (global.get $g_line)))))
        (local.set $cx (i32.add (global.get $col_x) (i32.trunc_sat_f32_s (f32.nearest (global.get $g_x)))))))
    (call $menu_item (i32.const 21) (i32.const 4))
    (if (i32.or (i32.le_s (local.get $bot) (global.get $view_top)) (i32.ge_s (local.get $top) (global.get $H)))
      (then (return)))
    (local.set $size (f32.mul (global.get $scale) (f32.const 15)))
    (local.set $pad (call $px (f32.const 14)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (global.get $mn)))
        (local.set $a (i32.add (global.get $MENU) (i32.shl (local.get $i) (i32.const 4))))
        (i32.store offset=4 (local.get $a)
          (i32.add (i32.trunc_sat_f32_s (f32.ceil (call $str_width (i32.load offset=8 (local.get $a)) (i32.const 5) (local.get $size))))
                   (i32.shl (local.get $pad) (i32.const 1))))
        (local.set $w (i32.add (local.get $w) (i32.load offset=4 (local.get $a))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (global.set $mw (local.get $w))
    (global.set $mh (call $px (f32.const 38)))
    ;; clear of the handles' knobs
    (local.set $gap (call $px (f32.const 16)))
    (local.set $edge (call $px (f32.const 6)))
    (global.set $my (i32.sub (i32.sub (local.get $top) (local.get $gap)) (global.get $mh)))
    (if (i32.lt_s (global.get $my) (i32.add (global.get $view_top) (local.get $edge)))
      (then (global.set $my (i32.add (local.get $bot) (local.get $gap)))))
    (if (i32.gt_s (i32.add (global.get $my) (global.get $mh)) (i32.sub (global.get $H) (local.get $edge)))
      (then (global.set $my (i32.add (global.get $view_top) (local.get $edge)))))
    (local.set $edge (call $px (f32.const 8)))
    (local.set $x (i32.sub (local.get $cx) (i32.shr_s (local.get $w) (i32.const 1))))
    (if (i32.gt_s (i32.add (local.get $x) (local.get $w)) (i32.sub (i32.sub (global.get $W) (global.get $strip_w)) (local.get $edge)))
      (then (local.set $x (i32.sub (i32.sub (i32.sub (global.get $W) (global.get $strip_w)) (local.get $edge)) (local.get $w)))))
    (if (i32.lt_s (local.get $x) (local.get $edge)) (then (local.set $x (local.get $edge))))
    (global.set $mx (local.get $x))
    (local.set $i (i32.const 0))
    (block $d2
      (loop $l2
        (br_if $d2 (i32.ge_u (local.get $i) (global.get $mn)))
        (local.set $a (i32.add (global.get $MENU) (i32.shl (local.get $i) (i32.const 4))))
        (i32.store (local.get $a) (local.get $x))
        (local.set $x (i32.add (local.get $x) (i32.load offset=4 (local.get $a))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l2)))
    (global.set $mon (i32.const 1)))

  ;; ---------------------------------------------------------------------
  ;; Painting the overlays into the text bands
  ;; ---------------------------------------------------------------------

  ;; Does [$a, $b) overlap [$top, $bot)?
  (func $overlaps (param $a i32) (param $b i32) (param $top i32) (param $bot i32) (result i32)
    (i32.and (i32.lt_s (local.get $a) (local.get $bot)) (i32.gt_s (local.get $b) (local.get $top))))

  ;; Hash of the overlays crossing the band from $top to $bot.
  (func $overlay_key (param $top i32) (param $bot i32) (result i32)
    (local $h i32) (local $i i32) (local $k i32)
    (local.set $h (i32.const 0x811c9dc5))
    (local.set $k (i32.shl (call $knob) (i32.const 1)))
    (if (global.get $hon)
      (then
        (if (call $overlaps (i32.sub (global.get $h0y) (local.get $k)) (i32.add (global.get $h0y) (global.get $h0h))
                            (local.get $top) (local.get $bot))
          (then
            (local.set $h (call $mix (local.get $h) (i32.const 1)))
            (local.set $h (call $mix (local.get $h) (global.get $h0x)))
            (local.set $h (call $mix (local.get $h) (global.get $h0y)))
            (local.set $h (call $mix (local.get $h) (global.get $h0h)))))
        (if (call $overlaps (global.get $h1y) (i32.add (i32.add (global.get $h1y) (global.get $h1h)) (local.get $k))
                            (local.get $top) (local.get $bot))
          (then
            (local.set $h (call $mix (local.get $h) (i32.const 2)))
            (local.set $h (call $mix (local.get $h) (global.get $h1x)))
            (local.set $h (call $mix (local.get $h) (global.get $h1y)))
            (local.set $h (call $mix (local.get $h) (global.get $h1h)))))))
    (if (global.get $mon)
      (then
        (if (call $overlaps (global.get $my) (i32.add (global.get $my) (global.get $mh)) (local.get $top) (local.get $bot))
          (then
            (local.set $h (call $mix (local.get $h) (i32.const 3)))
            (local.set $h (call $mix (local.get $h) (global.get $mx)))
            (local.set $h (call $mix (local.get $h) (global.get $my)))
            (local.set $h (call $mix (local.get $h) (global.get $mw)))
            (local.set $h (call $mix (local.get $h) (global.get $press)))
            (block $d
              (loop $l
                (br_if $d (i32.ge_u (local.get $i) (global.get $mn)))
                (local.set $h (call $mix (local.get $h)
                  (i32.load offset=8 (i32.add (global.get $MENU) (i32.shl (local.get $i) (i32.const 4))))))
                (local.set $i (i32.add (local.get $i) (i32.const 1)))
                (br $l)))))))
    (local.get $h))

  ;; Draw the overlays, clipped to the band being painted.
  (func $paint_overlays
    (local $r i32) (local $bw i32)
    (if (global.get $hon)
      (then
        (local.set $r (call $knob))
        (local.set $bw (select (call $px (f32.const 2)) (i32.const 1) (i32.gt_s (call $px (f32.const 2)) (i32.const 1))))
        ;; a bar down each end, with the knob above the start and below the end
        (call $fill (i32.sub (global.get $h0x) (i32.shr_s (local.get $bw) (i32.const 1))) (global.get $h0y)
          (local.get $bw) (global.get $h0h) (global.get $c_accent))
        (call $rrect (i32.sub (global.get $h0x) (local.get $r)) (i32.sub (global.get $h0y) (i32.shl (local.get $r) (i32.const 1)))
          (i32.shl (local.get $r) (i32.const 1)) (i32.shl (local.get $r) (i32.const 1)) (local.get $r) (global.get $c_accent))
        (call $fill (i32.sub (global.get $h1x) (i32.shr_s (local.get $bw) (i32.const 1))) (global.get $h1y)
          (local.get $bw) (global.get $h1h) (global.get $c_accent))
        (call $rrect (i32.sub (global.get $h1x) (local.get $r)) (i32.add (global.get $h1y) (global.get $h1h))
          (i32.shl (local.get $r) (i32.const 1)) (i32.shl (local.get $r) (i32.const 1)) (local.get $r) (global.get $c_accent))))
    (if (global.get $mon) (then (call $paint_menu))))

  (func $paint_menu
    (local $i i32) (local $a i32) (local $r i32) (local $size f32) (local $base i32) (local $x0 i32) (local $x1 i32)
    (local $k0 i32) (local $k1 i32)
    (if (i32.eqz (call $overlaps (global.get $my) (i32.add (global.get $my) (global.get $mh)) (global.get $cy0) (global.get $cy1)))
      (then (return)))
    (local.set $r (call $px (f32.const 9)))
    (call $rrect (global.get $mx) (global.get $my) (global.get $mw) (global.get $mh) (local.get $r) (global.get $c_menu))
    (local.set $size (f32.mul (global.get $scale) (f32.const 15)))
    (local.set $base (i32.add (global.get $my)
      (i32.trunc_sat_f32_s (f32.nearest (f32.add (f32.mul (f32.convert_i32_s (global.get $mh)) (f32.const 0.5))
                                                 (f32.mul (local.get $size) (f32.const 0.36)))))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (global.get $mn)))
        (local.set $a (i32.add (global.get $MENU) (i32.shl (local.get $i) (i32.const 4))))
        (local.set $x0 (i32.load (local.get $a)))
        (local.set $x1 (i32.add (local.get $x0) (i32.load offset=4 (local.get $a))))
        ;; the pressed item: the menu again in a lighter colour, clipped to
        ;; the item, which keeps the rounded ends
        (if (i32.eq (local.get $i) (global.get $press))
          (then
            (local.set $k0 (global.get $cx0))
            (local.set $k1 (global.get $cx1))
            (global.set $cx0 (select (local.get $x0) (local.get $k0) (i32.gt_s (local.get $x0) (local.get $k0))))
            (global.set $cx1 (select (local.get $x1) (local.get $k1) (i32.lt_s (local.get $x1) (local.get $k1))))
            (call $rrect (global.get $mx) (global.get $my) (global.get $mw) (global.get $mh) (local.get $r) (global.get $c_menu_press))
            (global.set $cx0 (local.get $k0))
            (global.set $cx1 (local.get $k1))))
        (if (local.get $i)
          (then (call $fill (local.get $x0) (i32.add (global.get $my) (call $px (f32.const 9)))
                  (select (call $px (f32.const 1)) (i32.const 1) (i32.gt_s (call $px (f32.const 1)) (i32.const 1)))
                  (i32.sub (global.get $mh) (call $px (f32.const 18))) (global.get $c_menu_rule))))
        (drop (call $draw_str (i32.load offset=8 (local.get $a)) (i32.const 5) (local.get $size)
          (f32.convert_i32_s (i32.add (local.get $x0) (call $px (f32.const 14)))) (local.get $base) (global.get $c_menu_fg)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l))))

  ;; ---------------------------------------------------------------------
  ;; Hit testing
  ;; ---------------------------------------------------------------------

  ;; Menu item at (x, y), or -1.
  (func $menu_at (param $x i32) (param $y i32) (result i32)
    (local $i i32) (local $a i32)
    (if (i32.eqz (global.get $mon)) (then (return (i32.const -1))))
    (if (i32.or (i32.lt_s (local.get $y) (global.get $my)) (i32.ge_s (local.get $y) (i32.add (global.get $my) (global.get $mh))))
      (then (return (i32.const -1))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (global.get $mn)))
        (local.set $a (i32.add (global.get $MENU) (i32.shl (local.get $i) (i32.const 4))))
        (if (i32.and (i32.ge_s (local.get $x) (i32.load (local.get $a)))
                     (i32.lt_s (local.get $x) (i32.add (i32.load (local.get $a)) (i32.load offset=4 (local.get $a)))))
          (then (return (local.get $i))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (i32.const -1))

  ;; Handle at (x, y): 0 the start, 1 the end, or -1. Each reaches a
  ;; finger's width around its bar and knob; the nearer knob wins.
  (func $handle_at (param $x i32) (param $y i32) (result i32)
    (local $reach i32) (local $k i32) (local $d0 i32) (local $d1 i32)
    (if (i32.eqz (global.get $hon)) (then (return (i32.const -1))))
    (local.set $reach (call $px (f32.const 22)))
    (local.set $k (call $knob))
    (local.set $d0 (i32.const 0x7FFFFFFF))
    (local.set $d1 (i32.const 0x7FFFFFFF))
    (if (i32.and (i32.le_s (call $iabs (i32.sub (local.get $x) (global.get $h0x))) (local.get $reach))
          (i32.and (i32.ge_s (local.get $y) (i32.sub (global.get $h0y) (i32.add (i32.shl (local.get $k) (i32.const 1)) (call $px (f32.const 14)))))
                   (i32.lt_s (local.get $y) (i32.add (global.get $h0y) (global.get $h0h)))))
      (then (local.set $d0 (i32.add (call $iabs (i32.sub (local.get $x) (global.get $h0x)))
                                    (call $iabs (i32.sub (local.get $y) (i32.sub (global.get $h0y) (local.get $k))))))))
    (if (i32.and (i32.le_s (call $iabs (i32.sub (local.get $x) (global.get $h1x))) (local.get $reach))
          (i32.and (i32.ge_s (local.get $y) (global.get $h1y))
                   (i32.lt_s (local.get $y) (i32.add (i32.add (global.get $h1y) (global.get $h1h))
                                                     (i32.add (i32.shl (local.get $k) (i32.const 1)) (call $px (f32.const 14)))))))
      (then (local.set $d1 (i32.add (call $iabs (i32.sub (local.get $x) (global.get $h1x)))
                                    (call $iabs (i32.sub (local.get $y) (i32.add (i32.add (global.get $h1y) (global.get $h1h)) (local.get $k))))))))
    (if (i32.and (i32.eq (local.get $d0) (i32.const 0x7FFFFFFF)) (i32.eq (local.get $d1) (i32.const 0x7FFFFFFF)))
      (then (return (i32.const -1))))
    (i32.gt_s (local.get $d0) (local.get $d1)))

  ;; ---------------------------------------------------------------------
  ;; Gestures
  ;; ---------------------------------------------------------------------

  (func (export "touch_start") (param $x i32) (param $y i32) (param $now i32)
    (local $k i32)
    (global.set $now (local.get $now))
    ;; a touch stops momentum, and is not a tap then
    (global.set $caught (global.get $fling))
    (global.set $fling (i32.const 0))
    (global.set $vel (f32.const 0))
    (global.set $tx0 (local.get $x))
    (global.set $ty0 (local.get $y))
    (global.set $tt0 (local.get $now))
    (global.set $tx (local.get $x))
    (global.set $ty (local.get $y))
    (global.set $tt (local.get $now))
    (global.set $edge_t (local.get $now))
    (global.set $tmode (i32.const 1))
    (local.set $k (call $menu_at (local.get $x) (local.get $y)))
    (if (i32.ge_s (local.get $k) (i32.const 0))
      (then
        (global.set $tmode (i32.const 6))
        (global.set $press (local.get $k))
        (call $paint)
        (return)))
    ;; on a handle, moving drags it (a tap there is still a tap)
    (global.set $hgrab (call $handle_at (local.get $x) (local.get $y)))
    (global.set $grab_dy (i32.sub
      (select
        (i32.add (global.get $h1y) (i32.shr_s (global.get $h1h) (i32.const 1)))
        (i32.add (global.get $h0y) (i32.shr_s (global.get $h0h) (i32.const 1)))
        (i32.eq (global.get $hgrab) (i32.const 1)))
      (local.get $y)))
    ;; a toolbar button lights up while pressed
    (if (i32.lt_s (local.get $y) (global.get $tb_h))
      (then (global.set $hover (call $button_at (local.get $x) (local.get $y)))))
    (call $paint))

  (func (export "touch_move") (param $x i32) (param $y i32) (param $now i32)
    (local $slop i32) (local $dt i32) (local $v f32)
    (global.set $now (local.get $now))
    ;; moving further than a tap's wobble drags a handle, or pans
    (if (i32.eq (global.get $tmode) (i32.const 1))
      (then
        (local.set $slop (call $px (f32.const 10)))
        (if (i32.or (i32.gt_s (call $iabs (i32.sub (local.get $x) (global.get $tx0))) (local.get $slop))
                    (i32.gt_s (call $iabs (i32.sub (local.get $y) (global.get $ty0))) (local.get $slop)))
          (then
            (if (i32.lt_s (global.get $ty0) (global.get $view_top))
              (then
                (global.set $tmode (i32.const 5))
                (global.set $hover (i32.const -1)))
              (else
                (if (i32.ge_s (global.get $hgrab) (i32.const 0))
                  (then
                    ;; the other end becomes the anchor
                    (global.set $tmode (i32.const 4))
                    (global.set $menu (i32.const 0))
                    (if (global.get $hgrab)
                      (then (call $set_selection (call $smin) (call $smax)))
                      (else (call $set_selection (call $smax) (call $smin)))))
                  (else
                    (global.set $tmode (i32.const 2))
                    (global.set $pan_y (local.get $y))
                    (global.set $pan_s (global.get $scroll))))))))))
    (if (i32.eq (global.get $tmode) (i32.const 2))
      (then
        (global.set $scroll (i32.add (global.get $pan_s) (i32.sub (global.get $pan_y) (local.get $y))))
        ;; past either end, the text stops there and follows as soon as the
        ;; finger turns back
        (call $clamp_scroll)
        (if (i32.ne (global.get $scroll) (i32.add (global.get $pan_s) (i32.sub (global.get $pan_y) (local.get $y))))
          (then
            (global.set $pan_y (local.get $y))
            (global.set $pan_s (global.get $scroll))))
        ;; the speed, smoothed over the last few moves
        (local.set $dt (i32.sub (local.get $now) (global.get $tt)))
        (if (i32.le_s (local.get $dt) (i32.const 0)) (then (call $paint) (return)))
        (local.set $v (f32.div (f32.convert_i32_s (i32.sub (global.get $ty) (local.get $y))) (f32.convert_i32_s (local.get $dt))))
        (global.set $vel
          (if (result f32) (i32.gt_s (local.get $dt) (i32.const 40))
            (then (local.get $v))
            (else (f32.add (f32.mul (local.get $v) (f32.const 0.8)) (f32.mul (global.get $vel) (f32.const 0.2))))))))
    (global.set $tx (local.get $x))
    (global.set $ty (local.get $y))
    (global.set $tt (local.get $now))
    (if (i32.eq (global.get $tmode) (i32.const 3)) (then (call $extend_word (local.get $x) (local.get $y))))
    (if (i32.eq (global.get $tmode) (i32.const 4)) (then (call $drag_handle (local.get $x) (local.get $y))))
    (if (i32.eq (global.get $tmode) (i32.const 6)) (then (global.set $press (call $menu_at (local.get $x) (local.get $y)))))
    (call $paint))

  ;; Returns what the host should do (see the top of this file).
  (func (export "touch_end") (param $x i32) (param $y i32) (param $now i32) (result i32)
    (local $mode i32) (local $act i32) (local $max f32)
    (global.set $now (local.get $now))
    (local.set $mode (global.get $tmode))
    (global.set $tmode (i32.const 0))
    (global.set $hover (i32.const -1))
    ;; a long press the clock has not caught up with yet
    (if (i32.and (i32.eq (local.get $mode) (i32.const 1))
          (i32.and (i32.ge_s (i32.sub (local.get $now) (global.get $tt0)) (i32.const 500))
                   (i32.ge_s (global.get $ty0) (global.get $view_top))))
      (then (call $long_press) (local.set $mode (i32.const 3))))
    (if (i32.and (i32.eq (local.get $mode) (i32.const 1)) (i32.eqz (global.get $caught)))
      (then (local.set $act (call $tap (local.get $now)))))
    ;; a flick keeps scrolling, unless the finger rested before lifting
    (if (i32.and (i32.eq (local.get $mode) (i32.const 2)) (i32.lt_s (i32.sub (local.get $now) (global.get $tt)) (i32.const 60)))
      (then
        (local.set $max (f32.mul (global.get $scale) (f32.const 6)))
        (global.set $vel (f32.max (f32.neg (local.get $max)) (f32.min (local.get $max) (global.get $vel))))
        (if (f32.gt (f32.abs (global.get $vel)) (f32.mul (global.get $scale) (f32.const 0.1)))
          (then
            (global.set $fling (i32.const 1))
            (global.set $fpos (f32.convert_i32_s (global.get $scroll)))
            (global.set $ft (local.get $now))))))
    (if (i32.or (i32.eq (local.get $mode) (i32.const 3)) (i32.eq (local.get $mode) (i32.const 4)))
      (then
        (global.set $menu (i32.const 1))
        (local.set $act (i32.const 1))))
    (if (i32.eq (local.get $mode) (i32.const 6))
      (then
        (if (i32.ge_s (global.get $press) (i32.const 0))
          (then (local.set $act (call $menu_action
                  (i32.load offset=12 (i32.add (global.get $MENU) (i32.shl (global.get $press) (i32.const 4))))))))
        (global.set $press (i32.const -1))))
    (call $paint)
    (local.get $act))

  (func (export "touch_cancel") (param $now i32)
    (global.set $now (local.get $now))
    (global.set $tmode (i32.const 0))
    (global.set $press (i32.const -1))
    (global.set $hover (i32.const -1))
    (call $paint))

  ;; A tap where the finger came down.
  (func $tap (param $now i32) (result i32)
    (local $x i32) (local $y i32) (local $p i32) (local $b i32) (local $near i32) (local $toggled i32)
    (local.set $x (global.get $tx0))
    (local.set $y (global.get $ty0))
    (if (i32.lt_s (local.get $y) (global.get $tb_h))
      (then
        (local.set $b (call $button_at (local.get $x) (local.get $y)))
        (if (i32.ge_s (local.get $b) (i32.const 0))
          (then (global.set $menu (i32.const 0)) (call $toolbar_action (local.get $b))))
        ;; typing a URL needs the keyboard
        (return (global.get $link_open))))
    (if (i32.lt_s (local.get $y) (global.get $view_top)) (then (return (i32.const 1))))
    (local.set $p (call $checkbox_at (local.get $x) (local.get $y)))
    (if (i32.ge_s (local.get $p) (i32.const 0))
      (then
        (global.set $menu (i32.const 0))
        (drop (call $toggle_check (local.get $p)))
        (return (i32.const 0))))
    (local.set $p (call $pos_at_point (local.get $x) (local.get $y)))
    ;; count taps for double and triple taps; fingers land less exactly than a mouse
    (local.set $near (call $px (f32.const 24)))
    (if (i32.and
          (i32.lt_s (i32.sub (local.get $now) (global.get $tap_t)) (i32.const 400))
          (i32.and
            (i32.le_s (call $iabs (i32.sub (local.get $x) (global.get $tap_x))) (local.get $near))
            (i32.le_s (call $iabs (i32.sub (local.get $y) (global.get $tap_y))) (local.get $near))))
      (then (global.set $taps (i32.add (i32.rem_u (global.get $taps) (i32.const 3)) (i32.const 1))))
      (else (global.set $taps (i32.const 1))))
    (global.set $tap_t (local.get $now))
    (global.set $tap_x (local.get $x))
    (global.set $tap_y (local.get $y))
    (global.set $goal_x (f32.const -1))
    (global.set $pre_len (i32.const 0))
    (if (i32.eq (global.get $taps) (i32.const 1))
      (then
        (if (i32.and (i32.ne (global.get $anchor) (global.get $focus))
              (i32.and (i32.ge_u (local.get $p) (call $smin)) (i32.le_u (local.get $p) (call $smax))))
          ;; on the selection: the menu comes or goes
          (then
            (local.set $toggled (i32.const 1))
            (global.set $menu (i32.eqz (global.get $menu)))
            (global.set $tsel (i32.const 1)))
          (else
            (if (i32.and (i32.and (global.get $focused) (i32.eq (global.get $anchor) (global.get $focus)))
                         (i32.eq (local.get $p) (global.get $focus)))
              ;; on the caret, likewise
              (then
                (local.set $toggled (i32.const 1))
                (global.set $menu (i32.eqz (global.get $menu))))
              (else
                ;; a tap on a formula opens it
                (local.set $b (call $math_hit (local.get $x) (local.get $y)))
                (if (i32.ge_s (local.get $b) (i32.const 0)) (then (local.set $p (local.get $b))))
                (call $set_selection (local.get $p) (local.get $p))
                (call $touch_off)))))))
    (if (i32.eq (global.get $taps) (i32.const 2))
      (then
        (call $word_range (local.get $p))
        (call $set_selection (global.get $wa) (global.get $wb))))
    (if (i32.eq (global.get $taps) (i32.const 3))
      (then (call $set_selection (call $block_start (local.get $p)) (call $nl_after (local.get $p)))))
    (if (i32.gt_u (global.get $taps) (i32.const 1))
      (then
        (global.set $affinity (i32.const 0))
        (global.set $tsel (i32.const 1))
        (global.set $menu (i32.const 1))))
    ;; the view stays put for the menu, even with the selection's end out of sight
    (if (local.get $toggled)
      (then (global.set $blink_t (global.get $now)))
      (else (call $moved)))
    (i32.const 1))

  ;; Held still: select the word under the finger (or put the caret there,
  ;; on spaces or an empty line).
  (func $long_press
    (local $p i32)
    (global.set $tmode (i32.const 3))
    (global.set $menu (i32.const 0))
    (global.set $goal_x (f32.const -1))
    (global.set $pre_len (i32.const 0))
    (local.set $p (call $pos_at_point (global.get $tx) (call $clamp_y (global.get $ty))))
    (call $word_range (local.get $p))
    (if (i32.or (i32.eq (global.get $wa) (global.get $wb))
                (i32.eqz (call $char_class (call $get (global.get $wa)))))
      (then
        (global.set $wa (local.get $p))
        (global.set $wb (local.get $p)))
      (else (global.set $affinity (i32.const 0))))
    (global.set $la (global.get $wa))
    (global.set $lb (global.get $wb))
    (call $set_selection (global.get $wa) (global.get $wb))
    (global.set $tsel (i32.const 1))
    (call $moved))

  ;; Dragging leaves the scrolling to the edges (see $touch_tick), like a
  ;; mouse drag, rather than revealing the moving end.

  ;; After a long press, the selection runs from the pressed word to the finger.
  (func $extend_word (param $x i32) (param $y i32)
    (local $p i32)
    (local.set $p (call $pos_at_point (local.get $x) (call $clamp_y (local.get $y))))
    (if (i32.lt_u (local.get $p) (global.get $la))
      (then (call $set_selection (global.get $lb) (local.get $p)))
      (else (call $set_selection (global.get $la)
              (select (local.get $p) (global.get $lb) (i32.gt_u (local.get $p) (global.get $lb)))))))

  ;; The dragged handle follows the finger; the two ends never meet.
  (func $drag_handle (param $x i32) (param $y i32)
    (local $p i32)
    (local.set $p (call $pos_at_point (local.get $x) (call $clamp_y (i32.add (local.get $y) (global.get $grab_dy)))))
    (if (i32.ne (local.get $p) (global.get $anchor))
      (then (call $set_selection (global.get $anchor) (local.get $p)))))

  (func $menu_action (param $act i32) (result i32)
    ;; the clipboard is the host's; copying keeps the selection's handles
    (if (i32.le_u (local.get $act) (i32.const 4))
      (then
        (global.set $menu (i32.const 0))
        (if (i32.ne (local.get $act) (i32.const 2)) (then (global.set $tsel (i32.const 0))))
        (return (local.get $act))))
    (if (i32.eq (local.get $act) (i32.const 5))
      (then
        (call $word_range (global.get $focus))
        (call $set_selection (global.get $wa) (global.get $wb)))
      (else (call $set_selection (i32.const 0) (i32.sub (call $len) (i32.const 1)))))
    (global.set $affinity (i32.const 0))
    (global.set $tsel (i32.const 1))
    (global.set $blink_t (global.get $now))
    (i32.const 1))

  ;; ---------------------------------------------------------------------
  ;; The clock: long press, momentum, scrolling at the edges
  ;; ---------------------------------------------------------------------

  ;; Called by tick before painting; returns ms until it next wants to
  ;; run, or -1.
  (func $touch_tick (result i32)
    (local $wait i32) (local $el i32) (local $dt i32) (local $zone i32) (local $d i32) (local $step i32)
    (local.set $wait (i32.const -1))
    (if (i32.and (i32.eq (global.get $tmode) (i32.const 1)) (i32.ge_s (global.get $ty0) (global.get $view_top)))
      (then
        (local.set $el (i32.sub (global.get $now) (global.get $tt0)))
        (if (i32.ge_s (local.get $el) (i32.const 500))
          (then (call $long_press))
          (else (local.set $wait (i32.sub (i32.const 500) (local.get $el)))))))
    ;; momentum: the speed decays by 0.2% a millisecond
    (if (global.get $fling)
      (then
        (local.set $dt (i32.sub (global.get $now) (global.get $ft)))
        (if (i32.gt_s (local.get $dt) (i32.const 1000)) (then (local.set $dt (i32.const 1000))))
        (global.set $ft (global.get $now))
        (block $d
          (loop $l
            (br_if $d (i32.le_s (local.get $dt) (i32.const 0)))
            (global.set $fpos (f32.add (global.get $fpos) (global.get $vel)))
            (global.set $vel (f32.mul (global.get $vel) (f32.const 0.998)))
            (local.set $dt (i32.sub (local.get $dt) (i32.const 1)))
            (br $l)))
        (global.set $scroll (i32.trunc_sat_f32_s (f32.nearest (global.get $fpos))))
        (call $clamp_scroll)
        ;; stop at either end, or once it has slowed right down
        (if (i32.or (i32.ne (global.get $scroll) (i32.trunc_sat_f32_s (f32.nearest (global.get $fpos))))
                    (f32.lt (f32.abs (global.get $vel)) (f32.mul (global.get $scale) (f32.const 0.02))))
          (then (global.set $fling (i32.const 0)))
          (else (local.set $wait (call $sooner (local.get $wait) (i32.const 16)))))))
    ;; a selection dragged to the top or bottom edge scrolls, faster the
    ;; closer it gets
    (if (i32.or (i32.eq (global.get $tmode) (i32.const 3)) (i32.eq (global.get $tmode) (i32.const 4)))
      (then
        (local.set $zone (call $px (f32.const 36)))
        (if (i32.lt_s (global.get $ty) (i32.add (global.get $view_top) (local.get $zone)))
          (then (local.set $d (i32.sub (global.get $ty) (i32.add (global.get $view_top) (local.get $zone))))))
        (if (i32.gt_s (global.get $ty) (i32.sub (global.get $H) (local.get $zone)))
          (then (local.set $d (i32.sub (global.get $ty) (i32.sub (global.get $H) (local.get $zone))))))
        (local.set $dt (i32.sub (global.get $now) (global.get $edge_t)))
        (if (i32.gt_s (local.get $dt) (i32.const 50)) (then (local.set $dt (i32.const 50))))
        (global.set $edge_t (global.get $now))
        (if (local.get $d)
          (then
            (local.set $step (i32.trunc_sat_f32_s (f32.nearest
              (f32.mul (f32.div (f32.convert_i32_s (local.get $d)) (f32.convert_i32_s (local.get $zone)))
                       (f32.mul (f32.convert_i32_s (local.get $dt)) (f32.mul (global.get $scale) (f32.const 0.8)))))))
            (if (i32.and (i32.eqz (local.get $step)) (i32.gt_s (local.get $dt) (i32.const 0)))
              (then (local.set $step (select (i32.const 1) (i32.const -1) (i32.gt_s (local.get $d) (i32.const 0))))))
            (global.set $scroll (i32.add (global.get $scroll) (local.get $step)))
            (call $clamp_scroll)
            (if (i32.eq (global.get $tmode) (i32.const 3))
              (then (call $extend_word (global.get $tx) (global.get $ty)))
              (else (call $drag_handle (global.get $tx) (global.get $ty))))
            (local.set $wait (call $sooner (local.get $wait) (i32.const 16)))))))
    (local.get $wait))
