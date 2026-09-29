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
;;
;; The whole document is laid out when the column changes ($dirty) or the
;; document is replaced. After an edit only what it can have changed is
;; ($relayout_changed), using the damage the engine records (DAMAGE): layout
;; restarts at a line before the change that cannot have moved, and stops at
;; the first line start after the change where the old layout had a line
;; starting at the same text in the same block context. Every old line from
;; there on is still right, only some cells and pixels later, so it is moved
;; and kept. Wrapping is greedy and a line's breaks depend only on the text
;; from its start, so a change can only move the break at the end of the
;; line before the one holding the two cells before it (the width of a
;; character depends on the next one, for kerning). New lines go to LSCR until
;; the pass finds the old layout again, since there may be more of them than
;; of the lines they replace.

  (func $line_addr (param $i i32) (result i32)
    (i32.add (global.get $LINES) (i32.shl (local.get $i) (i32.const 5))))

  (func $type_of_flags (param $f i32) (result i32)
    (local $t i32)
    (local.set $t (i32.and (local.get $f) (i32.const 15)))
    (select (local.get $t) (i32.const 0) (i32.le_u (local.get $t) (i32.const 8))))

  ;; the pass in progress
  (global $lr0 (mut i32) (i32.const 0))     ;; lines from this one on are written to LSCR
  (global $lold (mut i32) (i32.const 0))    ;; old lines at LINES, 0 when laying out everything
  (global $lj (mut i32) (i32.const 0))      ;; the next old line that could match
  (global $ltail (mut i32) (i32.const 0))   ;; old lines start here; before it, lines of earlier passes
  (global $lend (mut i32) (i32.const 0))    ;; no line starting before this matches (the damage's end)
  (global $ld (mut i32) (i32.const 0))      ;; cells the damage added
  (global $ldy (mut i32) (i32.const 0))     ;; px the matched old lines move down
  (global $ltrunc (mut i32) (i32.const 0))  ;; the last whole layout stopped at LINE_MAX

  ;; Where the pass writes line $n.
  (func $new_line (param $n i32) (result i32)
    (if (result i32) (i32.lt_s (local.get $n) (global.get $lr0))
      (then (call $line_addr (local.get $n)))
      (else (i32.add (global.get $LSCR) (i32.shl (i32.sub (local.get $n) (global.get $lr0)) (i32.const 5))))))

  ;; Can the pass write line $n?
  (func $line_room (param $n i32) (result i32)
    (i32.and (i32.lt_s (local.get $n) (global.get $LINE_MAX))
             (i32.lt_s (i32.sub (local.get $n) (global.get $lr0)) (global.get $LSCR_MAX))))

  ;; Set flag bits on line $i.
  (func $flag_line (param $i i32) (param $bits i32)
    (local $a i32)
    (if (i32.lt_s (local.get $i) (i32.const 0)) (then (return)))
    (local.set $a (call $new_line (local.get $i)))
    (i32.store offset=24 (local.get $a) (i32.or (i32.load offset=24 (local.get $a)) (local.get $bits))))

  (func $put_line (param $n i32) (param $start i32) (param $end i32) (param $y i32) (param $h i32) (param $base i32)
                  (param $x0 i32) (param $flags i32) (param $band i32)
    (local $a i32)
    (local.set $a (call $new_line (local.get $n)))
    (i32.store (local.get $a) (local.get $start))
    (i32.store offset=4 (local.get $a) (local.get $end))
    (i32.store offset=8 (local.get $a) (local.get $y))
    (i32.store offset=12 (local.get $a) (local.get $h))
    (i32.store offset=16 (local.get $a) (local.get $base))
    (i32.store offset=20 (local.get $a) (local.get $x0))
    (i32.store offset=24 (local.get $a) (local.get $flags))
    (i32.store offset=28 (local.get $a) (local.get $band)))

  ;; Copy the lines the pass wrote to LSCR, up to line $n, into place.
  (func $lines_home (param $n i32)
    (if (i32.gt_s (local.get $n) (global.get $lr0))
      (then (memory.copy (call $line_addr (global.get $lr0)) (global.get $LSCR)
              (i32.shl (i32.sub (local.get $n) (global.get $lr0)) (i32.const 5))))))

  ;; Does the old layout have a line starting at new position $p, with the
  ;; same list number, block format and first-line flags, that line $n can
  ;; take over? Then that line and all after it are still right, and $ldy is
  ;; how far they move down. Line 0's band is special, so it never matches.
  (func $lsync (param $p i32) (param $flags i32) (param $y i32) (param $n i32) (result i32)
    (local $a i32)
    (if (i32.lt_s (local.get $p) (global.get $lend)) (then (return (i32.const 0))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_s (global.get $lj) (global.get $lold)))
        (local.set $a (call $line_addr (global.get $lj)))
        (br_if $d (i32.ge_s (i32.add (i32.load (local.get $a)) (global.get $ld)) (local.get $p)))
        (global.set $lj (i32.add (global.get $lj) (i32.const 1)))
        (br $l)))
    (if (i32.or (i32.ge_s (global.get $lj) (global.get $lold))
                (i32.or (i32.eqz (global.get $lj)) (i32.eqz (local.get $n))))
      (then (return (i32.const 0))))
    (if (i32.ne (i32.add (i32.load (local.get $a)) (global.get $ld)) (local.get $p)) (then (return (i32.const 0))))
    (if (i32.ne (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0xFFFF05FF)) (local.get $flags))
      (then (return (i32.const 0))))
    (global.set $ldy (i32.sub (local.get $y) (i32.load offset=8 (local.get $a))))
    (i32.const 1))

  ;; Move lines [$i, $end) $dp cells later and $dy px lower.
  (func $shift_lines (param $i i32) (param $end i32) (param $dp i32) (param $dy i32)
    (local $a i32) (local $e i32)
    (if (i32.eqz (i32.or (local.get $dp) (local.get $dy))) (then (return)))
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $e (call $line_addr (local.get $end)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $a) (local.get $e)))
        (i32.store (local.get $a) (i32.add (i32.load (local.get $a)) (local.get $dp)))
        (i32.store offset=4 (local.get $a) (i32.add (i32.load offset=4 (local.get $a)) (local.get $dp)))
        (i32.store offset=8 (local.get $a) (i32.add (i32.load offset=8 (local.get $a)) (local.get $dy)))
        (i32.store offset=28 (local.get $a) (i32.add (i32.load offset=28 (local.get $a)) (local.get $dy)))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $l))))

  ;; Lay out from $p, where line $n starts at $y, to the end of the document
  ;; or until $lsync finds the old layout again. $prev and $ord are the type
  ;; and list number of the block before $p's; with $resume, $p is inside its
  ;; block (not its first line), and $ord is the block's own. $attrs is the
  ;; format $p's block is taken to have, or -1 to read it from the block's
  ;; terminator, which can be far off. Returns 1 when done, 0 when a pass
  ;; over part of the document runs out of room and the whole document must
  ;; be laid out instead, and 2 when the terminator says $attrs was wrong.
  (func $lay (param $p i32) (param $n i32) (param $y i32) (param $prev i32) (param $ord i32) (param $resume i32)
             (param $attrs i32) (result i32)
    (local $len i32) (local $q i32) (local $t i32) (local $st i32) (local $check i32)
    (local $prev_after f32) (local $pad i32)
    (local $size f32) (local $face i32) (local $lh i32) (local $base i32) (local $indent i32) (local $width f32)
    (local $ls i32) (local $i i32) (local $c i32) (local $a f32) (local $x f32) (local $brk i32) (local $wsb f32)
    (local $flags i32) (local $first i32) (local $group_first i32) (local $ch i32) (local $tail i32)
    (local.set $len (call $len))
    (local.set $pad (call $px (f32.const 12)))
    (if (i32.ge_s (local.get $prev) (i32.const 0))
      (then (local.set $prev_after (f32.load offset=20 (call $style (local.get $prev))))))
    (local.set $check (i32.ge_s (local.get $attrs) (i32.const 0)))
    (block $synced
      (block $done
        (loop $blocks
          (br_if $done (i32.ge_u (local.get $p) (local.get $len)))
          (if (i32.lt_s (local.get $attrs) (i32.const 0))
            (then (local.set $attrs (i32.and (i32.shr_u (call $get (call $nl_after (local.get $p))) (i32.const 16)) (i32.const 0xFF)))))
          (local.set $t (call $type_of_flags (local.get $attrs)))
          (local.set $st (call $style (local.get $t)))
          (local.set $first (i32.eqz (local.get $resume)))
          (local.set $group_first (i32.const 0))
          (if (local.get $resume)
            (then (local.set $resume (i32.const 0)))
            (else
              ;; space above: collapse margins, keep runs of lists/quotes/code tight
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
                  (else (i32.const 0))))))
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
          (local.set $i (local.get $p))
          (local.set $flags (i32.or (i32.or (local.get $attrs) (i32.shl (local.get $ord) (i32.const 16)))
            (i32.or (i32.shl (local.get $first) (i32.const 8)) (i32.shl (local.get $group_first) (i32.const 10)))))
          (br_if $synced (call $lsync (local.get $ls) (local.get $flags) (local.get $y) (local.get $n)))
          ;; up to the block's terminator
          (block $wd
            (loop $wl
              (local.set $c (call $get (local.get $i)))
              (br_if $wd (call $is_nl (local.get $c)))
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
                      (if (i32.eqz (call $line_room (local.get $n)))
                        (then
                          (if (global.get $lold) (then (return (i32.const 0))))
                          (global.set $ltrunc (i32.const 1))
                          (br $done)))
                      (if (i32.gt_s (local.get $brk) (local.get $ls))
                        (then
                          (call $put_line (local.get $n) (local.get $ls) (local.get $brk) (local.get $y) (local.get $lh) (local.get $base)
                            (local.get $indent) (local.get $flags)
                            (select (i32.const 0) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n))))
                          (local.set $ls (local.get $brk))
                          (local.set $x (local.get $wsb)))
                        (else
                          (call $put_line (local.get $n) (local.get $ls) (local.get $i) (local.get $y) (local.get $lh) (local.get $base)
                            (local.get $indent) (local.get $flags)
                            (select (i32.const 0) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n))))
                          (local.set $ls (local.get $i))
                          (local.set $x (f32.const 0))))
                      (local.set $n (i32.add (local.get $n) (i32.const 1)))
                      (local.set $y (i32.add (local.get $y) (local.get $lh)))
                      (local.set $first (i32.const 0))
                      (local.set $group_first (i32.const 0))
                      (local.set $brk (i32.const -1))
                      (local.set $wsb (local.get $x))
                      (local.set $flags (i32.or (local.get $attrs) (i32.shl (local.get $ord) (i32.const 16))))
                      (br_if $synced (call $lsync (local.get $ls) (local.get $flags) (local.get $y) (local.get $n)))
                      ;; this character must fit the new line too, so a line
                      ;; is the same wherever the line before it ended
                      (br $wl)))
                  (local.set $x (f32.add (local.get $x) (local.get $a)))
                  (local.set $wsb (f32.add (local.get $wsb) (local.get $a)))))
              (local.set $i (i32.add (local.get $i) (i32.const 1)))
              (br $wl)))
          (local.set $q (local.get $i))
          (if (local.get $check)
            (then
              (if (i32.ne (i32.and (i32.shr_u (local.get $c) (i32.const 16)) (i32.const 0xFF)) (local.get $attrs))
                (then (return (i32.const 2))))
              (local.set $check (i32.const 0))))
          ;; the block's last line ends at its terminator
          (if (i32.eqz (call $line_room (local.get $n)))
            (then
              (if (global.get $lold) (then (return (i32.const 0))))
              (global.set $ltrunc (i32.const 1))
              (br $done)))
          (call $put_line (local.get $n) (local.get $ls) (local.get $q) (local.get $y) (local.get $lh) (local.get $base)
            (local.get $indent) (i32.or (local.get $flags) (i32.const 0x200))
            (select (i32.const 0) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n))))
          (local.set $n (i32.add (local.get $n) (i32.const 1)))
          (local.set $y (i32.add (local.get $y) (local.get $lh)))
          (local.set $prev (local.get $t))
          (local.set $prev_after (f32.load offset=20 (local.get $st)))
          (local.set $p (i32.add (local.get $q) (i32.const 1)))
          (local.set $attrs (i32.const -1))
          (br $blocks)))
      ;; the end of the document
      (if (i32.eq (local.get $prev) (i32.const 8))
        (then
          (local.set $y (i32.add (local.get $y) (local.get $pad)))
          (call $flag_line (i32.sub (local.get $n) (i32.const 1)) (i32.const 0x800))))
      (call $lines_home (local.get $n))
      (global.set $nlines (local.get $n))
      (global.set $ltail (local.get $n))
      (global.set $doc_h (i32.add (local.get $y) (call $px (f32.const 60))))
      (return (i32.const 1)))
    ;; found the old layout again at old line $lj: keep it and what follows
    (local.set $tail (i32.sub (global.get $lold) (global.get $lj)))
    (if (i32.gt_s (i32.add (local.get $n) (local.get $tail)) (global.get $LINE_MAX)) (then (return (i32.const 0))))
    (if (i32.ne (local.get $n) (global.get $lj))
      (then (memory.copy (call $line_addr (local.get $n)) (call $line_addr (global.get $lj))
              (i32.shl (local.get $tail) (i32.const 5)))))
    (call $lines_home (local.get $n))
    (call $shift_lines (local.get $n) (i32.add (local.get $n) (local.get $tail)) (global.get $ld) (global.get $ldy))
    (global.set $nlines (i32.add (local.get $n) (local.get $tail)))
    (global.set $ltail (local.get $n))
    (global.set $doc_h (i32.add (global.get $doc_h) (global.get $ldy)))
    (i32.const 1))

  ;; The lines are up to date with the document.
  (func $laid
    (global.set $laid_v (global.get $docv))
    (global.set $dirty (i32.const 0))
    (call $damage_clear))

  ;; Lay out the whole document into LINES.
  (func $relayout
    (global.set $lr0 (global.get $LINE_MAX))
    (global.set $lold (i32.const 0))
    (global.set $lend (i32.const 0x7FFFFFFF))
    (global.set $ltrunc (i32.const 0))
    (drop (call $lay (i32.const 0) (i32.const 0) (call $px (f32.const 30)) (i32.const -1) (i32.const 0) (i32.const 0) (i32.const -1)))
    (call $laid))

  ;; Lay out what the edits since the last layout changed, one damaged range
  ;; at a time (see the top of this file and Damage in engine.wat): each pass
  ;; takes the lines the one before left as the old layout. A pass can run on
  ;; past the start of the next range; the lines it laid out are already
  ;; right, so the next pass looks for old lines only after them. Returns 0
  ;; when the whole document must be laid out instead.
  (func $relayout_changed (result i32)
    (local $k i32) (local $a i32)
    (if (i32.or (global.get $dmg_all) (i32.or (global.get $ltrunc) (i32.eqz (global.get $nlines))))
      (then (return (i32.const 0))))
    (global.set $ltail (i32.const 0))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $k) (global.get $ndmg)))
        (local.set $a (call $dmg_rec (local.get $k)))
        (if (i32.eqz (call $relayout_range (i32.load (local.get $a)) (i32.load offset=4 (local.get $a)) (i32.load offset=8 (local.get $a))))
          (then (return (i32.const 0))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l)))
    (i32.const 1))

  ;; Is the format of the block holding line $r, which starts before $s,
  ;; the one line $r has, although cells [s, e) replaced what the lines hold
  ;; as [s, e - d)? Yes when neither held a terminator.
  (func $block_kept (param $r i32) (param $s i32) (param $e i32) (param $d i32) (result i32)
    (local $a i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $s) (local.get $e)))
        (if (call $is_nl (call $get (local.get $s))) (then (return (i32.const 0))))
        (local.set $s (i32.add (local.get $s) (i32.const 1)))
        (br $l)))
    ;; the old block ended past the old cells
    (local.set $e (i32.sub (local.get $e) (local.get $d)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_s (local.get $r) (global.get $nlines)))
        (local.set $a (call $line_addr (local.get $r)))
        (br_if $d (i32.ge_s (i32.load (local.get $a)) (local.get $e)))
        (if (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x200))
          (then (return (i32.ge_s (i32.load offset=4 (local.get $a)) (local.get $e)))))
        (local.set $r (i32.add (local.get $r) (i32.const 1)))
        (br $l)))
    (i32.const 1))

  ;; Cells [s, e) replaced what the lines hold as [s, e - d).
  (func $relayout_range (param $s i32) (param $e i32) (param $d i32) (result i32)
    (local $r i32) (local $a i32) (local $x i32) (local $attrs i32) (local $done i32)
    ;; the line before the one holding the second cell before the change,
    ;; within the change's block
    (local.set $x (local.get $s))
    (if (i32.gt_u (local.get $x) (i32.const 0))
      (then
        (if (i32.eqz (call $is_nl (call $get (i32.sub (local.get $x) (i32.const 1)))))
          (then
            (local.set $x (i32.sub (local.get $x) (i32.const 1)))
            (if (i32.gt_u (local.get $x) (i32.const 0))
              (then
                (if (i32.eqz (call $is_nl (call $get (i32.sub (local.get $x) (i32.const 1)))))
                  (then (local.set $x (i32.sub (local.get $x) (i32.const 1)))))))))))
    (local.set $r (call $line_for (local.get $x)))
    (if (i32.eqz (i32.and (i32.load offset=24 (call $line_addr (local.get $r))) (i32.const 0x100)))
      (then (local.set $r (i32.sub (local.get $r) (i32.const 1)))))
    (local.set $a (call $line_addr (local.get $r)))
    (global.set $lend (local.get $e))
    (global.set $ld (local.get $d))
    (local.set $attrs (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0xFF)))
    ;; the block keeps its format unless a terminator was touched (this is
    ;; checked again at the terminator, which a later range may have changed)
    (if (call $block_kept (local.get $r) (local.get $s) (local.get $e) (local.get $d))
      (then
        (local.set $done (call $lay_at (local.get $r) (local.get $attrs)))
        (if (i32.ne (local.get $done) (i32.const 2)) (then (return (local.get $done)))))
      (else
        (if (i32.eqz (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100)))
          (then
            (if (i32.eq (local.get $attrs)
                  (i32.and (i32.shr_u (call $get (call $nl_after (i32.load (local.get $a)))) (i32.const 16)) (i32.const 0xFF)))
              (then (return (call $lay_at (local.get $r) (local.get $attrs)))))))))
    ;; the block's format changed: lay it out from its start
    (block $d
      (loop $l
        (br_if $d (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100)))
        (local.set $r (i32.sub (local.get $r) (i32.const 1)))
        (local.set $a (call $line_addr (local.get $r)))
        (br $l)))
    (call $lay_at (local.get $r) (i32.const -1)))

  ;; Lay out from line $r, whose block has format $attrs (-1: unknown), with
  ;; what the lines before it say.
  (func $lay_at (param $r i32) (param $attrs i32) (result i32)
    (local $a i32) (local $b i32)
    (local.set $a (call $line_addr (local.get $r)))
    (global.set $lr0 (local.get $r))
    (global.set $lold (global.get $nlines))
    (global.set $lj (select (local.get $r) (global.get $ltail) (i32.gt_s (local.get $r) (global.get $ltail))))
    (if (i32.eqz (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100)))
      (then
        (return (call $lay (i32.load (local.get $a)) (local.get $r) (i32.load offset=8 (local.get $a)) (i32.const -1)
          (i32.shr_u (i32.load offset=24 (local.get $a)) (i32.const 16)) (i32.const 1) (local.get $attrs)))))
    (if (i32.eqz (local.get $r))
      (then (return (call $lay (i32.const 0) (i32.const 0) (call $px (f32.const 30)) (i32.const -1) (i32.const 0) (i32.const 0)
                      (local.get $attrs)))))
    ;; from the bottom of the block before; the group and quote flags on its
    ;; last line depend on this block, so they are worked out again
    (local.set $b (call $line_addr (i32.sub (local.get $r) (i32.const 1))))
    (i32.store offset=24 (local.get $b) (i32.and (i32.load offset=24 (local.get $b)) (i32.const 0xFFFFE7FF)))
    (call $lay (i32.load (local.get $a)) (local.get $r)
      (i32.add (i32.load offset=8 (local.get $b)) (i32.load offset=12 (local.get $b)))
      (call $type_of_flags (i32.load offset=24 (local.get $b)))
      (i32.shr_u (i32.load offset=24 (local.get $b)) (i32.const 16))
      (i32.const 0) (local.get $attrs)))

  ;; Bring the lines up to date with the document before a frame. Someone
  ;; else's edit above the view would move the text in it (your own edits
  ;; scroll to the caret instead), so the scroll moves with that text: the
  ;; first line in view, or the text just after an edit that reaches into the
  ;; view, stays where it was on screen.
  (func $update_layout
    (local $keep i32) (local $pos i32) (local $off i32) (local $k i32) (local $a i32) (local $sum i32) (local $os i32)
    (local $dy i32)
    (if (i32.or (global.get $dirty) (global.get $dmg_all)) (then (call $relayout) (return)))
    (if (i32.eq (global.get $laid_v) (global.get $docv)) (then (return)))
    (if (i32.and (i32.eqz (global.get $reveal)) (i32.gt_u (global.get $ndmg) (i32.const 0)))
      (then
        (local.set $a (call $line_at (global.get $scroll)))
        (if (i32.lt_s (call $line_for (i32.load (global.get $DAMAGE))) (local.get $a))
          (then
            (local.set $keep (i32.const 1))
            ;; where the first line in view starts, before and after the edits
            (local.set $pos (i32.load (call $line_addr (local.get $a))))
            (block $d
              (loop $l
                (br_if $d (i32.ge_u (local.get $k) (global.get $ndmg)))
                (local.set $a (call $dmg_rec (local.get $k)))
                (local.set $os (i32.sub (i32.load (local.get $a)) (local.get $sum)))
                (br_if $d (i32.lt_s (local.get $pos) (local.get $os)))
                (local.set $sum (i32.add (local.get $sum) (i32.load offset=8 (local.get $a))))
                ;; inside what the edit replaced: the text after it
                (local.set $os (i32.sub (i32.load offset=4 (local.get $a)) (local.get $sum)))
                (if (i32.lt_s (local.get $pos) (local.get $os)) (then (local.set $pos (local.get $os))))
                (local.set $k (i32.add (local.get $k) (i32.const 1)))
                (br $l)))
            (local.set $off (i32.sub (global.get $scroll)
              (i32.load offset=8 (call $line_addr (call $line_for (local.get $pos))))))
            (local.set $pos (i32.add (local.get $pos) (local.get $sum)))))))
    (if (call $relayout_changed)
      (then (call $laid))
      (else (call $relayout)))
    (if (local.get $keep)
      (then
        (local.set $dy (i32.sub
          (i32.add (i32.load offset=8 (call $line_addr (call $line_for (local.get $pos)))) (local.get $off))
          (global.get $scroll)))
        (global.set $scroll (i32.add (global.get $scroll) (local.get $dy)))
        ;; a pan or a flick in progress carries on from there
        (global.set $pan_s (i32.add (global.get $pan_s) (local.get $dy)))
        (global.set $fpos (f32.add (global.get $fpos) (f32.convert_i32_s (local.get $dy)))))))

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

  ;; The last line starting at or before position $pos.
  (func $line_for (param $pos i32) (result i32)
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
    (local.get $lo))

  ;; The line holding position $pos, stepping back one line when the caret
  ;; sticks to the end of a wrapped line.
  (func $line_of (param $pos i32) (result i32)
    (local $lo i32)
    (local.set $lo (call $line_for (local.get $pos)))
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
