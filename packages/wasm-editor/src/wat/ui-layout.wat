;; ui-layout.wat -- breaking blocks into visual lines, and mapping between
;; document positions and points on screen.
;;
;; A laid-out line is 32 bytes at LINES:
;;   +0 start   +4 end (exclusive; the block terminator for a block's last line)
;;   +8 y (top of the line box, document px)   +12 height   +16 baseline from y
;;   +20 text left, from the column's left edge
;;   +24 flags: bits 0-7 block attrs (type, checked), 8 first line of block,
;;       9 last line of block, 10 first line of a code group, 11 last line of
;;       a code group, 12 the next block continues this quote, 16-31 list number
;;   +28 band top: lines tile the document vertically, each owning the space
;;       down to the next line's band top. Repainting works in these bands.

  (func $line_addr (param $i i32) (result i32)
    (i32.add (global.get $LINES) (i32.shl (local.get $i) (i32.const 5))))

  (func $type_of_flags (param $f i32) (result i32)
    (local $t i32)
    (local.set $t (i32.and (local.get $f) (i32.const 15)))
    (select (local.get $t) (i32.const 0) (i32.le_u (local.get $t) (i32.const 8))))

  ;; Set flag bits on line $i.
  (func $flag_line (param $i i32) (param $bits i32)
    (local $a i32)
    (if (i32.lt_s (local.get $i) (i32.const 0)) (then (return)))
    (local.set $a (call $line_addr (local.get $i)))
    (i32.store offset=24 (local.get $a) (i32.or (i32.load offset=24 (local.get $a)) (local.get $bits))))

  (func $put_line (param $n i32) (param $start i32) (param $end i32) (param $y i32) (param $h i32) (param $base i32)
                  (param $x0 i32) (param $flags i32) (param $band i32)
    (local $a i32)
    (local.set $a (call $line_addr (local.get $n)))
    (i32.store (local.get $a) (local.get $start))
    (i32.store offset=4 (local.get $a) (local.get $end))
    (i32.store offset=8 (local.get $a) (local.get $y))
    (i32.store offset=12 (local.get $a) (local.get $h))
    (i32.store offset=16 (local.get $a) (local.get $base))
    (i32.store offset=20 (local.get $a) (local.get $x0))
    (i32.store offset=24 (local.get $a) (local.get $flags))
    (i32.store offset=28 (local.get $a) (local.get $band)))

  ;; Lay out the whole document into LINES.
  (func $relayout
    (local $len i32) (local $p i32) (local $q i32) (local $attrs i32) (local $t i32) (local $st i32)
    (local $y i32) (local $n i32) (local $prev i32) (local $prev_after f32) (local $pad i32) (local $ord i32)
    (local $size f32) (local $face i32) (local $lh i32) (local $base i32) (local $indent i32) (local $width f32)
    (local $ls i32) (local $i i32) (local $c i32) (local $a f32) (local $x f32) (local $brk i32) (local $wsb f32)
    (local $flags i32) (local $band i32) (local $first i32) (local $group_first i32) (local $ch i32)
    (local.set $len (call $len))
    (local.set $pad (call $px (f32.const 12)))
    (local.set $y (call $px (f32.const 30)))
    (local.set $prev (i32.const -1))
    (block $done
      (loop $blocks
        (br_if $done (i32.ge_u (local.get $p) (local.get $len)))
        (local.set $q (call $nl_after (local.get $p)))
        (local.set $attrs (i32.and (i32.shr_u (call $get (local.get $q)) (i32.const 16)) (i32.const 0xFF)))
        (local.set $t (call $type_of_flags (local.get $attrs)))
        (local.set $st (call $style (local.get $t)))
        ;; space above: collapse margins, keep runs of lists/quotes/code tight
        (local.set $group_first (i32.const 0))
        (if (i32.ge_s (local.get $prev) (i32.const 0))
          (then
            (if (i32.and (i32.eq (local.get $prev) (i32.const 8)) (i32.ne (local.get $t) (i32.const 8)))
              (then
                (local.set $y (i32.add (local.get $y) (local.get $pad)))
                (call $flag_line (i32.sub (local.get $n) (i32.const 1)) (i32.const 0x800))))
            (if (i32.and (i32.eq (local.get $t) (local.get $prev))
                         (f32.ge (f32.load offset=28 (local.get $st)) (f32.const 0)))
              (then (local.set $y (i32.add (local.get $y) (call $px (f32.load offset=28 (local.get $st))))))
              (else
                (local.set $y (i32.add (local.get $y)
                  (call $px (f32.max (local.get $prev_after) (f32.load offset=16 (local.get $st))))))))))
        (if (i32.and (i32.eq (local.get $t) (i32.const 8)) (i32.ne (local.get $prev) (i32.const 8)))
          (then
            (local.set $group_first (i32.const 1))
            (local.set $y (i32.add (local.get $y) (local.get $pad)))))
        (if (i32.and (i32.eq (local.get $t) (i32.const 4)) (i32.eq (local.get $prev) (i32.const 4)))
          (then (call $flag_line (i32.sub (local.get $n) (i32.const 1)) (i32.const 0x1000))))
        (local.set $ord
          (if (result i32) (i32.eq (local.get $t) (i32.const 6))
            (then (select (i32.add (local.get $ord) (i32.const 1)) (i32.const 1) (i32.eq (local.get $prev) (i32.const 6))))
            (else (i32.const 0))))
        ;; line box for this block
        (local.set $size (call $size_for (local.get $t) (i32.const 0)))
        (local.set $face (call $face_for (local.get $t) (i32.const 0)))
        (local.set $lh (i32.trunc_sat_f32_s (f32.nearest (f32.mul (local.get $size) (f32.load offset=4 (local.get $st))))))
        (local.set $base (i32.trunc_sat_f32_s (f32.nearest
          (f32.add
            (f32.mul (f32.sub (f32.convert_i32_s (local.get $lh))
                              (f32.mul (f32.add (call $ascent (local.get $face)) (call $descent (local.get $face))) (local.get $size)))
                     (f32.const 0.5))
            (f32.mul (call $ascent (local.get $face)) (local.get $size))))))
        (local.set $indent (call $px (f32.load offset=12 (local.get $st))))
        (local.set $width (f32.convert_i32_s (i32.sub (global.get $col_w)
          (i32.add (local.get $indent) (select (local.get $indent) (i32.const 0) (i32.eq (local.get $t) (i32.const 8)))))))
        ;; greedy wrapping at spaces; a word wider than the line is split
        (local.set $ls (local.get $p))
        (local.set $x (f32.const 0))
        (local.set $brk (i32.const -1))
        (local.set $wsb (f32.const 0))
        (local.set $first (i32.const 1))
        (local.set $i (local.get $p))
        (block $wd
          (loop $wl
            (br_if $wd (i32.ge_u (local.get $i) (local.get $q)))
            (local.set $c (call $get (local.get $i)))
            (local.set $a (call $adv (local.get $c) (call $get (i32.add (local.get $i) (i32.const 1))) (local.get $t)))
            (local.set $ch (i32.and (local.get $c) (i32.const 0xFFFF)))
            (if (i32.or (i32.eq (local.get $ch) (i32.const 32)) (i32.eq (local.get $ch) (i32.const 9)))
              (then
                ;; spaces may hang past the edge
                (local.set $x (f32.add (local.get $x) (local.get $a)))
                (local.set $brk (i32.add (local.get $i) (i32.const 1)))
                (local.set $wsb (f32.const 0)))
              (else
                (if (i32.and (f32.gt (f32.add (local.get $x) (local.get $a)) (local.get $width))
                             (i32.gt_u (local.get $i) (local.get $ls)))
                  (then
                    (if (i32.ge_s (local.get $n) (global.get $LINE_MAX)) (then (br $done)))
                    (local.set $flags (i32.or (i32.or (local.get $attrs) (i32.shl (local.get $ord) (i32.const 16)))
                      (i32.or (i32.shl (local.get $first) (i32.const 8)) (i32.shl (local.get $group_first) (i32.const 10)))))
                    (if (i32.gt_s (local.get $brk) (local.get $ls))
                      (then
                        (call $put_line (local.get $n) (local.get $ls) (local.get $brk) (local.get $y) (local.get $lh) (local.get $base)
                          (local.get $indent) (local.get $flags)
                          (select (local.get $band) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n))))
                        (local.set $ls (local.get $brk))
                        (local.set $x (local.get $wsb)))
                      (else
                        (call $put_line (local.get $n) (local.get $ls) (local.get $i) (local.get $y) (local.get $lh) (local.get $base)
                          (local.get $indent) (local.get $flags)
                          (select (local.get $band) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n))))
                        (local.set $ls (local.get $i))
                        (local.set $x (f32.const 0))))
                    (local.set $n (i32.add (local.get $n) (i32.const 1)))
                    (global.set $nlines (local.get $n))
                    (local.set $y (i32.add (local.get $y) (local.get $lh)))
                    (local.set $first (i32.const 0))
                    (local.set $group_first (i32.const 0))
                    (local.set $brk (i32.const -1))
                    (local.set $wsb (local.get $x))))
                (local.set $x (f32.add (local.get $x) (local.get $a)))
                (local.set $wsb (f32.add (local.get $wsb) (local.get $a)))))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $wl)))
        ;; the block's last line ends at its terminator
        (if (i32.ge_s (local.get $n) (global.get $LINE_MAX)) (then (br $done)))
        (call $put_line (local.get $n) (local.get $ls) (local.get $q) (local.get $y) (local.get $lh) (local.get $base)
          (local.get $indent)
          (i32.or (i32.or (local.get $attrs) (i32.shl (local.get $ord) (i32.const 16)))
            (i32.or (i32.const 0x200)
              (i32.or (i32.shl (local.get $first) (i32.const 8)) (i32.shl (local.get $group_first) (i32.const 10)))))
          (select (local.get $band) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n))))
        (local.set $n (i32.add (local.get $n) (i32.const 1)))
        (global.set $nlines (local.get $n))
        (local.set $y (i32.add (local.get $y) (local.get $lh)))
        (local.set $prev (local.get $t))
        (local.set $prev_after (f32.load offset=20 (local.get $st)))
        (local.set $p (i32.add (local.get $q) (i32.const 1)))
        (br $blocks)))
    (if (i32.eq (local.get $prev) (i32.const 8))
      (then
        (local.set $y (i32.add (local.get $y) (local.get $pad)))
        (call $flag_line (i32.sub (local.get $n) (i32.const 1)) (i32.const 0x800))))
    (global.set $nlines (local.get $n))
    (global.set $doc_h (i32.add (local.get $y) (call $px (f32.const 60))))
    (global.set $dirty (i32.const 0)))

  ;; The line whose band contains document y.
  (func $line_at (param $y i32) (result i32)
    (local $lo i32) (local $hi i32) (local $mid i32)
    (local.set $hi (i32.sub (global.get $nlines) (i32.const 1)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_s (local.get $lo) (local.get $hi)))
        (local.set $mid (i32.shr_s (i32.add (i32.add (local.get $lo) (local.get $hi)) (i32.const 1)) (i32.const 1)))
        (if (i32.le_s (i32.load offset=28 (call $line_addr (local.get $mid))) (local.get $y))
          (then (local.set $lo (local.get $mid)))
          (else (local.set $hi (i32.sub (local.get $mid) (i32.const 1)))))
        (br $l)))
    (local.get $lo))

  ;; The line holding position $pos (the last line starting at or before it),
  ;; stepping back one line when the caret sticks to the end of a wrapped line.
  (func $line_of (param $pos i32) (result i32)
    (local $lo i32) (local $hi i32) (local $mid i32)
    (local.set $hi (i32.sub (global.get $nlines) (i32.const 1)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_s (local.get $lo) (local.get $hi)))
        (local.set $mid (i32.shr_s (i32.add (i32.add (local.get $lo) (local.get $hi)) (i32.const 1)) (i32.const 1)))
        (if (i32.le_s (i32.load (call $line_addr (local.get $mid))) (local.get $pos))
          (then (local.set $lo (local.get $mid)))
          (else (local.set $hi (i32.sub (local.get $mid) (i32.const 1)))))
        (br $l)))
    (if (i32.and (global.get $affinity) (i32.gt_s (local.get $lo) (i32.const 0)))
      (then
        (if (i32.and
              (i32.eq (i32.load (call $line_addr (local.get $lo))) (local.get $pos))
              (i32.eqz (i32.and (i32.load offset=24 (call $line_addr (i32.sub (local.get $lo) (i32.const 1)))) (i32.const 0x200))))
          (then (local.set $lo (i32.sub (local.get $lo) (i32.const 1)))))))
    (local.get $lo))

  ;; x of position $pos within line $i, from the column's left edge.
  (func $x_in_line (param $i i32) (param $pos i32) (result f32)
    (local $a i32) (local $p i32) (local $t i32) (local $x f32)
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $t (call $type_of_flags (i32.load offset=24 (local.get $a))))
    (local.set $x (f32.convert_i32_s (i32.load offset=20 (local.get $a))))
    (local.set $p (i32.load (local.get $a)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $pos)))
        (local.set $x (f32.add (local.get $x)
          (call $adv (call $get (local.get $p)) (call $get (i32.add (local.get $p) (i32.const 1))) (local.get $t))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $x))

  ;; Position nearest to x (from the column's left edge) in line $i. Past the
  ;; end of a wrapped line, the caret sticks to that line ($affinity = 1).
  (func $pos_in_line (param $i i32) (param $x f32) (result i32)
    (local $a i32) (local $p i32) (local $end i32) (local $t i32) (local $cx f32) (local $w f32) (local $c i32)
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $t (call $type_of_flags (i32.load offset=24 (local.get $a))))
    (local.set $cx (f32.convert_i32_s (i32.load offset=20 (local.get $a))))
    (local.set $p (i32.load (local.get $a)))
    (local.set $end (i32.load offset=4 (local.get $a)))
    (global.set $affinity (i32.const 0))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $end)))
        (local.set $c (call $get (local.get $p)))
        (local.set $w (call $adv (local.get $c) (call $get (i32.add (local.get $p) (i32.const 1))) (local.get $t)))
        ;; never between the halves of a surrogate pair
        (if (i32.ne (i32.and (local.get $c) (i32.const 0xFC00)) (i32.const 0xDC00))
          (then
            (if (f32.lt (local.get $x) (f32.add (local.get $cx) (f32.mul (local.get $w) (f32.const 0.5))))
              (then (return (local.get $p))))))
        (local.set $cx (f32.add (local.get $cx) (local.get $w)))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (if (i32.eqz (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x200)))
      (then (global.set $affinity (i32.const 1))))
    (local.get $end))

  ;; Document position under the screen point (x, y).
  (func $pos_at_point (param $x i32) (param $y i32) (result i32)
    (call $pos_in_line
      (call $line_at (i32.add (i32.sub (local.get $y) (global.get $view_top)) (global.get $scroll)))
      (f32.convert_i32_s (i32.sub (local.get $x) (global.get $col_x)))))

  ;; Where the caret for $pos is: sets $g_line and $g_x.
  (global $g_line (mut i32) (i32.const 0))
  (global $g_x (mut f32) (f32.const 0))
  (func $caret_geom (param $pos i32)
    (global.set $g_line (call $line_of (local.get $pos)))
    (global.set $g_x (call $x_in_line (global.get $g_line) (local.get $pos))))

  ;; Word (or run of spaces or punctuation) around $p: sets $wa, $wb.
  (global $wa (mut i32) (i32.const 0))
  (global $wb (mut i32) (i32.const 0))
  (func $word_range (param $p i32)
    (local $bs i32) (local $be i32) (local $k i32) (local $a i32) (local $b i32)
    (local.set $bs (call $block_start (local.get $p)))
    (local.set $be (call $nl_after (local.get $p)))
    (if (i32.and (i32.eq (local.get $p) (local.get $be)) (i32.gt_u (local.get $p) (local.get $bs)))
      (then (local.set $p (i32.sub (local.get $p) (i32.const 1)))))
    (local.set $a (local.get $p))
    (local.set $b (local.get $p))
    (if (i32.lt_u (local.get $p) (local.get $be))
      (then
        (local.set $k (call $char_class (call $get (local.get $p))))
        (block $d
          (loop $l
            (br_if $d (i32.le_u (local.get $a) (local.get $bs)))
            (br_if $d (i32.ne (call $char_class (call $get (i32.sub (local.get $a) (i32.const 1)))) (local.get $k)))
            (local.set $a (i32.sub (local.get $a) (i32.const 1)))
            (br $l)))
        (block $d2
          (loop $l2
            (br_if $d2 (i32.ge_u (local.get $b) (local.get $be)))
            (br_if $d2 (i32.ne (call $char_class (call $get (local.get $b))) (local.get $k)))
            (local.set $b (i32.add (local.get $b) (i32.const 1)))
            (br $l2)))))
    (global.set $wa (local.get $a))
    (global.set $wb (local.get $b)))
