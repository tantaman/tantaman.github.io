;; ui-layout.wat -- breaking blocks into visual lines, and mapping between
;; document positions and points on screen.
;;
;; A laid-out line is 32 bytes at LINES:
;;   +0 start   +4 end (exclusive; the block terminator for a block's last line)
;;   +8 y (top of the line box, document px)   +12 height   +16 baseline from y
;;   +20 text left, from the column's left edge
;;   +24 flags: bits 0-4 block type and checked, 8 first line of block,
;;       9 last line of block, 10 first line of a code group, 11 last line of
;;       a code group, 12 the next block continues this quote, 13 a typeset
;;       equation (the whole run of math blocks), 14 the preview under an
;;       equation's source, 15 an empty equation; bits 16-31 a list number,
;;       an equation's width, or for code the language (16-26) and the
;;       highlighter's state at the line's block (27-31)
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
;;
;; Math: an equation (a run of math blocks) is one line holding the typeset
;; formula, unless the caret is in it; then its TeX lines are laid out like
;; code, with a line under them previewing the result. An inline "$...$"
;; span is a single box as wide as its formula (the lines around tall ones
;; grow), except the one the caret is in, which shows its source. When the
;; caret moves into or out of math, its block is laid out again as if it had
;; been edited. Code: each code line records its language and the
;; tokenizer's state at its block's start, for the highlighter.
;;
;; These make a line depend on more than the text from its start, so the
;; pass never takes over old lines inside an open equation, or part way
;; through a code block (the state it ends in carries to the next block), or
;; part way through a block before its last "$" (an edit can pair the
;; dollars after it differently). A pass over code or math starts at the
;; block's first line, one over a block with a "$" before the change does
;; too, and one over a block after an equation starts at that equation
;; when either is math (the block may have joined it or left it).

  (func $line_addr (param $i i32) (result i32)
    (i32.add (global.get $LINES) (i32.shl (local.get $i) (i32.const 5))))

  (func $type_of_flags (param $f i32) (result i32)
    (local $t i32)
    (local.set $t (i32.and (local.get $f) (i32.const 15)))
    (select (local.get $t) (i32.const 0) (i32.le_u (local.get $t) (i32.const 9))))

  ;; the pass in progress
  (global $lr0 (mut i32) (i32.const 0))     ;; lines from this one on are written to LSCR
  (global $lold (mut i32) (i32.const 0))    ;; old lines at LINES, 0 when laying out everything
  (global $lj (mut i32) (i32.const 0))      ;; the next old line that could match
  (global $ltail (mut i32) (i32.const 0))   ;; old lines start here; before it, lines of earlier passes
  (global $lend (mut i32) (i32.const 0))    ;; no line starting before this matches (the damage's end)
  (global $ld (mut i32) (i32.const 0))      ;; cells the damage added
  (global $ldy (mut i32) (i32.const 0))     ;; px the matched old lines move down
  (global $ltrunc (mut i32) (i32.const 0))  ;; the last whole layout stopped at LINE_MAX

  ;; math
  (global $mact (mut i32) (i32.const -1))   ;; the math open for editing (its first position)
  (global $ex_h (mut i32) (i32.const 0))    ;; tallest inline formula on a line
  (global $ex_d (mut i32) (i32.const 0))

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
  ;; same list number, block format, first-line and equation flags, and
  ;; language and highlighter state, that line $n can take over? Then that
  ;; line and all after it are still right, and $ldy is how far they move
  ;; down. Line 0's band is special, so it never matches.
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
    (if (i32.ne (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0xFFFFE5FF))
                (i32.and (local.get $flags) (i32.const 0xFFFFE5FF)))
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
  ;; and list number of the block before $p's, $pcg its group (code or an
  ;; equation being edited; 0 for none) and $hl the highlighter's state at
  ;; its end; with $resume, $p is inside its block (not its first line; never
  ;; code or math), and $ord is the block's own. $attrs is the format $p's
  ;; block is taken to have, or -1 for none. Returns 1 when done, 0 when a
  ;; pass over part of the document runs out of room and the whole document
  ;; must be laid out instead, and 2 when the terminator says $attrs was
  ;; wrong.
  (func $lay (param $p i32) (param $n i32) (param $y i32) (param $prev i32) (param $pcg i32) (param $hl i32)
             (param $ord i32) (param $resume i32) (param $attrs i32) (result i32)
    (local $len i32) (local $q i32) (local $t i32) (local $st i32)
    (local $prev_after f32) (local $pad i32)
    (local $size f32) (local $face i32) (local $lh i32) (local $base i32) (local $indent i32) (local $width f32)
    (local $ls i32) (local $i i32) (local $c i32) (local $a f32) (local $x f32) (local $brk i32) (local $wsb f32)
    (local $flags i32) (local $first i32) (local $group_first i32) (local $ch i32) (local $tail i32)
    (local $cg i32) (local $ge i32) (local $open_end i32) (local $k i32) (local $lang i32) (local $used i32) (local $sk i32)
    (local.set $len (call $len))
    (local.set $pad (call $px (f32.const 12)))
    (local.set $open_end (i32.const -1))
    (if (i32.ge_s (local.get $prev) (i32.const 0))
      (then (local.set $prev_after (f32.load offset=20 (call $style (local.get $prev))))))
    (block $synced
      (block $done
        (loop $blocks
          (br_if $done (i32.ge_u (local.get $p) (local.get $len)))
          ;; the block, and its inline math
          (call $spans_at (local.get $p))
          (local.set $q (global.get $sp_q))
          (local.set $c (i32.shr_u (call $get (local.get $q)) (i32.const 16)))
          ;; the block has the format it was taken to have
          (if (i32.ge_s (local.get $attrs) (i32.const 0))
            (then
              (if (i32.ne (i32.and (local.get $c) (i32.const 31)) (i32.and (local.get $attrs) (i32.const 31)))
                (then (return (i32.const 2))))))
          (local.set $attrs (local.get $c))
          (local.set $t (call $type_of_flags (local.get $attrs)))
          (local.set $st (call $style (local.get $t)))
          ;; an equation the caret is not in: one line, typeset
          (if (i32.and (i32.eq (local.get $t) (i32.const 9))
                       (i32.and (i32.ne (local.get $p) (global.get $mact)) (i32.lt_s (local.get $open_end) (i32.const 0))))
            (then
              (local.set $ge (call $math_group_end (local.get $q)))
              (local.set $y (call $space_above_y (local.get $y) (local.get $prev) (local.get $pcg) (local.get $prev_after)
                                                 (local.get $t) (i32.const 0) (local.get $st) (local.get $n) (local.get $pad)))
              (drop (call $eq_box (local.get $p) (local.get $ge) (i32.const 0)))
              (br_if $synced (call $lsync (local.get $p) (global.get $eq_flags) (local.get $y) (local.get $n)))
              (if (i32.eqz (call $line_room (local.get $n)))
                (then
                  (if (global.get $lold) (then (return (i32.const 0))))
                  (global.set $ltrunc (i32.const 1))
                  (br $done)))
              (call $put_line (local.get $n) (local.get $p) (local.get $ge) (local.get $y) (global.get $eq_h) (global.get $eq_base)
                (global.get $eq_x0) (global.get $eq_flags) (select (i32.const 0) (local.get $y) (i32.eqz (local.get $n))))
              (local.set $n (i32.add (local.get $n) (i32.const 1)))
              (local.set $y (i32.add (local.get $y) (global.get $eq_h)))
              (local.set $prev (i32.const 9))
              (local.set $pcg (i32.const 0))
              (local.set $prev_after (f32.load offset=20 (local.get $st)))
              (local.set $p (i32.add (local.get $ge) (i32.const 1)))
              (local.set $resume (i32.const 0))
              (local.set $attrs (i32.const -1))
              (br $blocks)))
          ;; code, and an equation being edited, are groups with a background
          (local.set $cg (i32.const 0))
          (if (i32.eq (local.get $t) (i32.const 8)) (then (local.set $cg (call $group (local.get $attrs)))))
          (if (i32.eq (local.get $t) (i32.const 9)) (then (local.set $cg (i32.const 9))))
          (local.set $first (i32.eqz (local.get $resume)))
          (local.set $group_first (i32.const 0))
          (if (local.get $resume)
            (then (local.set $resume (i32.const 0)))
            (else
              ;; space above: collapse margins, keep runs of lists/quotes/code tight
              (local.set $y (call $space_above_y (local.get $y) (local.get $prev) (local.get $pcg) (local.get $prev_after)
                                                 (local.get $t) (local.get $cg) (local.get $st) (local.get $n) (local.get $pad)))
              (if (i32.and (i32.ne (local.get $cg) (i32.const 0)) (i32.ne (local.get $cg) (local.get $pcg)))
                (then
                  (local.set $group_first (i32.const 1))
                  (local.set $hl (i32.const 0))))
              (if (i32.and (i32.eq (local.get $t) (i32.const 4)) (i32.eq (local.get $prev) (i32.const 4)))
                (then (call $flag_line (i32.sub (local.get $n) (i32.const 1)) (i32.const 0x1000))))
              (local.set $ord
                (if (result i32) (i32.eq (local.get $t) (i32.const 6))
                  (then (select (i32.add (local.get $ord) (i32.const 1)) (i32.const 1) (i32.eq (local.get $prev) (i32.const 6))))
                  (else (i32.const 0))))))
          ;; flags bits 16-31: an ordered item's number, or a code line's
          ;; language and the highlighter's state at its start
          (local.set $k (i32.shl (local.get $ord) (i32.const 16)))
          (if (i32.eq (local.get $t) (i32.const 8))
            (then
              (local.set $lang (i32.shr_u (local.get $attrs) (i32.const 5)))
              (local.set $k (i32.or (i32.shl (local.get $lang) (i32.const 16)) (i32.shl (local.get $hl) (i32.const 27))))
              (local.set $hl (i32.const 0))
              (if (call $lang_load (local.get $lang))
                (then (local.set $hl (i32.and (call $hl_scan (local.get $p) (local.get $q) (i32.shr_u (local.get $k) (i32.const 27)))
                                              (i32.const 31)))))))
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
            (i32.add (local.get $indent) (select (local.get $indent) (i32.const 0) (i32.ge_u (local.get $t) (i32.const 8)))))))
          ;; greedy wrapping at spaces; a word wider than the line is split,
          ;; and a formula is never split
          (local.set $ls (local.get $p))
          (local.set $x (f32.const 0))
          (local.set $brk (i32.const -1))
          (local.set $wsb (f32.const 0))
          (local.set $i (local.get $p))
          (local.set $flags (i32.or (i32.or (i32.and (local.get $attrs) (i32.const 31)) (local.get $k))
            (i32.or (i32.shl (local.get $first) (i32.const 8)) (i32.shl (local.get $group_first) (i32.const 10)))))
          (if (i32.lt_s (local.get $open_end) (i32.const 0))
            (then (br_if $synced (call $lsync (local.get $ls) (local.get $flags) (local.get $y) (local.get $n)))))
          (if (i32.and (i32.eq (local.get $t) (i32.const 9)) (i32.lt_s (local.get $open_end) (i32.const 0)))
            (then (local.set $open_end (call $math_group_end (local.get $q)))))
          ;; up to the block's terminator
          (block $wd
            (loop $wl
              (br_if $wd (i32.ge_u (local.get $i) (local.get $q)))
              (local.set $c (call $get (local.get $i)))
              (local.set $a (call $adv_at (local.get $i) (local.get $t)))
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
                          (local.set $used (call $put_text_line (local.get $n) (local.get $ls) (local.get $brk) (local.get $y) (local.get $lh)
                            (local.get $base) (local.get $indent) (local.get $flags)
                            (select (i32.const 0) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n)))))
                          (local.set $ls (local.get $brk))
                          (local.set $x (local.get $wsb)))
                        (else
                          (local.set $used (call $put_text_line (local.get $n) (local.get $ls) (local.get $i) (local.get $y) (local.get $lh)
                            (local.get $base) (local.get $indent) (local.get $flags)
                            (select (i32.const 0) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n)))))
                          (local.set $ls (local.get $i))
                          (local.set $x (f32.const 0))))
                      (local.set $n (i32.add (local.get $n) (i32.const 1)))
                      (local.set $y (i32.add (local.get $y) (local.get $used)))
                      (local.set $first (i32.const 0))
                      (local.set $group_first (i32.const 0))
                      (local.set $brk (i32.const -1))
                      (local.set $wsb (local.get $x))
                      (local.set $flags (i32.or (i32.and (local.get $attrs) (i32.const 31)) (local.get $k)))
                      ;; not part way through code, or before a "$" of the block
                      (if (i32.and (i32.lt_u (local.get $t) (i32.const 8)) (i32.gt_s (local.get $ls) (global.get $sp_last)))
                        (then (br_if $synced (call $lsync (local.get $ls) (local.get $flags) (local.get $y) (local.get $n)))))
                      ;; this character must fit the new line too, so a line
                      ;; is the same wherever the line before it ended
                      (br $wl)))
                  (local.set $x (f32.add (local.get $x) (local.get $a)))
                  (local.set $wsb (f32.add (local.get $wsb) (local.get $a)))
                  ;; the rest of a formula takes no room of its own
                  (local.set $sk (call $span_at (local.get $i)))
                  (if (i32.ge_s (local.get $sk) (i32.const 0))
                    (then
                      (if (i32.eqz (call $span_open (call $span_addr (local.get $sk))))
                        (then (local.set $i (i32.sub (i32.load offset=4 (call $span_addr (local.get $sk))) (i32.const 1)))))))))
              (local.set $i (i32.add (local.get $i) (i32.const 1)))
              (br $wl)))
          ;; the block's last line ends at its terminator
          (if (i32.eqz (call $line_room (local.get $n)))
            (then
              (if (global.get $lold) (then (return (i32.const 0))))
              (global.set $ltrunc (i32.const 1))
              (br $done)))
          (local.set $used (call $put_text_line (local.get $n) (local.get $ls) (local.get $q) (local.get $y) (local.get $lh)
            (local.get $base) (local.get $indent) (i32.or (local.get $flags) (i32.const 0x200))
            (select (i32.const 0) (i32.sub (local.get $y) (i32.mul (local.get $group_first) (local.get $pad))) (i32.eqz (local.get $n)))))
          (local.set $n (i32.add (local.get $n) (i32.const 1)))
          (local.set $y (i32.add (local.get $y) (local.get $used)))
          (local.set $prev (local.get $t))
          (local.set $pcg (local.get $cg))
          (local.set $prev_after (f32.load offset=20 (local.get $st)))
          ;; the end of an equation being edited: its preview under it
          (if (i32.eq (local.get $q) (local.get $open_end))
            (then
              (local.set $open_end (i32.const -1))
              (local.set $y (i32.add (local.get $y) (local.get $pad)))
              (call $flag_line (i32.sub (local.get $n) (i32.const 1)) (i32.const 0x800))
              (local.set $pcg (i32.const 0))
              (if (call $eq_box (global.get $mact) (local.get $q) (i32.const 1))
                (then
                  (if (i32.eqz (call $line_room (local.get $n)))
                    (then
                      (if (global.get $lold) (then (return (i32.const 0))))
                      (global.set $ltrunc (i32.const 1))
                      (br $done)))
                  (call $put_line (local.get $n) (local.get $q) (local.get $q) (local.get $y) (global.get $eq_h) (global.get $eq_base)
                    (global.get $eq_x0) (global.get $eq_flags) (local.get $y))
                  (local.set $n (i32.add (local.get $n) (i32.const 1)))
                  (local.set $y (i32.add (local.get $y) (global.get $eq_h)))))))
          (local.set $p (i32.add (local.get $q) (i32.const 1)))
          (local.set $attrs (i32.const -1))
          (br $blocks)))
      ;; the end of the document
      (if (local.get $pcg)
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
    (global.set $mact (call $math_active))
    (global.set $hl_lid (i32.const -1))
    (global.set $sp_q (i32.const -1))
    (global.set $lr0 (global.get $LINE_MAX))
    (global.set $lold (i32.const 0))
    (global.set $lend (i32.const 0x7FFFFFFF))
    (global.set $ltrunc (i32.const 0))
    (drop (call $lay (i32.const 0) (i32.const 0) (call $px (f32.const 30)) (i32.const -1) (i32.const 0) (i32.const 0)
            (i32.const 0) (i32.const 0) (i32.const -1)))
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
      (then (local.set $r (call $dollar_back (i32.sub (local.get $r) (i32.const 1)) (local.get $s)))))
    (local.set $a (call $line_addr (local.get $r)))
    (global.set $lend (local.get $e))
    (global.set $ld (local.get $d))
    (local.set $attrs (i32.and (i32.load offset=24 (local.get $a)) (i32.const 31)))
    ;; code and math from their block's first line
    (if (i32.ge_u (call $type_of_flags (local.get $attrs)) (i32.const 8))
      (then
        (block $d
          (loop $l
            (br_if $d (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100)))
            (local.set $r (i32.sub (local.get $r) (i32.const 1)))
            (local.set $a (call $line_addr (local.get $r)))
            (br $l)))
        (return (call $lay_at (call $math_back (local.get $r)) (i32.const -1)))))
    ;; the block keeps its format unless a terminator was touched (this is
    ;; checked again at the terminator, which a later range may have changed)
    (if (call $block_kept (local.get $r) (local.get $s) (local.get $e) (local.get $d))
      (then
        (if (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100))
          (then
            (local.set $x (call $math_back (local.get $r)))
            (if (i32.ne (local.get $x) (local.get $r)) (then (return (call $lay_at (local.get $x) (i32.const -1)))))))
        (local.set $done (call $lay_at (local.get $r) (local.get $attrs)))
        (if (i32.ne (local.get $done) (i32.const 2)) (then (return (local.get $done)))))
      (else
        (if (i32.eqz (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100)))
          (then
            (if (i32.eq (local.get $attrs)
                  (i32.and (i32.shr_u (call $get (call $nl_after (i32.load (local.get $a)))) (i32.const 16)) (i32.const 31)))
              (then (return (call $lay_at (local.get $r) (local.get $attrs)))))))))
    ;; the block's format changed: lay it out from its start
    (block $d
      (loop $l
        (br_if $d (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100)))
        (local.set $r (i32.sub (local.get $r) (i32.const 1)))
        (local.set $a (call $line_addr (local.get $r)))
        (br $l)))
    (call $lay_at (call $math_back (local.get $r)) (i32.const -1)))

  ;; Line $r is part of a block. When a "$" comes before $s in the block,
  ;; the change may pair it with another, so the block's first line
  ;; instead.
  (func $dollar_back (param $r i32) (param $s i32) (result i32)
    (call $spans_at (local.get $s))
    (if (i32.or (i32.lt_s (global.get $sp_first) (i32.const 0)) (i32.ge_s (global.get $sp_first) (local.get $s)))
      (then (return (local.get $r))))
    (block $d
      (loop $l
        (br_if $d (i32.and (i32.load offset=24 (call $line_addr (local.get $r))) (i32.const 0x100)))
        (local.set $r (i32.sub (local.get $r) (i32.const 1)))
        (br $l)))
    (local.get $r))

  ;; Line $r starts a block. When the equation before it may now run on
  ;; into it, or no longer does (either is math), the first line of that
  ;; equation instead.
  (func $math_back (param $r i32) (result i32)
    (if (i32.eqz (local.get $r)) (then (return (local.get $r))))
    (if (i32.ne (call $type_of_flags (i32.load offset=24 (call $line_addr (i32.sub (local.get $r) (i32.const 1))))) (i32.const 9))
      (then (return (local.get $r))))
    (if (i32.and (i32.ne (call $type_of_flags (i32.load offset=24 (call $line_addr (local.get $r)))) (i32.const 9))
                 (i32.ne (call $type_of (call $get (call $nl_after (i32.load (call $line_addr (local.get $r)))))) (i32.const 9)))
      (then (return (local.get $r))))
    (block $d
      (loop $l
        (local.set $r (i32.sub (local.get $r) (i32.const 1)))
        (br_if $d (i32.and (i32.load offset=24 (call $line_addr (local.get $r))) (i32.const 0x2400)))
        (br_if $d (i32.eqz (local.get $r)))
        (br $l)))
    (local.get $r))

  ;; Lay out from line $r, whose block has format $attrs (-1: unknown), with
  ;; what the lines before it say.
  (func $lay_at (param $r i32) (param $attrs i32) (result i32)
    (local $a i32) (local $b i32) (local $fb i32) (local $prev i32) (local $pcg i32) (local $hl i32) (local $lang i32)
    (local.set $a (call $line_addr (local.get $r)))
    (global.set $lr0 (local.get $r))
    (global.set $lold (global.get $nlines))
    (global.set $lj (select (local.get $r) (global.get $ltail) (i32.gt_s (local.get $r) (global.get $ltail))))
    (if (i32.eqz (i32.and (i32.load offset=24 (local.get $a)) (i32.const 0x100)))
      (then
        (return (call $lay (i32.load (local.get $a)) (local.get $r) (i32.load offset=8 (local.get $a)) (i32.const -1)
          (i32.const 0) (i32.const 0) (i32.shr_u (i32.load offset=24 (local.get $a)) (i32.const 16)) (i32.const 1)
          (local.get $attrs)))))
    (if (i32.eqz (local.get $r))
      (then (return (call $lay (i32.const 0) (i32.const 0) (call $px (f32.const 30)) (i32.const -1) (i32.const 0) (i32.const 0)
                      (i32.const 0) (i32.const 0) (local.get $attrs)))))
    ;; from the bottom of the block before; the group and quote flags on its
    ;; last line depend on this block, so they are worked out again
    (local.set $b (call $line_addr (i32.sub (local.get $r) (i32.const 1))))
    (i32.store offset=24 (local.get $b) (i32.and (i32.load offset=24 (local.get $b)) (i32.const 0xFFFFE7FF)))
    (local.set $fb (i32.load offset=24 (local.get $b)))
    (local.set $prev (call $type_of_flags (local.get $fb)))
    ;; after code, its group and the state its block ends in; after the
    ;; source of an equation being edited, that equation
    (if (i32.eq (local.get $prev) (i32.const 8))
      (then
        (local.set $lang (i32.and (i32.shr_u (local.get $fb) (i32.const 16)) (i32.const 0x7FF)))
        (local.set $pcg (i32.or (i32.const 8) (i32.shl (local.get $lang) (i32.const 5))))
        (if (call $lang_load (local.get $lang))
          (then (local.set $hl (i32.and (call $hl_scan (call $block_start (i32.load (local.get $b))) (i32.load offset=4 (local.get $b))
                                                         (i32.shr_u (local.get $fb) (i32.const 27)))
                                        (i32.const 31)))))))
    (if (i32.and (i32.eq (local.get $prev) (i32.const 9)) (i32.eqz (i32.and (local.get $fb) (i32.const 0x6000))))
      (then (local.set $pcg (i32.const 9))))
    (call $lay (i32.load (local.get $a)) (local.get $r)
      (i32.add (i32.load offset=8 (local.get $b)) (i32.load offset=12 (local.get $b)))
      (local.get $prev) (local.get $pcg) (local.get $hl)
      (i32.shr_u (local.get $fb) (i32.const 16))
      (i32.const 0) (local.get $attrs)))

  ;; Bring the lines up to date with the document before a frame. Someone
  ;; else's edit above the view would move the text in it (your own edits
  ;; scroll to the caret instead), so the scroll moves with that text: the
  ;; first line in view, or the text just after an edit that reaches into the
  ;; view, stays where it was on screen. Math the caret moved into or out of
  ;; is laid out again like an edit.
  (func $update_layout
    (local $keep i32) (local $pos i32) (local $off i32) (local $k i32) (local $a i32) (local $sum i32) (local $os i32)
    (local $dy i32) (local $m i32) (local $om i32)
    (if (i32.or (global.get $dirty) (global.get $dmg_all)) (then (call $relayout) (return)))
    (local.set $m (call $math_active))
    (local.set $om (global.get $mact))
    (if (i32.ge_s (local.get $om) (i32.const 0)) (then (local.set $om (call $dmg_map (local.get $om)))))
    (if (i32.ne (local.get $m) (local.get $om))
      (then
        (if (i32.ge_s (local.get $om) (i32.const 0)) (then (call $damage_math (local.get $om))))
        (if (i32.ge_s (local.get $m) (i32.const 0)) (then (call $damage_math (local.get $m))))))
    (global.set $mact (local.get $m))
    (if (i32.and (i32.eq (global.get $laid_v) (global.get $docv)) (i32.eqz (global.get $ndmg))) (then (return)))
    (global.set $hl_lid (i32.const -1))
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

  ;; Where position $p before the edits noted at DAMAGE is now, or -1 when
  ;; they replaced it.
  (func $dmg_map (param $p i32) (result i32)
    (local $k i32) (local $a i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $k) (global.get $ndmg)))
        (local.set $a (call $dmg_rec (local.get $k)))
        (br_if $d (i32.lt_s (local.get $p) (i32.load (local.get $a))))
        (if (i32.lt_s (local.get $p) (i32.sub (i32.load offset=4 (local.get $a)) (i32.load offset=8 (local.get $a))))
          (then (return (i32.const -1))))
        (local.set $p (i32.add (local.get $p) (i32.load offset=8 (local.get $a))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l)))
    (local.get $p))

  ;; Note the block of the math at $p (a whole equation) as damaged, so that
  ;; it is laid out again.
  (func $damage_math (param $p i32)
    (local $bs i32) (local $q i32)
    (local.set $q (call $nl_after (local.get $p)))
    (local.set $bs (call $block_start (local.get $p)))
    (if (i32.eq (call $type_of (call $get (local.get $q))) (i32.const 9))
      (then (local.set $q (call $math_group_end (local.get $q)))))
    (local.set $q (i32.sub (i32.add (local.get $q) (i32.const 1)) (local.get $bs)))
    (call $damage (local.get $bs) (local.get $q) (local.get $q)))

  ;; y after the space above a block of type $t (group $cg) that follows
  ;; one of type $prev (group $pcg): margins collapse, runs of lists and
  ;; quotes stay tight, and code groups get their padding.
  (func $space_above_y (param $y i32) (param $prev i32) (param $pcg i32) (param $prev_after f32)
                       (param $t i32) (param $cg i32) (param $st i32) (param $n i32) (param $pad i32) (result i32)
    (if (i32.ge_s (local.get $prev) (i32.const 0))
      (then
        (if (i32.and (i32.ne (local.get $pcg) (i32.const 0)) (i32.ne (local.get $cg) (local.get $pcg)))
          (then
            (local.set $y (i32.add (local.get $y) (local.get $pad)))
            (call $flag_line (i32.sub (local.get $n) (i32.const 1)) (i32.const 0x800))))
        ;; runs of one type stay tight (not two different code blocks)
        (if (i32.and (i32.and (i32.eq (local.get $t) (local.get $prev)) (i32.eq (local.get $cg) (local.get $pcg)))
                     (f32.ge (f32.load offset=28 (local.get $st)) (f32.const 0)))
          (then (local.set $y (i32.add (local.get $y) (call $px (f32.load offset=28 (local.get $st))))))
          (else
            (local.set $y (i32.add (local.get $y)
              (call $px (f32.max (local.get $prev_after) (f32.load offset=16 (local.get $st))))))))))
    (if (i32.and (i32.ne (local.get $cg) (i32.const 0)) (i32.ne (local.get $cg) (local.get $pcg)))
      (then (local.set $y (i32.add (local.get $y) (local.get $pad)))))
    (local.get $y))

  ;; The last terminator of the equation with a block ending at $q: math
  ;; blocks follow until one that starts an equation of its own.
  (func $math_group_end (param $q i32) (result i32)
    (local $len i32) (local $r i32)
    (local.set $len (call $len))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (i32.add (local.get $q) (i32.const 1)) (local.get $len)))
        (local.set $r (call $nl_after (i32.add (local.get $q) (i32.const 1))))
        (br_if $d (i32.ne (i32.and (i32.shr_u (call $get (local.get $r)) (i32.const 16)) (i32.const 31)) (i32.const 9)))
        (local.set $q (local.get $r))
        (br $l)))
    (local.get $q))

  ;; Math is set 10% larger than the text around it; equations at the
  ;; size of a paragraph's text.
  (func $math_size (param $t i32) (result f32)
    (f32.mul (call $size_for (select (local.get $t) (i32.const 0) (i32.lt_u (local.get $t) (i32.const 8))) (i32.const 0))
             (f32.const 1.1)))

  ;; The line for the equation [gs, ge] (its last terminator): the formula
  ;; itself, or with $preview the preview under its source. Sets its height,
  ;; baseline, left and flags: 0x2000 an equation, 0x4000 a preview, 0x8000
  ;; empty; bits 16-31 the formula's width. Returns 0 when no preview is
  ;; needed.
  (global $eq_h (mut i32) (i32.const 0))
  (global $eq_base (mut i32) (i32.const 0))
  (global $eq_x0 (mut i32) (i32.const 0))
  (global $eq_flags (mut i32) (i32.const 0))
  (func $eq_box (param $gs i32) (param $ge i32) (param $preview i32) (result i32)
    (local $m i32) (local $pad i32) (local $h i32) (local $d i32) (local $w i32)
    (local.set $m (call $math_src (local.get $gs) (local.get $ge)))
    (local.set $pad (call $px (f32.const 8)))
    (global.set $eq_flags (i32.or (i32.const 0x309) (select (i32.const 0x4000) (i32.const 0x2000) (local.get $preview))))
    (if (call $blank_src (local.get $m))
      (then
        (if (local.get $preview) (then (return (i32.const 0))))
        ;; an empty equation still takes a line, to be clicked into
        (global.set $eq_h (call $px (f32.const 30)))
        (global.set $eq_base (call $px (f32.const 20)))
        (global.set $eq_x0 (i32.const 0))
        (global.set $eq_flags (i32.or (global.get $eq_flags) (i32.const 0x8000)))
        (return (i32.const 1))))
    (call $math_measure (local.get $m) (call $math_size (i32.const 9)) (i32.const 1))
    (local.set $h (i32.trunc_sat_f32_s (f32.ceil (global.get $bh))))
    (local.set $d (i32.trunc_sat_f32_s (f32.ceil (global.get $bd))))
    (local.set $w (i32.trunc_sat_f32_s (f32.ceil (global.get $bw))))
    (if (i32.gt_s (local.get $w) (i32.const 0xFFFF)) (then (local.set $w (i32.const 0xFFFF))))
    (global.set $eq_x0 (i32.shr_s (i32.sub (global.get $col_w) (local.get $w)) (i32.const 1)))
    (if (i32.lt_s (global.get $eq_x0) (i32.const 0)) (then (global.set $eq_x0 (i32.const 0))))
    (global.set $eq_h (i32.add (i32.add (local.get $h) (local.get $d)) (i32.shl (local.get $pad) (i32.const 1))))
    (global.set $eq_base (i32.add (local.get $pad) (local.get $h)))
    (global.set $eq_flags (i32.or (global.get $eq_flags) (i32.shl (local.get $w) (i32.const 16))))
    (i32.const 1))

  ;; Is the formula at MSRC ($m units) only blanks?
  (func $blank_src (param $m i32) (result i32)
    (local $i i32) (local $c i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $m)))
        (local.set $c (i32.load16_u (i32.add (global.get $MSRC) (i32.shl (local.get $i) (i32.const 1)))))
        (if (i32.eqz (i32.or (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 10)))
                             (i32.eq (local.get $c) (i32.const 9))))
          (then (return (i32.const 0))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (i32.const 1))

  ;; Put a line of text, taller if a formula on it needs more room than the
  ;; block's line height. Returns the height used.
  (func $put_text_line (param $n i32) (param $start i32) (param $end i32) (param $y i32) (param $h i32) (param $base i32)
                       (param $x0 i32) (param $flags i32) (param $band i32) (result i32)
    (local $below i32) (local $gap i32)
    (call $math_extent (local.get $start) (local.get $end))
    (if (i32.or (global.get $ex_h) (global.get $ex_d))
      (then
        (local.set $gap (call $px (f32.const 3)))
        (local.set $below (i32.sub (local.get $h) (local.get $base)))
        (if (i32.gt_s (i32.add (global.get $ex_h) (local.get $gap)) (local.get $base))
          (then (local.set $base (i32.add (global.get $ex_h) (local.get $gap)))))
        (if (i32.gt_s (i32.add (global.get $ex_d) (local.get $gap)) (local.get $below))
          (then (local.set $below (i32.add (global.get $ex_d) (local.get $gap)))))
        (local.set $h (i32.add (local.get $base) (local.get $below)))))
    (call $put_line (local.get $n) (local.get $start) (local.get $end) (local.get $y) (local.get $h) (local.get $base)
      (local.get $x0) (local.get $flags) (local.get $band))
    (local.get $h))

  ;; ---------------------------------------------------------------------
  ;; Inline math spans, of one block at a time. A span is 32 bytes at
  ;; MSPANS: +0 its "$", +4 after its closing "$", +8 w +12 h +16 d of the
  ;; formula (f32), +20 1 once they are measured. The one the caret is in
  ;; ($mact) shows its source. The spans stay listed until the document
  ;; changes or another block's are needed; formulas are measured when
  ;; first needed.
  ;; ---------------------------------------------------------------------

  (global $nspans (mut i32) (i32.const 0))
  (global $sp_hint (mut i32) (i32.const 0))
  (global $sp_bs (mut i32) (i32.const 0))     ;; the block they are of: [sp_bs, sp_q]
  (global $sp_q (mut i32) (i32.const -1))     ;; -1: none
  (global $sp_v (mut i32) (i32.const -1))     ;; for doc_version
  (global $sp_t (mut i32) (i32.const 0))      ;; the block's type
  (global $sp_first (mut i32) (i32.const -1)) ;; the block's first "$", or -1
  (global $sp_last (mut i32) (i32.const -1))  ;; its last "$" (or its end), or -1

  (func $span_addr (param $k i32) (result i32)
    (i32.add (global.get $MSPANS) (i32.shl (local.get $k) (i32.const 5))))

  ;; Does the span at $a show its source?
  (func $span_open (param $a i32) (result i32)
    (i32.eq (i32.load (local.get $a)) (global.get $mact)))

  ;; Measure the formula of the span at $a, if it is not yet.
  (func $span_measure (param $a i32)
    (if (i32.load offset=20 (local.get $a)) (then (return)))
    (call $math_measure
      (call $math_src (i32.add (i32.load (local.get $a)) (i32.const 1)) (i32.sub (i32.load offset=4 (local.get $a)) (i32.const 1)))
      (call $math_size (global.get $sp_t)) (i32.const 0))
    (f32.store offset=8 (local.get $a) (global.get $bw))
    (f32.store offset=12 (local.get $a) (global.get $bh))
    (f32.store offset=16 (local.get $a) (global.get $bd))
    (i32.store offset=20 (local.get $a) (i32.const 1)))

  ;; List the spans of block [bs, q) of type $t, unless they are.
  (func $load_spans (param $bs i32) (param $q i32) (param $t i32)
    (if (i32.and (i32.eq (global.get $sp_v) (global.get $docv))
                 (i32.and (i32.eq (global.get $sp_bs) (local.get $bs)) (i32.eq (global.get $sp_q) (local.get $q))))
      (then (return)))
    (global.set $nspans (i32.const 0))
    (global.set $sp_hint (i32.const 0))
    (global.set $sp_first (i32.const -1))
    (global.set $sp_last (i32.const -1))
    (global.set $sp_bs (local.get $bs))
    (global.set $sp_q (local.get $q))
    (global.set $sp_v (global.get $docv))
    (global.set $sp_t (local.get $t))
    (if (i32.lt_u (local.get $t) (i32.const 8)) (then (call $find_spans (local.get $bs) (local.get $q)))))

  ;; Make sure the spans listed are those of the block holding $p.
  (func $spans_at (param $p i32)
    (local $q i32)
    (if (i32.and (i32.eq (global.get $sp_v) (global.get $docv))
                 (i32.and (i32.ge_s (local.get $p) (global.get $sp_bs)) (i32.le_s (local.get $p) (global.get $sp_q))))
      (then (return)))
    (local.set $q (call $scan_to (local.get $p) (call $len) (i32.const 10)))
    (call $load_spans (call $scan_bs (local.get $p)) (local.get $q)
      (call $type_of_flags (i32.shr_u (call $get (local.get $q)) (i32.const 16)))))

  ;; The first position in [k, q) holding UTF-16 unit $ch, or $q. Like
  ;; $nl_after and $block_start below, but reading the cells a run at a
  ;; time, as a long block is read once per edit.
  (func $scan_to (param $k i32) (param $q i32) (param $ch i32) (result i32)
    (local $e i32) (local $a i32) (local $a0 i32) (local $ae i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $k) (local.get $q)))
        ;; the cells from $k that lie together, before the gap or after it
        (local.set $e (select (global.get $gs) (local.get $q)
          (i32.and (i32.lt_u (local.get $k) (global.get $gs)) (i32.gt_u (local.get $q) (global.get $gs)))))
        (local.set $a0 (call $addr (local.get $k)))
        (local.set $a (local.get $a0))
        (local.set $ae (i32.add (local.get $a0) (i32.shl (i32.sub (local.get $e) (local.get $k)) (i32.const 2))))
        (block $f
          (loop $m
            (br_if $f (i32.ge_u (local.get $a) (local.get $ae)))
            (if (i32.eq (i32.load16_u (local.get $a)) (local.get $ch))
              (then (return (i32.add (local.get $k) (i32.shr_u (i32.sub (local.get $a) (local.get $a0)) (i32.const 2))))))
            (local.set $a (i32.add (local.get $a) (i32.const 4)))
            (br $m)))
        (local.set $k (local.get $e))
        (br $l)))
    (local.get $q))

  ;; The first position of the block holding $p.
  (func $scan_bs (param $p i32) (result i32)
    (local $s i32) (local $a i32) (local $a0 i32)
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $p)))
        ;; the cells before $p that lie together
        (local.set $s (select (global.get $gs) (i32.const 0) (i32.gt_u (local.get $p) (global.get $gs))))
        (local.set $a0 (call $addr (local.get $s)))
        (local.set $a (i32.add (local.get $a0) (i32.shl (i32.sub (i32.sub (local.get $p) (local.get $s)) (i32.const 1)) (i32.const 2))))
        (block $f
          (loop $m
            (br_if $f (i32.lt_u (local.get $a) (local.get $a0)))
            (if (i32.eq (i32.load16_u (local.get $a)) (i32.const 10))
              (then (return (i32.add (i32.add (local.get $s) (i32.shr_u (i32.sub (local.get $a) (local.get $a0)) (i32.const 2))) (i32.const 1)))))
            (local.set $a (i32.sub (local.get $a) (i32.const 4)))
            (br $m)))
        (local.set $p (local.get $s))
        (br $l)))
    (i32.const 0))

;; Find the spans of the block [bs, q).
  (func $find_spans (param $bs i32) (param $q i32)
    (local $k i32) (local $j i32) (local $a i32)
    (local.set $k (local.get $bs))
    (block $d
      (loop $l
        (local.set $k (call $scan_to (local.get $k) (local.get $q) (i32.const 36)))
        (br_if $d (i32.ge_u (local.get $k) (local.get $q)))
        (if (i32.lt_s (global.get $sp_first) (i32.const 0)) (then (global.set $sp_first (local.get $k))))
        (global.set $sp_last (local.get $k))
        (if (i32.ge_u (global.get $nspans) (global.get $MSPAN_MAX))
          (then (global.set $sp_last (local.get $q)) (br $d)))
        (if (call $math_opener (local.get $k) (local.get $bs))
          (then
            (local.set $j (call $math_end (local.get $k) (local.get $q)))
            (if (local.get $j)
              (then
                (local.set $a (call $span_addr (global.get $nspans)))
                (global.set $nspans (i32.add (global.get $nspans) (i32.const 1)))
                (global.set $sp_last (i32.sub (local.get $j) (i32.const 1)))
                (i32.store (local.get $a) (local.get $k))
                (i32.store offset=4 (local.get $a) (local.get $j))
                (i32.store offset=20 (local.get $a) (i32.const 0))
                (local.set $k (local.get $j))
                (br $l)))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l))))

  ;; The span containing position $p, or -1. Layout, drawing and hit
  ;; testing walk forwards, so the last answer is tried first.
  (func $span_at (param $p i32) (result i32)
    (local $h i32) (local $lo i32) (local $hi i32) (local $mid i32)
    (if (i32.eqz (global.get $nspans)) (then (return (i32.const -1))))
    (local.set $h (global.get $sp_hint))
    (if (i32.lt_u (local.get $h) (global.get $nspans))
      (then
        (if (i32.le_u (i32.load (call $span_addr (local.get $h))) (local.get $p))
          (then
            (if (i32.lt_u (local.get $p) (i32.load offset=4 (call $span_addr (local.get $h)))) (then (return (local.get $h))))
            (local.set $h (i32.add (local.get $h) (i32.const 1)))
            (if (i32.ge_u (local.get $h) (global.get $nspans)) (then (return (i32.const -1))))
            (if (i32.gt_u (i32.load (call $span_addr (local.get $h))) (local.get $p)) (then (return (i32.const -1))))
            (if (i32.lt_u (local.get $p) (i32.load offset=4 (call $span_addr (local.get $h))))
              (then (global.set $sp_hint (local.get $h)) (return (local.get $h))))))))
    (if (i32.gt_u (i32.load (call $span_addr (i32.const 0))) (local.get $p)) (then (return (i32.const -1))))
    (local.set $hi (i32.sub (global.get $nspans) (i32.const 1)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_s (local.get $lo) (local.get $hi)))
        (local.set $mid (i32.shr_s (i32.add (i32.add (local.get $lo) (local.get $hi)) (i32.const 1)) (i32.const 1)))
        (if (i32.le_u (i32.load (call $span_addr (local.get $mid))) (local.get $p))
          (then (local.set $lo (local.get $mid)))
          (else (local.set $hi (i32.sub (local.get $mid) (i32.const 1)))))
        (br $l)))
    (global.set $sp_hint (local.get $lo))
    (if (i32.lt_u (local.get $p) (i32.load offset=4 (call $span_addr (local.get $lo)))) (then (return (local.get $lo))))
    (i32.const -1))

  ;; Advance of the cell at $p in a block of type $t: a formula's width at
  ;; its "$" and nothing after it; the source of the open one as code. The
  ;; spans of $p's block must be listed.
  (func $adv_at (param $p i32) (param $t i32) (result f32)
    (local $k i32) (local $a i32) (local $nx i32)
    (local.set $k (call $span_at (local.get $p)))
    (if (i32.lt_s (local.get $k) (i32.const 0))
      (then (return (call $adv (call $get (local.get $p)) (call $get (i32.add (local.get $p) (i32.const 1))) (local.get $t)))))
    (local.set $a (call $span_addr (local.get $k)))
    (if (call $span_open (local.get $a))
      (then
        (local.set $nx (call $get (i32.add (local.get $p) (i32.const 1))))
        (if (i32.lt_u (i32.add (local.get $p) (i32.const 1)) (i32.load offset=4 (local.get $a)))
          (then (local.set $nx (i32.or (local.get $nx) (i32.const 0x100000)))))
        (return (call $adv (i32.or (call $get (local.get $p)) (i32.const 0x100000)) (local.get $nx) (local.get $t)))))
    (if (i32.eq (local.get $p) (i32.load (local.get $a)))
      (then
        (call $span_measure (local.get $a))
        (return (f32.load offset=8 (local.get $a)))))
    (f32.const 0))

  ;; The first span starting at or after $p (or $nspans).
  (func $span_from (param $p i32) (result i32)
    (local $lo i32) (local $hi i32) (local $mid i32)
    (local.set $hi (global.get $nspans))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $lo) (local.get $hi)))
        (local.set $mid (i32.shr_u (i32.add (local.get $lo) (local.get $hi)) (i32.const 1)))
        (if (i32.lt_u (i32.load (call $span_addr (local.get $mid))) (local.get $p))
          (then (local.set $lo (i32.add (local.get $mid) (i32.const 1))))
          (else (local.set $hi (local.get $mid))))
        (br $l)))
    (local.get $lo))

  ;; The tallest formula starting in [start, end): sets $ex_h and $ex_d.
  (func $math_extent (param $start i32) (param $end i32)
    (local $k i32) (local $a i32)
    (global.set $ex_h (i32.const 0))
    (global.set $ex_d (i32.const 0))
    (local.set $k (call $span_from (local.get $start)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $k) (global.get $nspans)))
        (local.set $a (call $span_addr (local.get $k)))
        (br_if $d (i32.ge_u (i32.load (local.get $a)) (local.get $end)))
        (if (i32.and (i32.ge_u (i32.load (local.get $a)) (local.get $start)) (i32.eqz (call $span_open (local.get $a))))
          (then
            (call $span_measure (local.get $a))
            (global.set $ex_h (call $imax (global.get $ex_h) (i32.trunc_sat_f32_s (f32.ceil (f32.load offset=12 (local.get $a))))))
            (global.set $ex_d (call $imax (global.get $ex_d) (i32.trunc_sat_f32_s (f32.ceil (f32.load offset=16 (local.get $a))))))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l))))

  (func $imax (param $a i32) (param $b i32) (result i32)
    (select (local.get $a) (local.get $b) (i32.gt_s (local.get $a) (local.get $b))))

;; Which math shows its source: the equation or inline span that holds
  ;; the caret (and the whole selection). Returns its first position (the
  ;; equation's first block, or the span's "$"), or -1.
  (func $math_active (result i32)
    (local $f i32) (local $a i32) (local $q i32) (local $gs i32) (local $k i32) (local $sa i32) (local $sb i32)
    (local.set $f (global.get $focus))
    (local.set $a (global.get $anchor))
    (call $spans_at (local.get $f))
    (local.set $q (global.get $sp_q))
    (if (i32.eq (call $type_of (call $get (local.get $q))) (i32.const 9))
      (then
        ;; back to the line that starts the equation
        (local.set $gs (global.get $sp_bs))
        (block $d
          (loop $l
            (br_if $d (i32.eqz (local.get $gs)))
            (br_if $d (i32.and (call $get (call $nl_after (local.get $gs))) (i32.const 0x100000)))
            (br_if $d (i32.ne (call $type_of (call $get (i32.sub (local.get $gs) (i32.const 1)))) (i32.const 9)))
            (local.set $gs (call $block_start (i32.sub (local.get $gs) (i32.const 1))))
            (br $l)))
        (if (i32.and (i32.ge_u (local.get $a) (local.get $gs)) (i32.le_u (local.get $a) (call $math_group_end (local.get $q))))
          (then (return (local.get $gs))))
        (return (i32.const -1))))
    (local.set $k (call $span_at (local.get $f)))
    (if (i32.lt_s (local.get $k) (i32.const 0)) (then (return (i32.const -1))))
    (local.set $sa (i32.load (call $span_addr (local.get $k))))
    (local.set $sb (i32.load offset=4 (call $span_addr (local.get $k))))
    (if (i32.and (i32.lt_u (local.get $sa) (local.get $f))
                 (i32.and (i32.lt_u (local.get $sa) (local.get $a)) (i32.gt_u (local.get $sb) (local.get $a))))
      (then (return (local.get $sa))))
    (i32.const -1))

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

  ;; The last line starting at or before position $pos (not an equation's
  ;; preview, which holds no positions).
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
    (if (i32.and (i32.ne (i32.and (i32.load offset=24 (call $line_addr (local.get $lo))) (i32.const 0x4000)) (i32.const 0))
                 (i32.gt_s (local.get $lo) (i32.const 0)))
      (then (local.set $lo (i32.sub (local.get $lo) (i32.const 1)))))
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
    (local $a i32) (local $p i32) (local $t i32) (local $x f32) (local $flags i32)
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $flags (i32.load offset=24 (local.get $a)))
    (local.set $t (call $type_of_flags (local.get $flags)))
    (local.set $x (f32.convert_i32_s (i32.load offset=20 (local.get $a))))
    (local.set $p (i32.load (local.get $a)))
    ;; a typeset equation: its left or right edge
    (if (i32.and (local.get $flags) (i32.const 0x6000))
      (then
        (if (i32.and (i32.ne (i32.and (local.get $flags) (i32.const 0x2000)) (i32.const 0)) (i32.gt_u (local.get $pos) (local.get $p)))
          (then (local.set $x (f32.add (local.get $x) (f32.convert_i32_u (i32.shr_u (local.get $flags) (i32.const 16)))))))
        (return (local.get $x))))
    (call $spans_at (local.get $p))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $pos)))
        (local.set $x (f32.add (local.get $x) (call $adv_at (local.get $p) (local.get $t))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $x))

  ;; Position nearest to x (from the column's left edge) in line $i. Past the
  ;; end of a wrapped line, the caret sticks to that line ($affinity = 1).
  (func $pos_in_line (param $i i32) (param $x f32) (result i32)
    (local $a i32) (local $p i32) (local $end i32) (local $t i32) (local $cx f32) (local $w f32) (local $c i32) (local $flags i32)
    (local $k i32)
    (local.set $a (call $line_addr (local.get $i)))
    (local.set $flags (i32.load offset=24 (local.get $a)))
    (local.set $t (call $type_of_flags (local.get $flags)))
    (local.set $cx (f32.convert_i32_s (i32.load offset=20 (local.get $a))))
    (local.set $p (i32.load (local.get $a)))
    (local.set $end (i32.load offset=4 (local.get $a)))
    (global.set $affinity (i32.const 0))
    ;; on a typeset equation, its start or end, which opens it; on the
    ;; preview, the end of the source
    (if (i32.and (local.get $flags) (i32.const 0x4000)) (then (return (local.get $end))))
    (if (i32.and (local.get $flags) (i32.const 0x2000))
      (then
        (return (select (local.get $p) (local.get $end)
          (f32.lt (local.get $x)
            (f32.add (local.get $cx) (f32.mul (f32.convert_i32_u (i32.shr_u (local.get $flags) (i32.const 16))) (f32.const 0.5))))))))
    (call $spans_at (local.get $p))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $end)))
        (local.set $c (call $get (local.get $p)))
        (local.set $w (call $adv_at (local.get $p) (local.get $t)))
        ;; a typeset formula is one unit: before it or after it
        (local.set $k (call $span_at (local.get $p)))
        (if (i32.ge_s (local.get $k) (i32.const 0))
          (then
            (if (i32.eqz (call $span_open (call $span_addr (local.get $k))))
              (then
                (if (f32.lt (local.get $x) (f32.add (local.get $cx) (f32.mul (local.get $w) (f32.const 0.5))))
                  (then (return (local.get $p))))
                (local.set $cx (f32.add (local.get $cx) (local.get $w)))
                (local.set $p (i32.load offset=4 (call $span_addr (local.get $k))))
                (br $l)))))
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
