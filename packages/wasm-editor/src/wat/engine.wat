;; engine.wat -- a rich text editing engine written by hand in WebAssembly text.
;;
;; No compiler is involved: every instruction below was written by hand and is
;; assembled 1:1 by scripts/assemble.mjs. This file holds the module fields
;; only; editor.wat (the DOM editor) and canvas.wat (the graphical editor)
;; wrap it in a module with `;; @include` and declare the memory.
;;
;; ------------------------------------------------------------------------
;; Document model
;; ------------------------------------------------------------------------
;; The document is a flat sequence of 32-bit cells kept in a gap buffer.
;;
;;   bits  0..15  one UTF-16 code unit. 10 ("\n") terminates a block.
;;   text cells:
;;     bits 16..20  marks: 1 bold, 2 italic, 4 underline, 8 strike, 16 code
;;     bits 21..31  link id (0 = no link, see the link table)
;;   block terminators ("\n" cells) carry the format of the block they end:
;;     bits 16..19  block type: 0 paragraph, 1-3 heading, 4 quote,
;;                  5 bullet, 6 ordered, 7 todo, 8 code
;;     bit  20      todo is checked
;;
;; The document always ends with a terminator, so an empty document is a
;; single empty paragraph. Positions are cell indices; a caret may sit at any
;; position except after the final terminator.
;;
;; ------------------------------------------------------------------------
;; Memory map
;; ------------------------------------------------------------------------
;;   0x000100  STR     NUL-separated ASCII strings (the data segment below)
;;   0x001000  STRTAB  string index built at start: (u16 addr, u16 len) per id
;;   0x002000  TMP     a few bytes of scratch for single-cell inserts
;;   0x010000  DOC     gap buffer, 1M cells (4 MiB)
;;   0x410000  UNDO    undo/redo log (4 MiB)
;;   0x810000  LINKS   link table, (addr, len) per id, 2048 ids
;;   0x814000  ARENA   link URLs, UTF-16
;;   0x850000  OUT     scratch for host input and render/export output. In
;;                     editor.wat OUT is last and grows with memory.grow;
;;                     canvas.wat moves it and caps it ($OUT, $out_cap).
;;
;; ------------------------------------------------------------------------
;; Undo log
;; ------------------------------------------------------------------------
;; Records are sequences of i32 words: [size kind a b payload... size].
;; The size (in words) is stored at both ends so the log can be walked in
;; either direction.
;;   1 BEGIN  a=anchor b=focus before the edit        (5 words)
;;   2 END    a=anchor b=focus after the edit         (5 words)
;;   3 INSERT a=pos b=n, payload = the n inserted cells
;;   4 DELETE a=pos b=n, payload = the n deleted cells
;;   5 SET    a=pos b=n, payload = n old cells then n new cells
;; Every edit is a transaction BEGIN ... END. Undo walks back from $ucur
;; applying inverses; redo walks forward re-applying. When the log fills up
;; the oldest transactions are dropped.

  ;; ---------------------------------------------------------------------
  ;; Constants
  ;; ---------------------------------------------------------------------
  (global $STRTAB    i32 (i32.const 0x1000))
  (global $TMP       i32 (i32.const 0x2000))
  (global $DOC       i32 (i32.const 0x10000))
  (global $CAP       i32 (i32.const 0x100000))
  (global $UNDO      i32 (i32.const 0x410000))
  (global $UNDO_END  i32 (i32.const 0x810000))
  (global $LINKS     i32 (i32.const 0x810000))
  (global $LINK_MAX  i32 (i32.const 2048))
  (global $ARENA     i32 (i32.const 0x814000))
  (global $ARENA_END i32 (i32.const 0x850000))
  (global $OUT       (mut i32) (i32.const 0x850000))   ;; canvas.wat moves it
  (global $out_cap   (mut i32) (i32.const 0))          ;; end of OUT, 0 = unbounded

  ;; ---------------------------------------------------------------------
  ;; State
  ;; ---------------------------------------------------------------------
  (global $gs (mut i32) (i32.const 0))          ;; gap start (cell index)
  (global $ge (mut i32) (i32.const 0))          ;; gap end (cell index)
  (global $anchor (mut i32) (i32.const 0))
  (global $focus (mut i32) (i32.const 0))
  (global $stored (mut i32) (i32.const -1))     ;; marks for the next typed text, -1 = inherit
  (global $nlinks (mut i32) (i32.const 1))      ;; next free link id
  (global $atop (mut i32) (i32.const 0))        ;; link arena top
  (global $utop (mut i32) (i32.const 0))        ;; end of the undo log
  (global $ucur (mut i32) (i32.const 0))        ;; undo position (== utop unless undone)
  (global $txn (mut i32) (i32.const 0))         ;; BEGIN record of the open transaction, 0 = none
  (global $ulost (mut i32) (i32.const 0))       ;; history was dropped during this transaction
  (global $last_begin (mut i32) (i32.const 0))  ;; BEGIN of the last committed transaction
  (global $slog (mut i32) (i32.const 0))        ;; the pending SET record is being logged
  (global $coalesce (mut i32) (i32.const -1))   ;; caret where typing may extend the last transaction
  (global $op (mut i32) (i32.const 0))          ;; output write pointer
  (global $mem_end (mut i32) (i32.const 0))     ;; bytes of linear memory
  (global $last_attrs (mut i32) (i32.const -1)) ;; attrs of the last block parsed from markdown

  ;; markdown import state
  (global $mT (mut i32) (i32.const 0))          ;; block source text write pointer
  (global $mR (mut i32) (i32.const 0))          ;; block record write pointer
  (global $mrec (mut i32) (i32.const 0))        ;; open block record
  (global $mC (mut i32) (i32.const 0))          ;; output cell write pointer
  (global $im (mut i32) (i32.const 0))          ;; inline: active marks
  (global $il (mut i32) (i32.const 0))          ;; inline: active link id
  (global $ilend (mut i32) (i32.const 0))       ;; inline: address of the "]" ending the link text
  (global $ilskip (mut i32) (i32.const 0))      ;; inline: where to resume after "](url)"

  ;; ---------------------------------------------------------------------
  ;; Strings, by id. $init indexes them into STRTAB.
  ;; ---------------------------------------------------------------------
  ;;  0 <p>   1 </p>   2 <h1>  3 </h1>  4 <h2>  5 </h2>  6 <h3>  7 </h3>
  ;;  8 <blockquote>   9 </blockquote>
  ;; 10 <div class="rt-ul">  11 </div>   12 <div class="rt-ol">  13 </div>
  ;; 14 <div class="rt-todo"> 15 </div>  16 <pre class="rt-code"> 17 </pre>
  ;; 18 <div class="rt-todo rt-done">    19 <br>
  ;; 20 <strong> 21 </strong> 22 <em> 23 </em> 24 <u> 25 </u> 26 <s> 27 </s>
  ;; 28 <code> 29 </code>
  ;; 30 <a href="   31 ">   32 </a>
  ;; 33 &amp;  34 &lt;  35 &gt;  36 &quot;
  ;; 37 <ul> 38 </ul> 39 <ol> 40 </ol> 41 <li> 42 </li> 43 <ul class="todo">
  ;; 44 <li><input type="checkbox" disabled>
  ;; 45 <li><input type="checkbox" checked disabled>
  ;; 46 <pre><code>  47 </code></pre>
  ;; 48 "# "  49 "## "  50 "### "  51 "> "  52 "- "  53 "- [ ] "  54 "- [x] "
  ;; 55 ```   56 **   57 *   58 ~~   59 `   60 [   61 ](   62 )   63 ". "
  ;; 64 http  65 https  66 mailto  67 tel  68 http://  69 https://
  (data (i32.const 0x100)
    "<p>\00</p>\00<h1>\00</h1>\00<h2>\00</h2>\00<h3>\00</h3>\00"
    "<blockquote>\00</blockquote>\00"
    "<div class=\"rt-ul\">\00</div>\00<div class=\"rt-ol\">\00</div>\00"
    "<div class=\"rt-todo\">\00</div>\00<pre class=\"rt-code\">\00</pre>\00"
    "<div class=\"rt-todo rt-done\">\00<br>\00"
    "<strong>\00</strong>\00<em>\00</em>\00<u>\00</u>\00<s>\00</s>\00"
    "<code>\00</code>\00"
    "<a href=\"\00\">\00</a>\00"
    "&amp;\00&lt;\00&gt;\00&quot;\00"
    "<ul>\00</ul>\00<ol>\00</ol>\00<li>\00</li>\00<ul class=\"todo\">\00"
    "<li><input type=\"checkbox\" disabled> \00"
    "<li><input type=\"checkbox\" checked disabled> \00"
    "<pre><code>\00</code></pre>\00"
    "# \00## \00### \00> \00- \00- [ ] \00- [x] \00"
    "```\00**\00*\00~~\00`\00[\00](\00)\00. \00"
    "http\00https\00mailto\00tel\00http://\00https://\00")

  ;; =====================================================================
  ;; Start-up
  ;; =====================================================================

  (func $init
    (local $p i32) (local $s i32) (local $k i32) (local $row i32)
    (global.set $mem_end (i32.shl (memory.size) (i32.const 16)))
    ;; Index the NUL-separated strings. An empty string ends the list.
    (local.set $p (i32.const 0x100))
    (local.set $s (i32.const 0x100))
    (block $done
      (loop $scan
        (if (i32.eqz (i32.load8_u (local.get $p)))
          (then
            (br_if $done (i32.eq (local.get $p) (local.get $s)))
            (local.set $row (i32.add (global.get $STRTAB) (i32.shl (local.get $k) (i32.const 2))))
            (i32.store16 (local.get $row) (local.get $s))
            (i32.store16 offset=2 (local.get $row) (i32.sub (local.get $p) (local.get $s)))
            (local.set $k (i32.add (local.get $k) (i32.const 1)))
            (local.set $s (i32.add (local.get $p) (i32.const 1)))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $scan)))
    (call $reset))
  (start $init)

  ;; Empty the document (one empty paragraph), links and history.
  (func $reset (export "reset")
    (global.set $gs (i32.const 0))
    (global.set $ge (i32.sub (global.get $CAP) (i32.const 1)))
    (i32.store (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2))) (i32.const 10))
    (global.set $anchor (i32.const 0))
    (global.set $focus (i32.const 0))
    (global.set $stored (i32.const -1))
    (global.set $nlinks (i32.const 1))
    (global.set $atop (global.get $ARENA))
    (call $clear_history))

  (func $clear_history (export "clear_history")
    (global.set $utop (global.get $UNDO))
    (global.set $ucur (global.get $UNDO))
    (global.set $txn (i32.const 0))
    (global.set $ulost (i32.const 0))
    (global.set $coalesce (i32.const -1)))

  ;; =====================================================================
  ;; Memory and output
  ;; =====================================================================

  ;; Make OUT addressable up to byte $end. canvas.wat keeps other regions
  ;; after OUT, so there OUT is capped instead of growing into them.
  (func $ensure (param $end i32)
    (if (i32.and (i32.ne (global.get $out_cap) (i32.const 0))
                 (i32.gt_u (local.get $end) (global.get $out_cap)))
      (then unreachable))
    (call $grow_to (local.get $end)))

  ;; Grow linear memory so that byte address $end is addressable.
  (func $grow_to (param $end i32)
    (if (i32.gt_u (local.get $end) (global.get $mem_end))
      (then
        (if (i32.eq
              (memory.grow (i32.add (i32.shr_u (i32.sub (local.get $end) (global.get $mem_end)) (i32.const 16))
                                    (i32.const 16)))
              (i32.const -1))
          (then unreachable))
        (global.set $mem_end (i32.shl (memory.size) (i32.const 16))))))

  ;; Reserve $bytes of scratch at OUT for JS to write into; returns OUT.
  (func $scratch (export "scratch") (param $bytes i32) (result i32)
    (call $ensure (i32.add (global.get $OUT) (local.get $bytes)))
    (global.get $OUT))

  (func $emit (param $c i32)
    (if (i32.gt_u (i32.add (global.get $op) (i32.const 2)) (global.get $mem_end))
      (then (call $ensure (i32.add (global.get $op) (i32.const 2)))))
    (i32.store16 (global.get $op) (local.get $c))
    (global.set $op (i32.add (global.get $op) (i32.const 2))))

  ;; Emit string $k (ASCII bytes widened to UTF-16).
  (func $emit_str (param $k i32)
    (local $a i32) (local $n i32)
    (local.set $a (i32.add (global.get $STRTAB) (i32.shl (local.get $k) (i32.const 2))))
    (local.set $n (i32.load16_u offset=2 (local.get $a)))
    (local.set $a (i32.load16_u (local.get $a)))
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $n)))
        (call $emit (i32.load8_u (local.get $a)))
        (local.set $a (i32.add (local.get $a) (i32.const 1)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $l))))

  ;; Emit a code unit, escaped for HTML text and attribute values.
  (func $emit_esc (param $c i32)
    (if (i32.eq (local.get $c) (i32.const 38)) (then (call $emit_str (i32.const 33)) (return)))
    (if (i32.eq (local.get $c) (i32.const 60)) (then (call $emit_str (i32.const 34)) (return)))
    (if (i32.eq (local.get $c) (i32.const 62)) (then (call $emit_str (i32.const 35)) (return)))
    (if (i32.eq (local.get $c) (i32.const 34)) (then (call $emit_str (i32.const 36)) (return)))
    (call $emit (local.get $c)))

  (func $emit_num (param $n i32)
    (if (i32.ge_u (local.get $n) (i32.const 10))
      (then (call $emit_num (i32.div_u (local.get $n) (i32.const 10)))))
    (call $emit (i32.add (i32.const 48) (i32.rem_u (local.get $n) (i32.const 10)))))

  ;; Emit the URL of link $id. $md = 0: HTML-escaped; 1: for a markdown
  ;; destination, with spaces and parentheses percent-encoded.
  (func $emit_url (param $id i32) (param $md i32)
    (local $a i32) (local $n i32) (local $c i32)
    (local.set $a (i32.add (global.get $LINKS) (i32.shl (local.get $id) (i32.const 3))))
    (local.set $n (i32.load offset=4 (local.get $a)))
    (local.set $a (i32.load (local.get $a)))
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $n)))
        (local.set $c (i32.load16_u (local.get $a)))
        (if (local.get $md)
          (then
            (if (i32.eq (local.get $c) (i32.const 32))
              (then (call $emit (i32.const 37)) (call $emit (i32.const 50)) (call $emit (i32.const 48)))
              (else
                (if (i32.eq (local.get $c) (i32.const 40))
                  (then (call $emit (i32.const 37)) (call $emit (i32.const 50)) (call $emit (i32.const 56)))
                  (else
                    (if (i32.eq (local.get $c) (i32.const 41))
                      (then (call $emit (i32.const 37)) (call $emit (i32.const 50)) (call $emit (i32.const 57)))
                      (else (call $emit (local.get $c)))))))))
          (else (call $emit_esc (local.get $c))))
        (local.set $a (i32.add (local.get $a) (i32.const 2)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $l))))

  ;; Number of UTF-16 units written since OUT.
  (func $out_len (result i32)
    (i32.shr_u (i32.sub (global.get $op) (global.get $OUT)) (i32.const 1)))

  ;; =====================================================================
  ;; Gap buffer
  ;; =====================================================================

  (func $len (export "length") (result i32)
    (i32.sub (global.get $CAP) (i32.sub (global.get $ge) (global.get $gs))))

  ;; Address of the cell at logical position $p.
  (func $addr (param $p i32) (result i32)
    (if (i32.ge_u (local.get $p) (global.get $gs))
      (then (local.set $p (i32.add (local.get $p) (i32.sub (global.get $ge) (global.get $gs))))))
    (i32.add (global.get $DOC) (i32.shl (local.get $p) (i32.const 2))))

  (func $get (param $p i32) (result i32)
    (i32.load (call $addr (local.get $p))))

  ;; Move the gap so that it starts at logical position $p.
  (func $move_gap (param $p i32)
    (local $n i32)
    (if (i32.lt_u (local.get $p) (global.get $gs))
      (then
        ;; cells [p, gs) slide up to end at ge
        (local.set $n (i32.sub (global.get $gs) (local.get $p)))
        (global.set $ge (i32.sub (global.get $ge) (local.get $n)))
        (global.set $gs (local.get $p))
        (memory.copy
          (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2)))
          (i32.add (global.get $DOC) (i32.shl (local.get $p) (i32.const 2)))
          (i32.shl (local.get $n) (i32.const 2)))))
    (if (i32.gt_u (local.get $p) (global.get $gs))
      (then
        ;; cells [gs, p) slide down from just after the gap
        (local.set $n (i32.sub (local.get $p) (global.get $gs)))
        (memory.copy
          (i32.add (global.get $DOC) (i32.shl (global.get $gs) (i32.const 2)))
          (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2)))
          (i32.shl (local.get $n) (i32.const 2)))
        (global.set $gs (local.get $p))
        (global.set $ge (i32.add (global.get $ge) (local.get $n))))))

  ;; Is there room for $n more cells?
  (func $room (param $n i32) (result i32)
    (i32.gt_u (i32.sub (global.get $ge) (global.get $gs)) (local.get $n)))

  ;; Copy the logical document to OUT (for debugging and tests).
  (func (export "cells") (result i32)
    (local $n i32)
    (local.set $n (call $len))
    (call $ensure (i32.add (global.get $OUT) (i32.shl (local.get $n) (i32.const 2))))
    (memory.copy (global.get $OUT) (global.get $DOC) (i32.shl (global.get $gs) (i32.const 2)))
    (memory.copy
      (i32.add (global.get $OUT) (i32.shl (global.get $gs) (i32.const 2)))
      (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2)))
      (i32.shl (i32.sub (global.get $CAP) (global.get $ge)) (i32.const 2)))
    (local.get $n))

  (func (export "gap_start") (result i32) (global.get $gs))
  (func (export "gap_end") (result i32) (global.get $ge))
  (func (export "undo_bytes") (result i32) (i32.sub (global.get $utop) (global.get $UNDO)))
  (func (export "undo_cursor") (result i32) (i32.sub (global.get $ucur) (global.get $UNDO)))
  (func (export "link_count") (result i32) (i32.sub (global.get $nlinks) (i32.const 1)))

  ;; =====================================================================
  ;; Cells and blocks
  ;; =====================================================================

  (func $is_nl (param $c i32) (result i32)
    (i32.eq (i32.and (local.get $c) (i32.const 0xFFFF)) (i32.const 10)))

  (func $type_of (param $c i32) (result i32)
    (i32.and (i32.shr_u (local.get $c) (i32.const 16)) (i32.const 15)))

  (func $is_space (param $c i32) (result i32)
    (local.set $c (i32.and (local.get $c) (i32.const 0xFFFF)))
    (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 9))))

  ;; Position of the terminator of the block containing $p.
  (func $nl_after (param $p i32) (result i32)
    (loop $l
      (if (i32.eqz (call $is_nl (call $get (local.get $p))))
        (then
          (local.set $p (i32.add (local.get $p) (i32.const 1)))
          (br $l))))
    (local.get $p))

  ;; First position of the block containing $p.
  (func $block_start (param $p i32) (result i32)
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $p)))
        (br_if $d (call $is_nl (call $get (i32.sub (local.get $p) (i32.const 1)))))
        (local.set $p (i32.sub (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $p))

  (func $count_seg (param $a i32) (param $end i32) (result i32)
    (local $n i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $a) (local.get $end)))
        (if (i32.eq (i32.load16_u (local.get $a)) (i32.const 10))
          (then (local.set $n (i32.add (local.get $n) (i32.const 1)))))
        (local.set $a (i32.add (local.get $a) (i32.const 4)))
        (br $l)))
    (local.get $n))

  ;; Number of blocks = number of terminators, counted on both sides of the gap.
  (func $count_nl (export "block_count") (result i32)
    (i32.add
      (call $count_seg
        (global.get $DOC)
        (i32.add (global.get $DOC) (i32.shl (global.get $gs) (i32.const 2))))
      (call $count_seg
        (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2)))
        (i32.add (global.get $DOC) (i32.shl (global.get $CAP) (i32.const 2))))))

  ;; 0 whitespace, 1 word character, 2 punctuation (for word deletion)
  (func $char_class (param $c i32) (result i32)
    (local.set $c (i32.and (local.get $c) (i32.const 0xFFFF)))
    (if (i32.or (call $is_space (local.get $c)) (i32.eq (local.get $c) (i32.const 0xA0)))
      (then (return (i32.const 0))))
    (if (call $is_alnum (local.get $c)) (then (return (i32.const 1))))
    (if (i32.eq (local.get $c) (i32.const 95)) (then (return (i32.const 1))))
    (i32.const 2))

  (func $is_alnum (param $c i32) (result i32)
    (i32.or
      (i32.ge_u (local.get $c) (i32.const 128))
      (i32.or
        (i32.lt_u (i32.sub (local.get $c) (i32.const 48)) (i32.const 10))
        (i32.lt_u (i32.sub (i32.or (local.get $c) (i32.const 32)) (i32.const 97)) (i32.const 26)))))

  ;; =====================================================================
  ;; Selection
  ;; =====================================================================

  (func (export "anchor") (result i32) (global.get $anchor))
  (func (export "focus") (result i32) (global.get $focus))

  (func $clamp (param $p i32) (result i32)
    (local $max i32)
    (local.set $max (i32.sub (call $len) (i32.const 1)))
    (if (i32.lt_s (local.get $p) (i32.const 0)) (then (return (i32.const 0))))
    (if (i32.gt_s (local.get $p) (local.get $max)) (then (return (local.get $max))))
    (local.get $p))

  (func $set_selection (export "set_selection") (param $a i32) (param $f i32)
    (local.set $a (call $clamp (local.get $a)))
    (local.set $f (call $clamp (local.get $f)))
    (if (i32.or (i32.ne (local.get $a) (global.get $anchor)) (i32.ne (local.get $f) (global.get $focus)))
      (then
        (global.set $anchor (local.get $a))
        (global.set $focus (local.get $f))
        (global.set $stored (i32.const -1))
        (global.set $coalesce (i32.const -1)))))

  (func $smin (result i32)
    (select (global.get $anchor) (global.get $focus) (i32.lt_u (global.get $anchor) (global.get $focus))))

  (func $smax (result i32)
    (select (global.get $focus) (global.get $anchor) (i32.lt_u (global.get $anchor) (global.get $focus))))

  (func $collapse (param $p i32)
    (global.set $anchor (local.get $p))
    (global.set $focus (local.get $p)))

  ;; Marks that text typed at caret $p picks up: the stored marks if any,
  ;; else those of the character before (or after, at a block start). A link
  ;; is only continued when the caret is inside it, not at its end.
  (func $marks_at (param $p i32) (result i32)
    (local $prev i32) (local $next i32) (local $m i32)
    (if (i32.ne (global.get $stored) (i32.const -1)) (then (return (global.get $stored))))
    (local.set $next (call $get (local.get $p)))
    (local.set $prev (i32.const 10))
    (if (local.get $p) (then (local.set $prev (call $get (i32.sub (local.get $p) (i32.const 1))))))
    (if (call $is_nl (local.get $prev))
      (then
        (if (call $is_nl (local.get $next)) (then (return (i32.const 0))))
        (return (i32.and (i32.shr_u (local.get $next) (i32.const 16)) (i32.const 31)))))
    (local.set $m (i32.shr_u (local.get $prev) (i32.const 16)))
    (if (i32.or
          (call $is_nl (local.get $next))
          (i32.ne (i32.shr_u (local.get $next) (i32.const 21)) (i32.shr_u (local.get $prev) (i32.const 21))))
      (then (local.set $m (i32.and (local.get $m) (i32.const 31)))))
    (local.get $m))

  ;; Marks shared by the whole selection (for toolbar state).
  (func $sel_marks (export "sel_marks") (result i32)
    (local $p i32) (local $e i32) (local $m i32) (local $any i32) (local $c i32)
    (local.set $p (call $smin))
    (local.set $e (call $smax))
    (if (i32.eq (local.get $p) (local.get $e))
      (then (return (i32.and (call $marks_at (local.get $p)) (i32.const 31)))))
    (local.set $m (i32.const 31))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $e)))
        (local.set $c (call $get (local.get $p)))
        (if (i32.eqz (call $is_nl (local.get $c)))
          (then
            (local.set $m (i32.and (local.get $m) (i32.shr_u (local.get $c) (i32.const 16))))
            (local.set $any (i32.const 1))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (select (i32.and (local.get $m) (i32.const 31)) (i32.const 0) (local.get $any)))

  ;; Block attrs (type | checked) of the block holding the focus.
  (func $sel_block (export "sel_block") (result i32)
    (i32.shr_u (call $get (call $nl_after (global.get $focus))) (i32.const 16)))

  ;; =====================================================================
  ;; Undo log
  ;; =====================================================================

  (func $uw (param $v i32)
    (i32.store (global.get $utop) (local.get $v))
    (global.set $utop (i32.add (global.get $utop) (i32.const 4))))

  ;; Make room for $bytes more bytes of log. Drops the oldest transactions if
  ;; needed; if even that is not enough, forgets all history and returns 0.
  (func $ureserve (param $bytes i32) (result i32)
    (local $need i32) (local $a i32) (local $end i32)
    (if (i32.le_u (i32.add (global.get $utop) (local.get $bytes)) (global.get $UNDO_END))
      (then (return (i32.const 1))))
    (local.set $need (i32.sub (i32.add (global.get $utop) (local.get $bytes)) (global.get $UNDO_END)))
    (local.set $a (global.get $UNDO))
    (block $fail
      (loop $walk
        (br_if $fail (i32.ge_u (local.get $a) (global.get $txn)))
        (local.set $end (i32.add (local.get $a) (i32.shl (i32.load (local.get $a)) (i32.const 2))))
        (if (i32.and
              (i32.eq (i32.load offset=4 (local.get $a)) (i32.const 2))
              (i32.ge_u (i32.sub (local.get $end) (global.get $UNDO)) (local.get $need)))
          (then
            ;; drop every transaction up to and including this END
            (local.set $end (i32.sub (local.get $end) (global.get $UNDO)))
            (memory.copy
              (global.get $UNDO)
              (i32.add (global.get $UNDO) (local.get $end))
              (i32.sub (global.get $utop) (i32.add (global.get $UNDO) (local.get $end))))
            (global.set $utop (i32.sub (global.get $utop) (local.get $end)))
            (global.set $txn (i32.sub (global.get $txn) (local.get $end)))
            (global.set $last_begin (i32.sub (global.get $last_begin) (local.get $end)))
            (return (i32.const 1))))
        (local.set $a (i32.add (local.get $a) (i32.shl (i32.load (local.get $a)) (i32.const 2))))
        (br $walk)))
    (global.set $utop (global.get $UNDO))
    (global.set $ucur (global.get $UNDO))
    (global.set $txn (i32.const 0))
    (global.set $ulost (i32.const 1))
    (i32.const 0))

  ;; Open a transaction. Anything that was undone can no longer be redone.
  (func $begin
    (global.set $coalesce (i32.const -1))
    (global.set $utop (global.get $ucur))
    (global.set $txn (global.get $utop))
    (global.set $ulost (i32.const 0))
    (if (call $ureserve (i32.const 20))
      (then
        (call $uw (i32.const 5))
        (call $uw (i32.const 1))
        (call $uw (global.get $anchor))
        (call $uw (global.get $focus))
        (call $uw (i32.const 5)))))

  ;; Re-open the last transaction so that typing extends it.
  (func $reopen
    (global.set $utop (i32.sub (global.get $utop) (i32.const 20)))
    (global.set $txn (global.get $last_begin))
    (global.set $ulost (i32.const 0)))

  (func $commit
    (if (global.get $ulost)
      (then
        (global.set $ulost (i32.const 0))
        (global.set $utop (global.get $UNDO))
        (global.set $ucur (global.get $UNDO))
        (global.set $txn (i32.const 0))
        (return)))
    (if (i32.eqz (global.get $txn)) (then (return)))
    ;; a transaction that changed nothing leaves no trace
    (if (i32.eq (global.get $utop) (i32.add (global.get $txn) (i32.const 20)))
      (then
        (global.set $utop (global.get $txn))
        (global.set $ucur (global.get $utop))
        (global.set $txn (i32.const 0))
        (return)))
    (if (call $ureserve (i32.const 20))
      (then
        (call $uw (i32.const 5))
        (call $uw (i32.const 2))
        (call $uw (global.get $anchor))
        (call $uw (global.get $focus))
        (call $uw (i32.const 5))
        (global.set $last_begin (global.get $txn))
        (global.set $ucur (global.get $utop))
        (global.set $txn (i32.const 0)))
      (else (global.set $ulost (i32.const 0)))))

  ;; Append an INSERT or DELETE record holding $n cells copied from $src.
  (func $log_cells (param $kind i32) (param $p i32) (param $n i32) (param $src i32)
    (if (call $ureserve (i32.shl (i32.add (local.get $n) (i32.const 5)) (i32.const 2)))
      (then
        (call $uw (i32.add (local.get $n) (i32.const 5)))
        (call $uw (local.get $kind))
        (call $uw (local.get $p))
        (call $uw (local.get $n))
        (memory.copy (global.get $utop) (local.get $src) (i32.shl (local.get $n) (i32.const 2)))
        (global.set $utop (i32.add (global.get $utop) (i32.shl (local.get $n) (i32.const 2))))
        (call $uw (i32.add (local.get $n) (i32.const 5))))))

  (func $can_undo (export "can_undo") (result i32)
    (i32.gt_u (global.get $ucur) (global.get $UNDO)))

  (func $can_redo (export "can_redo") (result i32)
    (i32.lt_u (global.get $ucur) (global.get $utop)))

  (func $undo (export "undo") (result i32)
    (local $a i32) (local $k i32) (local $p i32) (local $n i32)
    (if (i32.le_u (global.get $ucur) (global.get $UNDO)) (then (return (i32.const 0))))
    (global.set $coalesce (i32.const -1))
    (global.set $stored (i32.const -1))
    ;; step back over END, then apply inverses until BEGIN
    (local.set $a (i32.sub (global.get $ucur)
                           (i32.shl (i32.load (i32.sub (global.get $ucur) (i32.const 4))) (i32.const 2))))
    (block $done
      (loop $back
        (local.set $a (i32.sub (local.get $a)
                               (i32.shl (i32.load (i32.sub (local.get $a) (i32.const 4))) (i32.const 2))))
        (local.set $k (i32.load offset=4 (local.get $a)))
        (local.set $p (i32.load offset=8 (local.get $a)))
        (local.set $n (i32.load offset=12 (local.get $a)))
        (if (i32.eq (local.get $k) (i32.const 1))
          (then
            (global.set $anchor (local.get $p))
            (global.set $focus (local.get $n))
            (br $done)))
        (if (i32.eq (local.get $k) (i32.const 3))
          (then (call $raw_delete (local.get $p) (local.get $n))))
        (if (i32.eq (local.get $k) (i32.const 4))
          (then (call $raw_insert (local.get $p) (i32.add (local.get $a) (i32.const 16)) (local.get $n))))
        (if (i32.eq (local.get $k) (i32.const 5))
          (then (call $restore (local.get $p) (i32.add (local.get $a) (i32.const 16)) (local.get $n))))
        (br $back)))
    (global.set $ucur (local.get $a))
    (i32.const 1))

  (func $redo (export "redo") (result i32)
    (local $a i32) (local $k i32) (local $p i32) (local $n i32)
    (if (i32.ge_u (global.get $ucur) (global.get $utop)) (then (return (i32.const 0))))
    (global.set $coalesce (i32.const -1))
    (global.set $stored (i32.const -1))
    ;; step over BEGIN, then re-apply until END
    (local.set $a (i32.add (global.get $ucur) (i32.shl (i32.load (global.get $ucur)) (i32.const 2))))
    (block $done
      (loop $fwd
        (local.set $k (i32.load offset=4 (local.get $a)))
        (local.set $p (i32.load offset=8 (local.get $a)))
        (local.set $n (i32.load offset=12 (local.get $a)))
        (if (i32.eq (local.get $k) (i32.const 2))
          (then
            (global.set $anchor (local.get $p))
            (global.set $focus (local.get $n))
            (local.set $a (i32.add (local.get $a) (i32.const 20)))
            (br $done)))
        (if (i32.eq (local.get $k) (i32.const 3))
          (then (call $raw_insert (local.get $p) (i32.add (local.get $a) (i32.const 16)) (local.get $n))))
        (if (i32.eq (local.get $k) (i32.const 4))
          (then (call $raw_delete (local.get $p) (local.get $n))))
        (if (i32.eq (local.get $k) (i32.const 5))
          (then
            (call $restore (local.get $p)
              (i32.add (local.get $a) (i32.add (i32.const 16) (i32.shl (local.get $n) (i32.const 2))))
              (local.get $n))))
        (local.set $a (i32.add (local.get $a) (i32.shl (i32.load (local.get $a)) (i32.const 2))))
        (br $fwd)))
    (global.set $ucur (local.get $a))
    (i32.const 1))

  ;; =====================================================================
  ;; Primitive edits. Everything else is built from these three; they log
  ;; themselves when a transaction is open.
  ;; =====================================================================

  (func $raw_insert (param $p i32) (param $src i32) (param $n i32)
    (if (i32.eqz (local.get $n)) (then (return)))
    (if (i32.eqz (call $room (local.get $n))) (then unreachable))
    (call $move_gap (local.get $p))
    (memory.copy
      (i32.add (global.get $DOC) (i32.shl (global.get $gs) (i32.const 2)))
      (local.get $src)
      (i32.shl (local.get $n) (i32.const 2)))
    (global.set $gs (i32.add (global.get $gs) (local.get $n)))
    (if (global.get $txn)
      (then
        (call $log_cells (i32.const 3) (local.get $p) (local.get $n)
          (i32.add (global.get $DOC) (i32.shl (local.get $p) (i32.const 2)))))))

  (func $raw_delete (param $p i32) (param $n i32)
    (if (i32.eqz (local.get $n)) (then (return)))
    (call $move_gap (local.get $p))
    (if (global.get $txn)
      (then
        (call $log_cells (i32.const 4) (local.get $p) (local.get $n)
          (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2))))))
    (global.set $ge (i32.add (global.get $ge) (local.get $n))))

  ;; Rewriting cells in place is done in two halves: $set_begin makes
  ;; [p, p+n) contiguous (just after the gap), logs the old cells and returns
  ;; their address; the caller edits them; $set_end logs the new cells.
  (func $set_begin (param $p i32) (param $n i32) (result i32)
    (local $a i32) (local $words i32)
    (call $move_gap (local.get $p))
    (local.set $a (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2))))
    (global.set $slog (i32.const 0))
    (if (global.get $txn)
      (then
        (local.set $words (i32.add (i32.shl (local.get $n) (i32.const 1)) (i32.const 5)))
        (if (call $ureserve (i32.shl (local.get $words) (i32.const 2)))
          (then
            (global.set $slog (i32.const 1))
            (call $uw (local.get $words))
            (call $uw (i32.const 5))
            (call $uw (local.get $p))
            (call $uw (local.get $n))
            (memory.copy (global.get $utop) (local.get $a) (i32.shl (local.get $n) (i32.const 2)))
            (global.set $utop (i32.add (global.get $utop) (i32.shl (local.get $n) (i32.const 2))))))))
    (local.get $a))

  (func $set_end (param $a i32) (param $n i32)
    (if (global.get $slog)
      (then
        (memory.copy (global.get $utop) (local.get $a) (i32.shl (local.get $n) (i32.const 2)))
        (global.set $utop (i32.add (global.get $utop) (i32.shl (local.get $n) (i32.const 2))))
        (call $uw (i32.add (i32.shl (local.get $n) (i32.const 1)) (i32.const 5)))
        (global.set $slog (i32.const 0)))))

  (func $set_cell (param $p i32) (param $v i32)
    (local $a i32)
    (if (i32.eq (call $get (local.get $p)) (local.get $v)) (then (return)))
    (local.set $a (call $set_begin (local.get $p) (i32.const 1)))
    (i32.store (local.get $a) (local.get $v))
    (call $set_end (local.get $a) (i32.const 1)))

  ;; Overwrite [p, p+n) with cells from $src (undo/redo of SET).
  (func $restore (param $p i32) (param $src i32) (param $n i32)
    (call $move_gap (local.get $p))
    (memory.copy
      (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2)))
      (local.get $src)
      (i32.shl (local.get $n) (i32.const 2))))

  ;; Delete [s, e). When blocks merge, the merged block keeps the format of
  ;; the first one.
  (func $del_range (param $s i32) (param $e i32)
    (local $q i32) (local $c i32)
    (if (i32.ge_u (local.get $s) (local.get $e)) (then (return)))
    (local.set $q (call $nl_after (local.get $s)))
    (if (i32.lt_u (local.get $q) (local.get $e))
      (then
        (local.set $c (call $get (local.get $q)))
        (call $raw_delete (local.get $s) (i32.sub (local.get $e) (local.get $s)))
        (call $set_cell (call $nl_after (local.get $s)) (local.get $c)))
      (else
        (call $raw_delete (local.get $s) (i32.sub (local.get $e) (local.get $s))))))

  ;; =====================================================================
  ;; Commands
  ;; =====================================================================

  ;; Insert $n UTF-16 units from OUT, replacing the selection. "\n" splits
  ;; the block, "\r" is dropped. Consecutive typing is one undo step per word.
  (func $insert_text (export "insert_text") (param $n i32) (result i32)
    (local $s i32) (local $e i32) (local $m i32) (local $dst i32) (local $k i32)
    (local $i i32) (local $c i32) (local $nl i32) (local $typing i32)
    (if (i32.eqz (local.get $n)) (then (return (i32.const 0))))
    (if (i32.eqz (call $room (local.get $n))) (then (return (i32.const 0))))
    (local.set $s (call $smin))
    (local.set $e (call $smax))
    (local.set $c (i32.load16_u (global.get $OUT)))
    (local.set $typing
      (i32.and
        (i32.and (i32.eq (local.get $n) (i32.const 1)) (i32.eq (local.get $s) (local.get $e)))
        (i32.and (i32.ne (local.get $c) (i32.const 10)) (i32.ne (local.get $c) (i32.const 13)))))
    (if (i32.and
          (local.get $typing)
          (i32.and
            (i32.eq (global.get $coalesce) (local.get $s))
            (i32.and (i32.eq (global.get $ucur) (global.get $utop))
                     (i32.gt_u (global.get $ucur) (global.get $UNDO)))))
      (then (call $reopen))
      (else (call $begin)))
    (if (i32.eq (local.get $s) (local.get $e))
      (then (local.set $m (call $marks_at (local.get $s))))
      (else
        ;; replacing a selection: take the format of its first character
        (local.set $m (global.get $stored))
        (if (i32.eq (local.get $m) (i32.const -1))
          (then
            (local.set $c (call $get (local.get $s)))
            (local.set $m
              (if (result i32) (call $is_nl (local.get $c))
                (then (call $marks_at (local.get $s)))
                (else (i32.shr_u (local.get $c) (i32.const 16)))))))
        (call $del_range (local.get $s) (local.get $e))))
    ;; a split keeps the block's format on both halves
    (local.set $nl (i32.or (i32.and (call $get (call $nl_after (local.get $s))) (i32.const 0xFFFF0000))
                           (i32.const 10)))
    ;; build the cells after the text in scratch
    (local.set $dst (i32.add (global.get $OUT)
                             (i32.and (i32.add (i32.shl (local.get $n) (i32.const 1)) (i32.const 3)) (i32.const -4))))
    (call $ensure (i32.add (local.get $dst) (i32.shl (local.get $n) (i32.const 2))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $n)))
        (local.set $c (i32.load16_u (i32.add (global.get $OUT) (i32.shl (local.get $i) (i32.const 1)))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br_if $l (i32.eq (local.get $c) (i32.const 13)))
        (i32.store (i32.add (local.get $dst) (i32.shl (local.get $k) (i32.const 2)))
          (if (result i32) (i32.eq (local.get $c) (i32.const 10))
            (then (local.get $nl))
            (else (i32.or (local.get $c) (i32.shl (local.get $m) (i32.const 16))))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l)))
    (call $raw_insert (local.get $s) (local.get $dst) (local.get $k))
    (call $collapse (i32.add (local.get $s) (local.get $k)))
    (global.set $stored (i32.const -1))
    (call $commit)
    (if (local.get $typing)
      (then
        (if (i32.eq (i32.load16_u (global.get $OUT)) (i32.const 32))
          (then (call $input_rules (local.get $s)))
          (else (global.set $coalesce (i32.add (local.get $s) (i32.const 1)))))))
    (i32.const 1))

  ;; Markdown shortcuts: a space typed after "#", "##", "###", "-", "*", "1.",
  ;; ">", "[]", "[ ]", "[x]" or "```" at the start of a paragraph turns it
  ;; into that kind of block. This is its own undo step, so undo brings the
  ;; typed characters back.
  (func $input_rules (param $sp i32)
    (local $bs i32) (local $n i32) (local $c0 i32) (local $c1 i32) (local $c2 i32) (local $t i32)
    (local.set $bs (call $block_start (local.get $sp)))
    (local.set $n (i32.sub (local.get $sp) (local.get $bs)))
    (if (i32.or (i32.eqz (local.get $n)) (i32.gt_u (local.get $n) (i32.const 3))) (then (return)))
    (if (i32.shr_u (call $get (call $nl_after (local.get $sp))) (i32.const 16)) (then (return)))
    (local.set $c0 (i32.and (call $get (local.get $bs)) (i32.const 0xFFFF)))
    (if (i32.ge_u (local.get $n) (i32.const 2))
      (then (local.set $c1 (i32.and (call $get (i32.add (local.get $bs) (i32.const 1))) (i32.const 0xFFFF)))))
    (if (i32.eq (local.get $n) (i32.const 3))
      (then (local.set $c2 (i32.and (call $get (i32.add (local.get $bs) (i32.const 2))) (i32.const 0xFFFF)))))
    (local.set $t (i32.const -1))
    (if (i32.eq (local.get $n) (i32.const 1))
      (then
        (if (i32.eq (local.get $c0) (i32.const 35)) (then (local.set $t (i32.const 1))))
        (if (i32.or (i32.eq (local.get $c0) (i32.const 45)) (i32.eq (local.get $c0) (i32.const 42)))
          (then (local.set $t (i32.const 5))))
        (if (i32.eq (local.get $c0) (i32.const 62)) (then (local.set $t (i32.const 4))))))
    (if (i32.eq (local.get $n) (i32.const 2))
      (then
        (if (i32.and (i32.eq (local.get $c0) (i32.const 35)) (i32.eq (local.get $c1) (i32.const 35)))
          (then (local.set $t (i32.const 2))))
        (if (i32.and (i32.lt_u (i32.sub (local.get $c0) (i32.const 48)) (i32.const 10))
                     (i32.eq (local.get $c1) (i32.const 46)))
          (then (local.set $t (i32.const 6))))
        (if (i32.and (i32.eq (local.get $c0) (i32.const 91)) (i32.eq (local.get $c1) (i32.const 93)))
          (then (local.set $t (i32.const 7))))))
    (if (i32.eq (local.get $n) (i32.const 3))
      (then
        (if (i32.and (i32.eq (local.get $c0) (i32.const 35))
                     (i32.and (i32.eq (local.get $c1) (i32.const 35)) (i32.eq (local.get $c2) (i32.const 35))))
          (then (local.set $t (i32.const 3))))
        (if (i32.and (i32.eq (local.get $c0) (i32.const 96))
                     (i32.and (i32.eq (local.get $c1) (i32.const 96)) (i32.eq (local.get $c2) (i32.const 96))))
          (then (local.set $t (i32.const 8))))
        (if (i32.and (i32.eq (local.get $c0) (i32.const 91)) (i32.eq (local.get $c2) (i32.const 93)))
          (then
            (if (i32.eq (local.get $c1) (i32.const 32)) (then (local.set $t (i32.const 7))))
            ;; "[x]" is a checked todo: type 7 | checked 16
            (if (i32.eq (i32.or (local.get $c1) (i32.const 32)) (i32.const 120)) (then (local.set $t (i32.const 23))))))))
    (if (i32.lt_s (local.get $t) (i32.const 0)) (then (return)))
    (call $begin)
    (call $del_range (local.get $bs) (i32.add (local.get $sp) (i32.const 1)))
    (call $set_cell (call $nl_after (local.get $bs)) (i32.or (i32.shl (local.get $t) (i32.const 16)) (i32.const 10)))
    (call $collapse (local.get $bs))
    (call $commit))

  ;; Enter.
  (func $insert_paragraph (export "insert_paragraph") (result i32)
    (local $p i32) (local $q i32) (local $a i32) (local $t i32)
    (if (i32.eqz (call $room (i32.const 1))) (then (return (i32.const 0))))
    (call $begin)
    (local.set $p (call $smin))
    (call $del_range (local.get $p) (call $smax))
    (local.set $q (call $nl_after (local.get $p)))
    (local.set $a (call $get (local.get $q)))
    (local.set $t (call $type_of (local.get $a)))
    ;; Enter in an empty list item, quote, heading or code line leaves it
    (if (i32.and (i32.eq (call $block_start (local.get $p)) (local.get $q)) (i32.ne (local.get $t) (i32.const 0)))
      (then
        (call $set_cell (local.get $q) (i32.const 10))
        (call $collapse (local.get $p))
        (call $commit)
        (return (i32.const 1))))
    ;; the new terminator ends the first half with the block's format
    (i32.store (global.get $TMP) (local.get $a))
    (call $raw_insert (local.get $p) (global.get $TMP) (i32.const 1))
    ;; a heading split at its end continues as a paragraph
    (if (i32.and (i32.eq (local.get $p) (local.get $q))
                 (i32.and (i32.ge_u (local.get $t) (i32.const 1)) (i32.le_u (local.get $t) (i32.const 3))))
      (then (call $set_cell (i32.add (local.get $q) (i32.const 1)) (i32.const 10))))
    ;; a new todo starts unchecked
    (if (i32.eq (local.get $t) (i32.const 7))
      (then (call $set_cell (i32.add (local.get $q) (i32.const 1)) (i32.const 0x7000A))))
    (call $collapse (i32.add (local.get $p) (i32.const 1)))
    (call $commit)
    (i32.const 1))

  ;; Backspace.
  (func $delete_backward (export "delete_backward") (result i32)
    (local $p i32) (local $bs i32) (local $q i32) (local $a i32) (local $c i32) (local $n i32) (local $prev_empty i32)
    (call $begin)
    (if (i32.ne (global.get $anchor) (global.get $focus))
      (then
        (local.set $p (call $smin))
        (call $del_range (local.get $p) (call $smax))
        (call $collapse (local.get $p))
        (call $commit)
        (return (i32.const 1))))
    (local.set $p (global.get $focus))
    (local.set $bs (call $block_start (local.get $p)))
    (if (i32.eq (local.get $p) (local.get $bs))
      (then
        (local.set $q (call $nl_after (local.get $p)))
        (local.set $a (call $get (local.get $q)))
        (if (i32.shr_u (local.get $a) (i32.const 16))
          (then
            ;; at the start of a formatted block: turn it into a paragraph
            (call $set_cell (local.get $q) (i32.const 10)))
          (else
            (if (local.get $p)
              (then
                ;; join with the previous block, which keeps its format unless it was empty
                (local.set $prev_empty (i32.const 1))
                (if (i32.ge_u (local.get $p) (i32.const 2))
                  (then (local.set $prev_empty (call $is_nl (call $get (i32.sub (local.get $p) (i32.const 2)))))))
                (local.set $c (call $get (i32.sub (local.get $p) (i32.const 1))))
                (call $raw_delete (i32.sub (local.get $p) (i32.const 1)) (i32.const 1))
                (if (i32.eqz (local.get $prev_empty))
                  (then (call $set_cell (i32.sub (local.get $q) (i32.const 1)) (local.get $c))))
                (call $collapse (i32.sub (local.get $p) (i32.const 1))))))))
      (else
        ;; delete one character, or a whole surrogate pair
        (local.set $n (i32.const 1))
        (if (i32.and
              (i32.eq (i32.and (call $get (i32.sub (local.get $p) (i32.const 1))) (i32.const 0xFC00)) (i32.const 0xDC00))
              (i32.ge_u (i32.sub (local.get $p) (local.get $bs)) (i32.const 2)))
          (then
            (if (i32.eq (i32.and (call $get (i32.sub (local.get $p) (i32.const 2))) (i32.const 0xFC00)) (i32.const 0xD800))
              (then (local.set $n (i32.const 2))))))
        (call $raw_delete (i32.sub (local.get $p) (local.get $n)) (local.get $n))
        (call $collapse (i32.sub (local.get $p) (local.get $n)))))
    (call $commit)
    (i32.const 1))

  ;; Delete (forward).
  (func $delete_forward (export "delete_forward") (result i32)
    (local $p i32) (local $c i32) (local $n i32) (local $empty i32)
    (call $begin)
    (if (i32.ne (global.get $anchor) (global.get $focus))
      (then
        (local.set $p (call $smin))
        (call $del_range (local.get $p) (call $smax))
        (call $collapse (local.get $p))
        (call $commit)
        (return (i32.const 1))))
    (local.set $p (global.get $focus))
    (local.set $c (call $get (local.get $p)))
    (if (call $is_nl (local.get $c))
      (then
        (if (i32.lt_u (i32.add (local.get $p) (i32.const 1)) (call $len))
          (then
            ;; pull the next block up; an empty block gives way to the next one's format
            (local.set $empty (i32.eq (call $block_start (local.get $p)) (local.get $p)))
            (call $raw_delete (local.get $p) (i32.const 1))
            (if (i32.eqz (local.get $empty))
              (then (call $set_cell (call $nl_after (local.get $p)) (local.get $c)))))))
      (else
        (local.set $n (i32.const 1))
        (if (i32.eq (i32.and (local.get $c) (i32.const 0xFC00)) (i32.const 0xD800))
          (then
            (if (i32.eq (i32.and (call $get (i32.add (local.get $p) (i32.const 1))) (i32.const 0xFC00)) (i32.const 0xDC00))
              (then (local.set $n (i32.const 2))))))
        (call $raw_delete (local.get $p) (local.get $n))))
    (call $collapse (local.get $p))
    (call $commit)
    (i32.const 1))

  ;; Option/Ctrl+Backspace: whitespace, then a run of one character class.
  (func $delete_word_backward (export "delete_word_backward") (result i32)
    (local $p i32) (local $bs i32) (local $q i32) (local $k i32)
    (if (i32.ne (global.get $anchor) (global.get $focus)) (then (return (call $delete_backward))))
    (local.set $p (global.get $focus))
    (local.set $bs (call $block_start (local.get $p)))
    (if (i32.eq (local.get $p) (local.get $bs)) (then (return (call $delete_backward))))
    (local.set $q (local.get $p))
    (block $d
      (loop $l
        (br_if $d (i32.le_u (local.get $q) (local.get $bs)))
        (br_if $d (call $char_class (call $get (i32.sub (local.get $q) (i32.const 1)))))
        (local.set $q (i32.sub (local.get $q) (i32.const 1)))
        (br $l)))
    (if (i32.gt_u (local.get $q) (local.get $bs))
      (then
        (local.set $k (call $char_class (call $get (i32.sub (local.get $q) (i32.const 1)))))
        (block $d2
          (loop $l2
            (br_if $d2 (i32.le_u (local.get $q) (local.get $bs)))
            (br_if $d2 (i32.ne (call $char_class (call $get (i32.sub (local.get $q) (i32.const 1)))) (local.get $k)))
            (local.set $q (i32.sub (local.get $q) (i32.const 1)))
            (br $l2)))))
    (call $begin)
    (call $del_range (local.get $q) (local.get $p))
    (call $collapse (local.get $q))
    (call $commit)
    (i32.const 1))

  (func $delete_word_forward (export "delete_word_forward") (result i32)
    (local $p i32) (local $e i32) (local $q i32) (local $k i32)
    (if (i32.ne (global.get $anchor) (global.get $focus)) (then (return (call $delete_forward))))
    (local.set $p (global.get $focus))
    (local.set $e (call $nl_after (local.get $p)))
    (if (i32.eq (local.get $p) (local.get $e)) (then (return (call $delete_forward))))
    (local.set $q (local.get $p))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $q) (local.get $e)))
        (br_if $d (call $char_class (call $get (local.get $q))))
        (local.set $q (i32.add (local.get $q) (i32.const 1)))
        (br $l)))
    (if (i32.lt_u (local.get $q) (local.get $e))
      (then
        (local.set $k (call $char_class (call $get (local.get $q))))
        (block $d2
          (loop $l2
            (br_if $d2 (i32.ge_u (local.get $q) (local.get $e)))
            (br_if $d2 (i32.ne (call $char_class (call $get (local.get $q))) (local.get $k)))
            (local.set $q (i32.add (local.get $q) (i32.const 1)))
            (br $l2)))))
    (call $begin)
    (call $del_range (local.get $p) (local.get $q))
    (call $collapse (local.get $p))
    (call $commit)
    (i32.const 1))

  ;; Toggle marks $mask on the selection. With a caret, the change applies to
  ;; the next typed text instead.
  (func $toggle_mark (export "toggle_mark") (param $mask i32) (result i32)
    (local $s i32) (local $e i32) (local $p i32) (local $all i32) (local $a i32) (local $end i32)
    (local $c i32) (local $bits i32)
    (local.set $s (call $smin))
    (local.set $e (call $smax))
    (if (i32.eq (local.get $s) (local.get $e))
      (then
        (global.set $stored (i32.xor (call $marks_at (local.get $s)) (local.get $mask)))
        (global.set $coalesce (i32.const -1))
        (return (i32.const 1))))
    (local.set $bits (i32.shl (local.get $mask) (i32.const 16)))
    ;; remove the mark if every selected character has it, else add it
    (local.set $all (i32.const 1))
    (local.set $p (local.get $s))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $e)))
        (local.set $c (call $get (local.get $p)))
        (if (i32.eqz (call $is_nl (local.get $c)))
          (then
            (if (i32.ne (i32.and (local.get $c) (local.get $bits)) (local.get $bits))
              (then (local.set $all (i32.const 0)) (br $d)))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (call $begin)
    (local.set $a (call $set_begin (local.get $s) (i32.sub (local.get $e) (local.get $s))))
    (local.set $end (i32.add (local.get $a) (i32.shl (i32.sub (local.get $e) (local.get $s)) (i32.const 2))))
    (local.set $p (local.get $a))
    (block $d2
      (loop $l2
        (br_if $d2 (i32.ge_u (local.get $p) (local.get $end)))
        (local.set $c (i32.load (local.get $p)))
        (if (i32.eqz (call $is_nl (local.get $c)))
          (then
            (i32.store (local.get $p)
              (if (result i32) (local.get $all)
                (then (i32.and (local.get $c) (i32.xor (local.get $bits) (i32.const -1))))
                (else (i32.or (local.get $c) (local.get $bits)))))))
        (local.set $p (i32.add (local.get $p) (i32.const 4)))
        (br $l2)))
    (call $set_end (local.get $a) (i32.sub (local.get $e) (local.get $s)))
    (call $commit)
    (i32.const 1))

  ;; Set the type of every block touched by the selection. If they all
  ;; already have that type, they go back to paragraphs.
  (func $set_block (export "set_block") (param $t i32) (result i32)
    (local $q i32) (local $e i32) (local $all i32) (local $v i32) (local $c i32)
    (if (i32.gt_u (local.get $t) (i32.const 8)) (then (return (i32.const 0))))
    (local.set $e (call $nl_after (call $smax)))
    (local.set $all (i32.const 1))
    (local.set $q (call $nl_after (call $smin)))
    (block $d
      (loop $l
        (if (i32.ne (call $type_of (call $get (local.get $q))) (local.get $t))
          (then (local.set $all (i32.const 0)) (br $d)))
        (br_if $d (i32.ge_u (local.get $q) (local.get $e)))
        (local.set $q (call $nl_after (i32.add (local.get $q) (i32.const 1))))
        (br $l)))
    (local.set $v (i32.or (i32.shl (select (i32.const 0) (local.get $t) (local.get $all)) (i32.const 16)) (i32.const 10)))
    (call $begin)
    (local.set $q (call $nl_after (call $smin)))
    (block $d2
      (loop $l2
        (local.set $c (call $get (local.get $q)))
        ;; blocks already of this type keep their checked state
        (if (i32.or (local.get $all) (i32.ne (call $type_of (local.get $c)) (local.get $t)))
          (then (call $set_cell (local.get $q) (local.get $v))))
        (br_if $d2 (i32.ge_u (local.get $q) (local.get $e)))
        (local.set $q (call $nl_after (i32.add (local.get $q) (i32.const 1))))
        (br $l2)))
    (call $commit)
    (i32.const 1))

  ;; Check or uncheck the todo holding position $p.
  (func $toggle_check (export "toggle_check") (param $p i32) (result i32)
    (local $q i32) (local $c i32)
    (local.set $q (call $nl_after (call $clamp (local.get $p))))
    (local.set $c (call $get (local.get $q)))
    (if (i32.ne (call $type_of (local.get $c)) (i32.const 7)) (then (return (i32.const 0))))
    (call $begin)
    (call $set_cell (local.get $q) (i32.xor (local.get $c) (i32.const 0x100000)))
    (call $commit)
    (i32.const 1))

  ;; =====================================================================
  ;; Links
  ;; =====================================================================

  (func $u (param $a i32) (result i32)
    (i32.load16_u (local.get $a)))

  ;; Is the $n-unit string at $p equal to string $k, ignoring ASCII case?
  (func $match_ci (param $p i32) (param $n i32) (param $k i32) (result i32)
    (local $a i32)
    (local.set $a (i32.add (global.get $STRTAB) (i32.shl (local.get $k) (i32.const 2))))
    (if (i32.ne (i32.load16_u offset=2 (local.get $a)) (local.get $n)) (then (return (i32.const 0))))
    (local.set $a (i32.load16_u (local.get $a)))
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $n)))
        (if (i32.ne (i32.or (call $u (local.get $p)) (i32.const 32)) (i32.load8_u (local.get $a)))
          (then (return (i32.const 0))))
        (local.set $p (i32.add (local.get $p) (i32.const 2)))
        (local.set $a (i32.add (local.get $a) (i32.const 1)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $l)))
    (i32.const 1))

  ;; Only http, https, mailto, tel and scheme-less (relative) URLs are allowed.
  (func $url_ok (param $p i32) (param $n i32) (result i32)
    (local $i i32) (local $c i32) (local $k i32)
    (if (i32.eqz (local.get $n)) (then (return (i32.const 0))))
    (block $scheme
      (loop $l
        (if (i32.ge_u (local.get $i) (local.get $n)) (then (return (i32.const 1))))
        (local.set $c (call $u (i32.add (local.get $p) (i32.shl (local.get $i) (i32.const 1)))))
        (br_if $scheme (i32.eq (local.get $c) (i32.const 58)))
        (if (i32.or (i32.eq (local.get $c) (i32.const 47))
                    (i32.or (i32.eq (local.get $c) (i32.const 63)) (i32.eq (local.get $c) (i32.const 35))))
          (then (return (i32.const 1))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (local.set $k (i32.const 64))
    (loop $try
      (if (call $match_ci (local.get $p) (local.get $i) (local.get $k)) (then (return (i32.const 1))))
      (local.set $k (i32.add (local.get $k) (i32.const 1)))
      (br_if $try (i32.lt_u (local.get $k) (i32.const 68))))
    (i32.const 0))

  (func $memeq16 (param $a i32) (param $b i32) (param $n i32) (result i32)
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $n)))
        (if (i32.ne (call $u (local.get $a)) (call $u (local.get $b))) (then (return (i32.const 0))))
        (local.set $a (i32.add (local.get $a) (i32.const 2)))
        (local.set $b (i32.add (local.get $b) (i32.const 2)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $l)))
    (i32.const 1))

  ;; Id for the URL at $src ($n units), adding it to the table if new.
  ;; The table is append-only, so undo never has to track it. 0 when full.
  (func $intern (param $src i32) (param $n i32) (result i32)
    (local $id i32) (local $e i32)
    (local.set $id (i32.const 1))
    (block $miss
      (loop $l
        (br_if $miss (i32.ge_u (local.get $id) (global.get $nlinks)))
        (local.set $e (i32.add (global.get $LINKS) (i32.shl (local.get $id) (i32.const 3))))
        (if (i32.eq (i32.load offset=4 (local.get $e)) (local.get $n))
          (then
            (if (call $memeq16 (i32.load (local.get $e)) (local.get $src) (local.get $n))
              (then (return (local.get $id))))))
        (local.set $id (i32.add (local.get $id) (i32.const 1)))
        (br $l)))
    (if (i32.or
          (i32.ge_u (global.get $nlinks) (global.get $LINK_MAX))
          (i32.gt_u (i32.add (global.get $atop) (i32.shl (local.get $n) (i32.const 1))) (global.get $ARENA_END)))
      (then (return (i32.const 0))))
    (local.set $id (global.get $nlinks))
    (local.set $e (i32.add (global.get $LINKS) (i32.shl (local.get $id) (i32.const 3))))
    (i32.store (local.get $e) (global.get $atop))
    (i32.store offset=4 (local.get $e) (local.get $n))
    (memory.copy (global.get $atop) (local.get $src) (i32.shl (local.get $n) (i32.const 1)))
    (global.set $atop (i32.add (global.get $atop) (i32.shl (local.get $n) (i32.const 1))))
    (global.set $nlinks (i32.add (local.get $id) (i32.const 1)))
    (local.get $id))

  (func $link_id (param $src i32) (param $n i32) (result i32)
    (if (call $url_ok (local.get $src) (local.get $n))
      (then (return (call $intern (local.get $src) (local.get $n)))))
    (i32.const 0))

  ;; Intern the URL of $n units at OUT; 0 if unsafe or the table is full.
  (func (export "intern_link") (param $n i32) (result i32)
    (call $link_id (global.get $OUT) (local.get $n)))

  (func $link_ptr (export "link_ptr") (param $id i32) (result i32)
    (i32.load (i32.add (global.get $LINKS) (i32.shl (local.get $id) (i32.const 3)))))

  (func $link_len (export "link_len") (param $id i32) (result i32)
    (i32.load offset=4 (i32.add (global.get $LINKS) (i32.shl (local.get $id) (i32.const 3)))))

  ;; Link id at position $p (the character after it, else before it).
  (func $link_at (export "link_at") (param $p i32) (result i32)
    (local $c i32)
    (local.set $p (call $clamp (local.get $p)))
    (local.set $c (call $get (local.get $p)))
    (if (i32.eqz (call $is_nl (local.get $c)))
      (then
        (if (i32.shr_u (local.get $c) (i32.const 21))
          (then (return (i32.shr_u (local.get $c) (i32.const 21)))))))
    (if (local.get $p)
      (then
        (local.set $c (call $get (i32.sub (local.get $p) (i32.const 1))))
        (if (i32.eqz (call $is_nl (local.get $c)))
          (then (return (i32.shr_u (local.get $c) (i32.const 21)))))))
    (i32.const 0))

  ;; Link the selection to the URL of $n units at OUT, or unlink it if $n is 0.
  ;; With a caret inside a link, the whole link is changed; with a caret
  ;; elsewhere, the URL itself is inserted as linked text.
  (func $set_link (export "set_link") (param $n i32) (result i32)
    (local $id i32) (local $s i32) (local $e i32) (local $cur i32) (local $a i32)
    (local $i i32) (local $end i32) (local $c i32) (local $m i32)
    (if (local.get $n)
      (then
        (local.set $id (call $link_id (global.get $OUT) (local.get $n)))
        (if (i32.eqz (local.get $id)) (then (return (i32.const 0))))))
    (local.set $s (call $smin))
    (local.set $e (call $smax))
    (if (i32.eq (local.get $s) (local.get $e))
      (then
        (local.set $cur (call $link_at (local.get $s)))
        (if (local.get $cur)
          (then
            ;; grow the range to the link around the caret
            (block $d
              (loop $l
                (br_if $d (i32.eqz (local.get $s)))
                (local.set $c (call $get (i32.sub (local.get $s) (i32.const 1))))
                (br_if $d (call $is_nl (local.get $c)))
                (br_if $d (i32.ne (i32.shr_u (local.get $c) (i32.const 21)) (local.get $cur)))
                (local.set $s (i32.sub (local.get $s) (i32.const 1)))
                (br $l)))
            (block $d2
              (loop $l2
                (local.set $c (call $get (local.get $e)))
                (br_if $d2 (call $is_nl (local.get $c)))
                (br_if $d2 (i32.ne (i32.shr_u (local.get $c) (i32.const 21)) (local.get $cur)))
                (local.set $e (i32.add (local.get $e) (i32.const 1)))
                (br $l2))))
          (else
            (if (i32.eqz (local.get $n)) (then (return (i32.const 0))))
            (if (i32.eqz (call $room (local.get $n))) (then (return (i32.const 0))))
            (call $begin)
            (local.set $m (i32.or (i32.and (call $marks_at (local.get $s)) (i32.const 31))
                                  (i32.shl (local.get $id) (i32.const 5))))
            (local.set $a (i32.add (global.get $OUT)
                                   (i32.and (i32.add (i32.shl (local.get $n) (i32.const 1)) (i32.const 3)) (i32.const -4))))
            (call $ensure (i32.add (local.get $a) (i32.shl (local.get $n) (i32.const 2))))
            (block $d3
              (loop $l3
                (br_if $d3 (i32.ge_u (local.get $i) (local.get $n)))
                (i32.store (i32.add (local.get $a) (i32.shl (local.get $i) (i32.const 2)))
                  (i32.or (call $u (i32.add (global.get $OUT) (i32.shl (local.get $i) (i32.const 1))))
                          (i32.shl (local.get $m) (i32.const 16))))
                (local.set $i (i32.add (local.get $i) (i32.const 1)))
                (br $l3)))
            (call $raw_insert (local.get $s) (local.get $a) (local.get $n))
            (call $collapse (i32.add (local.get $s) (local.get $n)))
            (global.set $stored (i32.const -1))
            (call $commit)
            (return (i32.const 1))))))
    (call $begin)
    (local.set $a (call $set_begin (local.get $s) (i32.sub (local.get $e) (local.get $s))))
    (local.set $end (i32.add (local.get $a) (i32.shl (i32.sub (local.get $e) (local.get $s)) (i32.const 2))))
    (local.set $i (local.get $a))
    (block $d4
      (loop $l4
        (br_if $d4 (i32.ge_u (local.get $i) (local.get $end)))
        (local.set $c (i32.load (local.get $i)))
        (if (i32.eqz (call $is_nl (local.get $c)))
          (then
            (i32.store (local.get $i)
              (i32.or (i32.and (local.get $c) (i32.const 0x1FFFFF)) (i32.shl (local.get $id) (i32.const 21))))))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $l4)))
    (call $set_end (local.get $a) (i32.sub (local.get $e) (local.get $s)))
    (call $commit)
    (i32.const 1))

  ;; =====================================================================
  ;; Paste
  ;; =====================================================================

  ;; Insert $n ready-made cells from $src at the selection. The first pasted
  ;; block merges into the current one and keeps its format, unless the
  ;; current block is empty, in which case the pasted formats win and $last
  ;; (if >= 0) becomes the format of the final pasted block.
  (func $insert_cells_at (param $src i32) (param $n i32) (param $last i32) (result i32)
    (local $s i32) (local $q i32) (local $qa i32) (local $empty i32) (local $a i32) (local $end i32)
    (if (i32.eqz (local.get $n)) (then (return (i32.const 0))))
    (if (i32.eqz (call $room (local.get $n))) (then (return (i32.const 0))))
    (call $begin)
    (local.set $s (call $smin))
    (call $del_range (local.get $s) (call $smax))
    (local.set $q (call $nl_after (local.get $s)))
    (local.set $qa (call $get (local.get $q)))
    (local.set $empty (i32.eq (call $block_start (local.get $s)) (local.get $q)))
    (if (i32.eqz (local.get $empty))
      (then
        (local.set $a (local.get $src))
        (local.set $end (i32.add (local.get $src) (i32.shl (local.get $n) (i32.const 2))))
        (block $d
          (loop $l
            (br_if $d (i32.ge_u (local.get $a) (local.get $end)))
            (if (call $is_nl (i32.load (local.get $a)))
              (then (i32.store (local.get $a) (local.get $qa)) (br $d)))
            (local.set $a (i32.add (local.get $a) (i32.const 4)))
            (br $l)))))
    (call $raw_insert (local.get $s) (local.get $src) (local.get $n))
    (if (i32.and (local.get $empty) (i32.ge_s (local.get $last) (i32.const 0)))
      (then
        (call $set_cell (i32.add (local.get $q) (local.get $n))
          (i32.or (i32.shl (local.get $last) (i32.const 16)) (i32.const 10)))))
    (call $collapse (i32.add (local.get $s) (local.get $n)))
    (global.set $stored (i32.const -1))
    (call $commit)
    (i32.const 1))

  (func (export "insert_cells") (param $n i32) (param $last i32) (result i32)
    (call $insert_cells_at (global.get $OUT) (local.get $n) (local.get $last)))

  ;; =====================================================================
  ;; Rendering
  ;; =====================================================================

  ;; Inline markup nests in a fixed order: link, bold, italic, underline,
  ;; strike, code. Level 0 is the link; level l > 0 is mark bit l-1. Moving
  ;; from one run's attrs to the next closes only the levels that change (and
  ;; those inside them), so a bold word inside a link stays inside one <a>.
  (func $has (param $a i32) (param $l i32) (result i32)
    (if (result i32) (local.get $l)
      (then (i32.ne (i32.and (local.get $a) (i32.shl (i32.const 1) (i32.sub (local.get $l) (i32.const 1)))) (i32.const 0)))
      (else (i32.ne (i32.shr_u (local.get $a) (i32.const 5)) (i32.const 0)))))

  ;; Open or close level $l of attrs $a, as HTML ($md = 0) or Markdown.
  (func $delim (param $l i32) (param $closing i32) (param $a i32) (param $md i32)
    (if (i32.eqz (local.get $md))
      (then
        (if (local.get $l)
          (then
            ;; <strong> <em> <u> <s> <code> and their closing tags
            (call $emit_str (i32.add (i32.add (i32.const 18) (i32.shl (local.get $l) (i32.const 1))) (local.get $closing))))
          (else
            (if (local.get $closing)
              (then (call $emit_str (i32.const 32)))
              (else
                (call $emit_str (i32.const 30))
                (call $emit_url (i32.shr_u (local.get $a) (i32.const 5)) (i32.const 0))
                (call $emit_str (i32.const 31))))))
        (return)))
    (if (i32.eqz (local.get $l))
      (then
        (if (local.get $closing)
          (then
            (call $emit_str (i32.const 61))
            (call $emit_url (i32.shr_u (local.get $a) (i32.const 5)) (i32.const 1))
            (call $emit_str (i32.const 62)))
          (else (call $emit_str (i32.const 60))))
        (return)))
    (if (i32.eq (local.get $l) (i32.const 1)) (then (call $emit_str (i32.const 56))))
    (if (i32.eq (local.get $l) (i32.const 2)) (then (call $emit_str (i32.const 57))))
    (if (i32.eq (local.get $l) (i32.const 3)) (then (call $emit_str (i32.add (i32.const 24) (local.get $closing)))))
    (if (i32.eq (local.get $l) (i32.const 4)) (then (call $emit_str (i32.const 58))))
    (if (i32.eq (local.get $l) (i32.const 5)) (then (call $emit_str (i32.const 59)))))

  ;; Close the levels of $from that differ from $to (innermost first), then
  ;; open those of $to.
  (func $transition (param $from i32) (param $to i32) (param $md i32)
    (local $k i32) (local $l i32)
    (if (i32.eq (local.get $from) (local.get $to)) (then (return)))
    (block $found
      (loop $scan
        (br_if $found (i32.ne (call $has (local.get $from) (local.get $k)) (call $has (local.get $to) (local.get $k))))
        (br_if $found (i32.and (i32.eqz (local.get $k))
                               (i32.ne (i32.shr_u (local.get $from) (i32.const 5)) (i32.shr_u (local.get $to) (i32.const 5)))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br_if $scan (i32.lt_u (local.get $k) (i32.const 6)))))
    (local.set $l (i32.const 6))
    (block $cd
      (loop $cl
        (br_if $cd (i32.le_u (local.get $l) (local.get $k)))
        (local.set $l (i32.sub (local.get $l) (i32.const 1)))
        (if (call $has (local.get $from) (local.get $l))
          (then (call $delim (local.get $l) (i32.const 1) (local.get $from) (local.get $md))))
        (br $cl)))
    (local.set $l (local.get $k))
    (block $od
      (loop $ol
        (br_if $od (i32.ge_u (local.get $l) (i32.const 6)))
        (if (call $has (local.get $to) (local.get $l))
          (then (call $delim (local.get $l) (i32.const 0) (local.get $to) (local.get $md))))
        (local.set $l (i32.add (local.get $l) (i32.const 1)))
        (br $ol))))

  ;; Emit [p, e) as HTML.
  (func $emit_runs (param $p i32) (param $e i32)
    (local $cur i32) (local $c i32) (local $a i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $e)))
        (local.set $c (call $get (local.get $p)))
        (local.set $a (i32.shr_u (local.get $c) (i32.const 16)))
        (call $transition (local.get $cur) (local.get $a) (i32.const 0))
        (local.set $cur (local.get $a))
        (call $emit_esc (i32.and (local.get $c) (i32.const 0xFFFF)))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (call $transition (local.get $cur) (i32.const 0) (i32.const 0)))

  ;; Rendering is two calls. `layout` is one pass over the cells that writes
  ;; a row per block at OUT: [start, cells incl. terminator, FNV-1a hash].
  ;; JS compares the hashes with the previous layout and asks `block_html`
  ;; for just the blocks that changed. Returns the number of blocks.
  (func (export "layout") (result i32)
    (local $a i32) (local $end i32) (local $p i32) (local $start i32) (local $h i32)
    (local $c i32) (local $row i32)
    (local.set $h (i32.const 0x811c9dc5))
    (local.set $row (global.get $OUT))
    ;; walk the cells before the gap, then the cells after it
    (local.set $a (global.get $DOC))
    (local.set $end (i32.add (global.get $DOC) (i32.shl (global.get $gs) (i32.const 2))))
    (block $done
      (loop $l
        (if (i32.ge_u (local.get $a) (local.get $end))
          (then
            (br_if $done (i32.eq (local.get $end) (i32.add (global.get $DOC) (i32.shl (global.get $CAP) (i32.const 2)))))
            (local.set $a (i32.add (global.get $DOC) (i32.shl (global.get $ge) (i32.const 2))))
            (local.set $end (i32.add (global.get $DOC) (i32.shl (global.get $CAP) (i32.const 2))))
            (br $l)))
        (local.set $c (i32.load (local.get $a)))
        (local.set $h (i32.mul (i32.xor (local.get $h) (local.get $c)) (i32.const 0x01000193)))
        (local.set $a (i32.add (local.get $a) (i32.const 4)))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (if (i32.eq (i32.and (local.get $c) (i32.const 0xFFFF)) (i32.const 10))
          (then
            (call $ensure (i32.add (local.get $row) (i32.const 12)))
            (i32.store (local.get $row) (local.get $start))
            (i32.store offset=4 (local.get $row) (i32.sub (local.get $p) (local.get $start)))
            (i32.store offset=8 (local.get $row) (local.get $h))
            (local.set $row (i32.add (local.get $row) (i32.const 12)))
            (local.set $start (local.get $p))
            (local.set $h (i32.const 0x811c9dc5))))
        (br $l)))
    (i32.div_u (i32.sub (local.get $row) (global.get $OUT)) (i32.const 12)))

  ;; The block containing $p as one HTML element for the editing surface,
  ;; written at OUT. Returns its length in UTF-16 units.
  (func (export "block_html") (param $p i32) (result i32)
    (local $q i32) (local $c i32) (local $t i32)
    (global.set $op (global.get $OUT))
    (local.set $p (call $block_start (call $clamp (local.get $p))))
    (local.set $q (call $nl_after (local.get $p)))
    (local.set $c (call $get (local.get $q)))
    (local.set $t (call $type_of (local.get $c)))
    (if (i32.gt_u (local.get $t) (i32.const 8)) (then (local.set $t (i32.const 0))))
    (if (i32.and (i32.eq (local.get $t) (i32.const 7))
                 (i32.ne (i32.and (local.get $c) (i32.const 0x100000)) (i32.const 0)))
      (then (call $emit_str (i32.const 18)))
      (else (call $emit_str (i32.shl (local.get $t) (i32.const 1)))))
    ;; an empty block needs a <br> to have a line box for the caret
    (if (i32.eq (local.get $p) (local.get $q))
      (then (call $emit_str (i32.const 19)))
      (else (call $emit_runs (local.get $p) (local.get $q))))
    (call $emit_str (i32.add (i32.shl (local.get $t) (i32.const 1)) (i32.const 1)))
    (call $out_len))

  ;; =====================================================================
  ;; Export: plain text, semantic HTML, Markdown. Each writes UTF-16 at OUT
  ;; for the blocks overlapping [s, e) and returns the number of units.
  ;; =====================================================================

  (func $order (param $s i32) (param $e i32) (result i32 i32)
    (local.set $s (call $clamp (local.get $s)))
    (local.set $e (call $clamp (local.get $e)))
    (if (result i32 i32) (i32.gt_u (local.get $s) (local.get $e))
      (then (local.get $e) (local.get $s))
      (else (local.get $s) (local.get $e))))

  (func $export_text (export "export_text") (param $s i32) (param $e i32) (result i32)
    (local $p i32) (local $q i32) (local $i i32) (local $end i32)
    (call $order (local.get $s) (local.get $e))
    (local.set $e)
    (local.set $s)
    (global.set $op (global.get $OUT))
    (local.set $p (call $block_start (local.get $s)))
    (block $done
      (loop $blocks
        (local.set $q (call $nl_after (local.get $p)))
        (local.set $i (select (local.get $s) (local.get $p) (i32.gt_u (local.get $s) (local.get $p))))
        (local.set $end (select (local.get $e) (local.get $q) (i32.lt_u (local.get $e) (local.get $q))))
        (block $cd
          (loop $cl
            (br_if $cd (i32.ge_u (local.get $i) (local.get $end)))
            (call $emit (i32.and (call $get (local.get $i)) (i32.const 0xFFFF)))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $cl)))
        (br_if $done (i32.le_u (local.get $e) (local.get $q)))
        (call $emit (i32.const 10))
        (local.set $p (i32.add (local.get $q) (i32.const 1)))
        (br $blocks)))
    (call $out_len))

  ;; Blocks of types 4..8 group with their neighbours of the same type.
  (func $group (param $t i32) (result i32)
    (select (local.get $t) (i32.const 0) (i32.ge_u (local.get $t) (i32.const 4))))

  (func $html_group (param $g i32) (param $close i32)
    (if (i32.eq (local.get $g) (i32.const 4)) (then (call $emit_str (i32.add (i32.const 8) (local.get $close)))))
    (if (i32.eq (local.get $g) (i32.const 5)) (then (call $emit_str (i32.add (i32.const 37) (local.get $close)))))
    (if (i32.eq (local.get $g) (i32.const 6)) (then (call $emit_str (i32.add (i32.const 39) (local.get $close)))))
    (if (i32.eq (local.get $g) (i32.const 7))
      (then (call $emit_str (select (i32.const 38) (i32.const 43) (local.get $close)))))
    (if (i32.eq (local.get $g) (i32.const 8)) (then (call $emit_str (i32.add (i32.const 46) (local.get $close))))))

  (func $export_html (export "export_html") (param $s i32) (param $e i32) (result i32)
    (local $p i32) (local $q i32) (local $a i32) (local $t i32) (local $g i32) (local $pg i32)
    (local $cs i32) (local $ce i32)
    (call $order (local.get $s) (local.get $e))
    (local.set $e)
    (local.set $s)
    (global.set $op (global.get $OUT))
    (local.set $p (call $block_start (local.get $s)))
    (block $done
      (loop $blocks
        (local.set $q (call $nl_after (local.get $p)))
        (local.set $a (i32.shr_u (call $get (local.get $q)) (i32.const 16)))
        (local.set $t (i32.and (local.get $a) (i32.const 15)))
        (if (i32.gt_u (local.get $t) (i32.const 8)) (then (local.set $t (i32.const 0))))
        (local.set $g (call $group (local.get $t)))
        (local.set $cs (select (local.get $s) (local.get $p) (i32.gt_u (local.get $s) (local.get $p))))
        (local.set $ce (select (local.get $e) (local.get $q) (i32.lt_u (local.get $e) (local.get $q))))
        (if (i32.ne (local.get $g) (local.get $pg))
          (then
            (call $html_group (local.get $pg) (i32.const 1))
            (call $html_group (local.get $g) (i32.const 0))))
        (if (i32.eq (local.get $g) (i32.const 8))
          (then
            ;; code lines are joined with newlines inside one <pre><code>
            (if (i32.eq (local.get $pg) (i32.const 8)) (then (call $emit (i32.const 10))))
            (block $cd
              (loop $cl
                (br_if $cd (i32.ge_u (local.get $cs) (local.get $ce)))
                (call $emit_esc (i32.and (call $get (local.get $cs)) (i32.const 0xFFFF)))
                (local.set $cs (i32.add (local.get $cs) (i32.const 1)))
                (br $cl))))
          (else
            (if (i32.eq (local.get $g) (i32.const 7))
              (then (call $emit_str (select (i32.const 45) (i32.const 44) (i32.and (local.get $a) (i32.const 16)))))
              (else
                (if (i32.or (i32.eq (local.get $g) (i32.const 5)) (i32.eq (local.get $g) (i32.const 6)))
                  (then (call $emit_str (i32.const 41)))
                  (else
                    ;; quote lines become paragraphs inside the <blockquote>
                    (call $emit_str (select (i32.const 0) (i32.shl (local.get $t) (i32.const 1))
                                            (i32.eq (local.get $g) (i32.const 4))))))))
            (if (i32.eq (local.get $p) (local.get $q))
              (then (call $emit_str (i32.const 19)))
              (else (call $emit_runs (local.get $cs) (local.get $ce))))
            (if (i32.ge_u (local.get $g) (i32.const 5))
              (then (call $emit_str (i32.const 42)))
              (else
                (call $emit_str (select (i32.const 1) (i32.add (i32.shl (local.get $t) (i32.const 1)) (i32.const 1))
                                        (i32.eq (local.get $g) (i32.const 4))))))))
        (local.set $pg (local.get $g))
        (br_if $done (i32.le_u (local.get $e) (local.get $q)))
        (local.set $p (i32.add (local.get $q) (i32.const 1)))
        (br $blocks)))
    (call $html_group (local.get $pg) (i32.const 1))
    (call $out_len))

  ;; --- Markdown ---------------------------------------------------------

  ;; Attributes common to $x and $y.
  (func $meet (param $x i32) (param $y i32) (result i32)
    (i32.or
      (i32.and (i32.and (local.get $x) (local.get $y)) (i32.const 31))
      (select (i32.and (local.get $x) (i32.const -32)) (i32.const 0)
              (i32.eq (i32.shr_u (local.get $x) (i32.const 5)) (i32.shr_u (local.get $y) (i32.const 5))))))

  ;; Emit [p, e) as Markdown. Spaces take only the marks shared by the
  ;; characters around them, so delimiters always hug non-space text
  ;; ("**bold** text", not "**bold **text", which is not bold in Markdown).
  ;; Spaces in code keep their marks: code spans have no flanking rules.
  (func $md_runs (param $p i32) (param $e i32) (param $bs i32)
    (local $cur i32) (local $c i32) (local $ch i32) (local $eff i32) (local $prev i32) (local $hasprev i32)
    (local $nx i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $e)))
        (local.set $c (call $get (local.get $p)))
        (local.set $ch (i32.and (local.get $c) (i32.const 0xFFFF)))
        (if (i32.and (call $is_space (local.get $ch))
                     (i32.eqz (i32.and (local.get $c) (i32.const 0x100000))))
          (then
            (if (i32.le_u (local.get $nx) (local.get $p))
              (then
                (local.set $nx (i32.add (local.get $p) (i32.const 1)))
                (block $sd
                  (loop $sl
                    (br_if $sd (i32.ge_u (local.get $nx) (local.get $e)))
                    (br_if $sd (i32.eqz (call $is_space (call $get (local.get $nx)))))
                    (local.set $nx (i32.add (local.get $nx) (i32.const 1)))
                    (br $sl)))))
            (local.set $eff (i32.const 0))
            (if (i32.and (local.get $hasprev) (i32.lt_u (local.get $nx) (local.get $e)))
              (then
                (local.set $eff (call $meet (local.get $prev)
                                  (i32.shr_u (call $get (local.get $nx)) (i32.const 16)))))))
          (else
            (local.set $eff (i32.shr_u (local.get $c) (i32.const 16)))
            (local.set $prev (local.get $eff))
            (local.set $hasprev (i32.const 1))))
        (if (i32.ne (local.get $eff) (local.get $cur))
          (then
            (call $transition (local.get $cur) (local.get $eff) (i32.const 1))
            (local.set $cur (local.get $eff))))
        (if (i32.eqz (i32.and (local.get $cur) (i32.const 16)))
          (then
            ;; escape characters that would read as markup
            (if (i32.or
                  (i32.or
                    (i32.or (i32.eq (local.get $ch) (i32.const 92)) (i32.eq (local.get $ch) (i32.const 42)))
                    (i32.or (i32.eq (local.get $ch) (i32.const 95)) (i32.eq (local.get $ch) (i32.const 96))))
                  (i32.or
                    (i32.or (i32.eq (local.get $ch) (i32.const 91)) (i32.eq (local.get $ch) (i32.const 93)))
                    (i32.or (i32.eq (local.get $ch) (i32.const 60)) (i32.eq (local.get $ch) (i32.const 126)))))
              (then (call $emit (i32.const 92)))
              (else
                (if (i32.and
                      (i32.eq (local.get $p) (local.get $bs))
                      (i32.or
                        (i32.or (i32.eq (local.get $ch) (i32.const 35)) (i32.eq (local.get $ch) (i32.const 62)))
                        (i32.or (i32.eq (local.get $ch) (i32.const 45)) (i32.eq (local.get $ch) (i32.const 43)))))
                  (then (call $emit (i32.const 92))))))))
        (call $emit (local.get $ch))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (call $transition (local.get $cur) (i32.const 0) (i32.const 1)))

  (func $export_markdown (export "export_markdown") (param $s i32) (param $e i32) (result i32)
    (local $p i32) (local $q i32) (local $a i32) (local $t i32) (local $g i32) (local $pg i32)
    (local $cs i32) (local $ce i32) (local $num i32) (local $first i32)
    (call $order (local.get $s) (local.get $e))
    (local.set $e)
    (local.set $s)
    (global.set $op (global.get $OUT))
    (local.set $p (call $block_start (local.get $s)))
    (local.set $first (i32.const 1))
    (block $done
      (loop $blocks
        (local.set $q (call $nl_after (local.get $p)))
        (local.set $a (i32.shr_u (call $get (local.get $q)) (i32.const 16)))
        (local.set $t (i32.and (local.get $a) (i32.const 15)))
        (if (i32.gt_u (local.get $t) (i32.const 8)) (then (local.set $t (i32.const 0))))
        (local.set $g (call $group (local.get $t)))
        (local.set $cs (select (local.get $s) (local.get $p) (i32.gt_u (local.get $s) (local.get $p))))
        (local.set $ce (select (local.get $e) (local.get $q) (i32.lt_u (local.get $e) (local.get $q))))
        ;; separator: list items and code lines sit on consecutive lines,
        ;; quote paragraphs are split by ">", everything else by a blank line
        (if (i32.eqz (local.get $first))
          (then
            (if (i32.and (i32.eq (local.get $g) (local.get $pg)) (i32.ge_u (local.get $g) (i32.const 5)))
              (then (call $emit (i32.const 10)))
              (else
                (if (i32.and (i32.eq (local.get $g) (local.get $pg)) (i32.eq (local.get $g) (i32.const 4)))
                  (then (call $emit (i32.const 10)) (call $emit (i32.const 62)) (call $emit (i32.const 10)))
                  (else
                    (if (i32.eq (local.get $pg) (i32.const 8))
                      (then (call $emit (i32.const 10)) (call $emit_str (i32.const 55))))
                    (call $emit (i32.const 10))
                    (call $emit (i32.const 10))))))))
        (if (i32.and (i32.eq (local.get $g) (i32.const 8))
                     (i32.or (local.get $first) (i32.ne (local.get $pg) (i32.const 8))))
          (then (call $emit_str (i32.const 55)) (call $emit (i32.const 10))))
        (if (i32.eq (local.get $t) (i32.const 6))
          (then
            (local.set $num
              (select (i32.add (local.get $num) (i32.const 1)) (i32.const 1)
                      (i32.and (i32.eqz (local.get $first)) (i32.eq (local.get $pg) (i32.const 6)))))))
        ;; block prefix
        (if (i32.and (i32.ge_u (local.get $t) (i32.const 1)) (i32.le_u (local.get $t) (i32.const 3)))
          (then (call $emit_str (i32.add (i32.const 47) (local.get $t)))))
        (if (i32.eq (local.get $t) (i32.const 4)) (then (call $emit_str (i32.const 51))))
        (if (i32.eq (local.get $t) (i32.const 5)) (then (call $emit_str (i32.const 52))))
        (if (i32.eq (local.get $t) (i32.const 6))
          (then (call $emit_num (local.get $num)) (call $emit_str (i32.const 63))))
        (if (i32.eq (local.get $t) (i32.const 7))
          (then (call $emit_str (select (i32.const 54) (i32.const 53) (i32.and (local.get $a) (i32.const 16))))))
        (if (i32.eq (local.get $t) (i32.const 8))
          (then
            (block $cd
              (loop $cl
                (br_if $cd (i32.ge_u (local.get $cs) (local.get $ce)))
                (call $emit (i32.and (call $get (local.get $cs)) (i32.const 0xFFFF)))
                (local.set $cs (i32.add (local.get $cs) (i32.const 1)))
                (br $cl))))
          (else (call $md_runs (local.get $cs) (local.get $ce) (local.get $p))))
        (local.set $pg (local.get $g))
        (local.set $first (i32.const 0))
        (br_if $done (i32.le_u (local.get $e) (local.get $q)))
        (local.set $p (i32.add (local.get $q) (i32.const 1)))
        (br $blocks)))
    (if (i32.eq (local.get $pg) (i32.const 8))
      (then (call $emit (i32.const 10)) (call $emit_str (i32.const 55))))
    (call $out_len))

  ;; =====================================================================
  ;; Markdown import
  ;;
  ;; Phase 1 splits the source into blocks: for each it records the block
  ;; format and copies the inline source (continuation lines joined with a
  ;; space, block markers stripped) into a text buffer T.
  ;; Phase 2 parses each block's inline source into cells.
  ;; Supported: ATX headings, > quotes, - * + bullets, 1. / 1) ordered items,
  ;; - [ ] / - [x] tasks, ``` fences, thematic breaks (dropped); **strong**,
  ;; *em*, _em_, __strong__, ~~strike~~, `code`, <u>underline</u>,
  ;; [links](url), ![images](url) (as links), <autolinks>, bare http(s) URLs
  ;; and backslash escapes. Nested lists are flattened.
  ;; =====================================================================

  (func $skip_sp (param $j i32) (param $le i32) (result i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $j) (local.get $le)))
        (br_if $d (i32.eqz (call $is_space (call $u (local.get $j)))))
        (local.set $j (i32.add (local.get $j) (i32.const 2)))
        (br $l)))
    (local.get $j))

  (func $md_fence (param $j i32) (param $le i32) (result i32)
    (if (i32.gt_u (i32.add (local.get $j) (i32.const 6)) (local.get $le)) (then (return (i32.const 0))))
    (i32.and
      (i32.eq (call $u (local.get $j)) (i32.const 96))
      (i32.and
        (i32.eq (call $u (i32.add (local.get $j) (i32.const 2))) (i32.const 96))
        (i32.eq (call $u (i32.add (local.get $j) (i32.const 4))) (i32.const 96)))))

  ;; "---", "***", "___" (spaces allowed between)
  (func $md_hr (param $j i32) (param $le i32) (result i32)
    (local $c i32) (local $x i32) (local $n i32)
    (local.set $c (call $u (local.get $j)))
    (if (i32.eqz (i32.or (i32.eq (local.get $c) (i32.const 45))
                         (i32.or (i32.eq (local.get $c) (i32.const 42)) (i32.eq (local.get $c) (i32.const 95)))))
      (then (return (i32.const 0))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $j) (local.get $le)))
        (local.set $x (call $u (local.get $j)))
        (if (i32.eq (local.get $x) (local.get $c))
          (then (local.set $n (i32.add (local.get $n) (i32.const 1))))
          (else (if (i32.eqz (call $is_space (local.get $x))) (then (return (i32.const 0))))))
        (local.set $j (i32.add (local.get $j) (i32.const 2)))
        (br $l)))
    (i32.ge_u (local.get $n) (i32.const 3)))

  (func $md_block (param $attrs i32)
    (if (global.get $mrec) (then (i32.store offset=4 (global.get $mrec) (global.get $mT))))
    (global.set $mrec (global.get $mR))
    (i32.store (global.get $mR) (global.get $mT))
    (i32.store offset=8 (global.get $mR) (local.get $attrs))
    (global.set $mR (i32.add (global.get $mR) (i32.const 12))))

  ;; Copy source units [a, b) to T; $trim drops trailing blanks.
  (func $md_copy (param $a i32) (param $b i32) (param $trim i32)
    (if (local.get $trim)
      (then
        (block $d
          (loop $l
            (br_if $d (i32.le_u (local.get $b) (local.get $a)))
            (br_if $d (i32.eqz (call $is_space (call $u (i32.sub (local.get $b) (i32.const 2))))))
            (local.set $b (i32.sub (local.get $b) (i32.const 2)))
            (br $l)))))
    (memory.copy (global.get $mT) (local.get $a) (i32.sub (local.get $b) (local.get $a)))
    (global.set $mT (i32.add (global.get $mT) (i32.sub (local.get $b) (local.get $a)))))

  ;; A continuation line joins the open block with a space.
  (func $md_join (param $a i32) (param $b i32)
    (i32.store16 (global.get $mT) (i32.const 32))
    (global.set $mT (i32.add (global.get $mT) (i32.const 2)))
    (call $md_copy (local.get $a) (local.get $b) (i32.const 1)))

  ;; Phase 1 over source units [i, end).
  (func $md_blocks (param $i i32) (param $end i32)
    (local $ls i32) (local $le i32) (local $j i32) (local $k i32) (local $c i32) (local $t i32)
    (local $code i32) (local $open i32) (local $otype i32)
    (block $done
      (loop $lines
        (br_if $done (i32.ge_u (local.get $i) (local.get $end)))
        (local.set $ls (local.get $i))
        (local.set $le (local.get $i))
        (block $eol
          (loop $scan
            (br_if $eol (i32.ge_u (local.get $le) (local.get $end)))
            (br_if $eol (i32.eq (call $u (local.get $le)) (i32.const 10)))
            (local.set $le (i32.add (local.get $le) (i32.const 2)))
            (br $scan)))
        (local.set $i (i32.add (local.get $le) (i32.const 2)))
        (if (i32.gt_u (local.get $le) (local.get $ls))
          (then
            (if (i32.eq (call $u (i32.sub (local.get $le) (i32.const 2))) (i32.const 13))
              (then (local.set $le (i32.sub (local.get $le) (i32.const 2)))))))
        (local.set $j (call $skip_sp (local.get $ls) (local.get $le)))
        ;; inside a fence every line is a code line
        (if (local.get $code)
          (then
            (if (call $md_fence (local.get $j) (local.get $le))
              (then (local.set $code (i32.const 0)))
              (else
                (call $md_block (i32.const 8))
                (call $md_copy (local.get $ls) (local.get $le) (i32.const 0))))
            (local.set $open (i32.const 0))
            (br $lines)))
        (if (i32.eq (local.get $j) (local.get $le))
          (then (local.set $open (i32.const 0)) (br $lines)))
        (if (call $md_fence (local.get $j) (local.get $le))
          (then (local.set $code (i32.const 1)) (local.set $open (i32.const 0)) (br $lines)))
        (if (call $md_hr (local.get $j) (local.get $le))
          (then (local.set $open (i32.const 0)) (br $lines)))
        (local.set $c (call $u (local.get $j)))
        ;; ATX heading: 1-6 "#" then a space or the end of the line
        (if (i32.eq (local.get $c) (i32.const 35))
          (then
            (local.set $k (local.get $j))
            (block $hd
              (loop $hl
                (br_if $hd (i32.ge_u (local.get $k) (local.get $le)))
                (br_if $hd (i32.ne (call $u (local.get $k)) (i32.const 35)))
                (local.set $k (i32.add (local.get $k) (i32.const 2)))
                (br $hl)))
            (local.set $t (i32.shr_u (i32.sub (local.get $k) (local.get $j)) (i32.const 1)))
            (if (i32.and
                  (i32.le_u (local.get $t) (i32.const 6))
                  (i32.or (i32.ge_u (local.get $k) (local.get $le)) (call $is_space (call $u (local.get $k)))))
              (then
                (if (i32.gt_u (local.get $t) (i32.const 3)) (then (local.set $t (i32.const 3))))
                (call $md_block (local.get $t))
                (call $md_copy (call $skip_sp (local.get $k) (local.get $le)) (local.get $le) (i32.const 1))
                (local.set $open (i32.const 0))
                (br $lines)))))
        ;; block quote (nested quotes flatten)
        (if (i32.eq (local.get $c) (i32.const 62))
          (then
            (block $qd
              (loop $ql
                (br_if $qd (i32.ge_u (local.get $j) (local.get $le)))
                (br_if $qd (i32.ne (call $u (local.get $j)) (i32.const 62)))
                (local.set $j (call $skip_sp (i32.add (local.get $j) (i32.const 2)) (local.get $le)))
                (br $ql)))
            (if (i32.eq (local.get $j) (local.get $le))
              (then (local.set $open (i32.const 0)) (br $lines)))
            (if (i32.and (local.get $open) (i32.eq (local.get $otype) (i32.const 4)))
              (then (call $md_join (local.get $j) (local.get $le)) (br $lines)))
            (call $md_block (i32.const 4))
            (call $md_copy (local.get $j) (local.get $le) (i32.const 1))
            (local.set $open (i32.const 1))
            (local.set $otype (i32.const 4))
            (br $lines)))
        ;; bullet: "-", "*" or "+" then a space; "[ ]" / "[x]" makes it a todo
        (if (i32.and
              (i32.or (i32.eq (local.get $c) (i32.const 45))
                      (i32.or (i32.eq (local.get $c) (i32.const 42)) (i32.eq (local.get $c) (i32.const 43))))
              (i32.or (i32.ge_u (i32.add (local.get $j) (i32.const 2)) (local.get $le))
                      (call $is_space (call $u (i32.add (local.get $j) (i32.const 2))))))
          (then
            (local.set $j (call $skip_sp (i32.add (local.get $j) (i32.const 2)) (local.get $le)))
            (local.set $t (i32.const 5))
            (if (i32.and
                  (i32.le_u (i32.add (local.get $j) (i32.const 6)) (local.get $le))
                  (i32.and (i32.eq (call $u (local.get $j)) (i32.const 91))
                           (i32.eq (call $u (i32.add (local.get $j) (i32.const 4))) (i32.const 93))))
              (then
                (local.set $k (call $u (i32.add (local.get $j) (i32.const 2))))
                (if (i32.and
                      (i32.or (i32.ge_u (i32.add (local.get $j) (i32.const 6)) (local.get $le))
                              (call $is_space (call $u (i32.add (local.get $j) (i32.const 6)))))
                      (i32.or (i32.eq (local.get $k) (i32.const 32))
                              (i32.eq (i32.or (local.get $k) (i32.const 32)) (i32.const 120))))
                  (then
                    (local.set $t (select (i32.const 23) (i32.const 7) (i32.ne (local.get $k) (i32.const 32))))
                    (local.set $j (call $skip_sp (i32.add (local.get $j) (i32.const 6)) (local.get $le)))))))
            (call $md_block (local.get $t))
            (call $md_copy (local.get $j) (local.get $le) (i32.const 1))
            (local.set $open (i32.const 1))
            (local.set $otype (local.get $t))
            (br $lines)))
        ;; ordered: 1-9 digits, "." or ")", then a space or the end of the line
        (local.set $k (local.get $j))
        (block $nd
          (loop $nl
            (br_if $nd (i32.ge_u (local.get $k) (local.get $le)))
            (br_if $nd (i32.ge_u (i32.sub (call $u (local.get $k)) (i32.const 48)) (i32.const 10)))
            (local.set $k (i32.add (local.get $k) (i32.const 2)))
            (br $nl)))
        (if (i32.and
              (i32.and (i32.gt_u (local.get $k) (local.get $j))
                       (i32.le_u (i32.sub (local.get $k) (local.get $j)) (i32.const 18)))
              (i32.and (i32.lt_u (local.get $k) (local.get $le))
                       (i32.or (i32.eq (call $u (local.get $k)) (i32.const 46)) (i32.eq (call $u (local.get $k)) (i32.const 41)))))
          (then
            (if (i32.or (i32.ge_u (i32.add (local.get $k) (i32.const 2)) (local.get $le))
                        (call $is_space (call $u (i32.add (local.get $k) (i32.const 2)))))
              (then
                (call $md_block (i32.const 6))
                (call $md_copy (call $skip_sp (i32.add (local.get $k) (i32.const 2)) (local.get $le)) (local.get $le) (i32.const 1))
                (local.set $open (i32.const 1))
                (local.set $otype (i32.const 6))
                (br $lines)))))
        ;; plain text continues the open paragraph, list item or quote
        (if (local.get $open)
          (then (call $md_join (local.get $j) (local.get $le)) (br $lines)))
        (call $md_block (i32.const 0))
        (call $md_copy (local.get $j) (local.get $le) (i32.const 1))
        (local.set $open (i32.const 1))
        (local.set $otype (i32.const 0))
        (br $lines)))
    (if (global.get $mrec) (then (i32.store offset=4 (global.get $mrec) (global.get $mT)))))

  (func $md_out (param $ch i32) (param $attrs i32)
    (i32.store (global.get $mC) (i32.or (local.get $ch) (i32.shl (local.get $attrs) (i32.const 16))))
    (global.set $mC (i32.add (global.get $mC) (i32.const 4))))

  (func $md_attrs (result i32)
    (i32.or (global.get $im) (i32.shl (global.get $il) (i32.const 5))))

  (func $run (param $i i32) (param $b i32) (param $c i32) (result i32)
    (local $n i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $b)))
        (br_if $d (i32.ne (call $u (local.get $i)) (local.get $c)))
        (local.set $n (i32.add (local.get $n) (i32.const 1)))
        (local.set $i (i32.add (local.get $i) (i32.const 2)))
        (br $l)))
    (local.get $n))

  (func $is_ws (param $c i32) (result i32)
    (i32.or (call $is_space (local.get $c)) (i32.eq (local.get $c) (i32.const 10))))

  (func $is_punct (param $c i32) (result i32)
    (i32.or
      (i32.or (i32.lt_u (i32.sub (local.get $c) (i32.const 33)) (i32.const 15))
              (i32.lt_u (i32.sub (local.get $c) (i32.const 58)) (i32.const 7)))
      (i32.or (i32.lt_u (i32.sub (local.get $c) (i32.const 91)) (i32.const 6))
              (i32.lt_u (i32.sub (local.get $c) (i32.const 123)) (i32.const 4)))))

  ;; Do the units at $i match string $k exactly (and fit before $b)?
  (func $match (param $i i32) (param $b i32) (param $k i32) (result i32)
    (local $a i32) (local $n i32)
    (local.set $a (i32.add (global.get $STRTAB) (i32.shl (local.get $k) (i32.const 2))))
    (local.set $n (i32.load16_u offset=2 (local.get $a)))
    (local.set $a (i32.load16_u (local.get $a)))
    (if (i32.gt_u (i32.add (local.get $i) (i32.shl (local.get $n) (i32.const 1))) (local.get $b))
      (then (return (i32.const 0))))
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $n)))
        (if (i32.ne (call $u (local.get $i)) (i32.load8_u (local.get $a))) (then (return (i32.const 0))))
        (local.set $i (i32.add (local.get $i) (i32.const 2)))
        (local.set $a (i32.add (local.get $a) (i32.const 1)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $l)))
    (i32.const 1))

  ;; Is there a run of at least $need $c's from $j on that can close emphasis?
  (func $md_closer (param $j i32) (param $b i32) (param $c i32) (param $need i32) (result i32)
    (local $x i32) (local $r i32) (local $nx i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $j) (local.get $b)))
        (local.set $x (call $u (local.get $j)))
        (if (i32.eq (local.get $x) (i32.const 92))
          (then (local.set $j (i32.add (local.get $j) (i32.const 4))) (br $l)))
        (if (i32.eq (local.get $x) (local.get $c))
          (then
            (local.set $r (call $run (local.get $j) (local.get $b) (local.get $c)))
            (local.set $nx (i32.const 32))
            (if (i32.lt_u (i32.add (local.get $j) (i32.shl (local.get $r) (i32.const 1))) (local.get $b))
              (then (local.set $nx (call $u (i32.add (local.get $j) (i32.shl (local.get $r) (i32.const 1)))))))
            (if (i32.and
                  (i32.ge_u (local.get $r) (local.get $need))
                  (i32.and
                    (i32.eqz (call $is_ws (call $u (i32.sub (local.get $j) (i32.const 2)))))
                    (i32.or (i32.ne (local.get $c) (i32.const 95)) (i32.eqz (call $is_alnum (local.get $nx))))))
              (then (return (i32.const 1))))
            (local.set $j (i32.add (local.get $j) (i32.shl (local.get $r) (i32.const 1))))
            (br $l)))
        (local.set $j (i32.add (local.get $j) (i32.const 2)))
        (br $l)))
    (i32.const 0))

  ;; A run of "*", "_" or "~" at $i. Toggles bold/italic/strike where the
  ;; run can open (and a closer follows) or close; the rest is literal text.
  ;; Returns the address after the run.
  (func $md_emph (param $i i32) (param $a i32) (param $b i32) (param $c i32) (result i32)
    (local $n i32) (local $after i32) (local $prev i32) (local $next i32)
    (local $open i32) (local $close i32) (local $two i32) (local $one i32)
    (local.set $n (call $run (local.get $i) (local.get $b) (local.get $c)))
    (local.set $after (i32.add (local.get $i) (i32.shl (local.get $n) (i32.const 1))))
    (local.set $prev (i32.const 32))
    (if (i32.gt_u (local.get $i) (local.get $a))
      (then (local.set $prev (call $u (i32.sub (local.get $i) (i32.const 2))))))
    (local.set $next (i32.const 32))
    (if (i32.lt_u (local.get $after) (local.get $b))
      (then (local.set $next (call $u (local.get $after)))))
    ;; "_" may not open or close inside a word
    (local.set $open
      (i32.and (i32.eqz (call $is_ws (local.get $next)))
               (i32.or (i32.ne (local.get $c) (i32.const 95)) (i32.eqz (call $is_alnum (local.get $prev))))))
    (local.set $close
      (i32.and (i32.eqz (call $is_ws (local.get $prev)))
               (i32.or (i32.ne (local.get $c) (i32.const 95)) (i32.eqz (call $is_alnum (local.get $next))))))
    (if (i32.eq (local.get $c) (i32.const 126))
      (then (local.set $two (i32.const 8)))
      (else (local.set $two (i32.const 1)) (local.set $one (i32.const 2))))
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $n)))
        (if (i32.ge_u (local.get $n) (i32.const 2))
          (then
            (if (if (result i32) (i32.and (global.get $im) (local.get $two))
                  (then (local.get $close))
                  (else (i32.and (local.get $open)
                                 (call $md_closer (local.get $after) (local.get $b) (local.get $c) (i32.const 2)))))
              (then
                (global.set $im (i32.xor (global.get $im) (local.get $two)))
                (local.set $n (i32.sub (local.get $n) (i32.const 2)))
                (br $l)))))
        (if (local.get $one)
          (then
            (if (if (result i32) (i32.and (global.get $im) (local.get $one))
                  (then (local.get $close))
                  (else (i32.and (local.get $open)
                                 (call $md_closer (local.get $after) (local.get $b) (local.get $c) (i32.const 1)))))
              (then
                (global.set $im (i32.xor (global.get $im) (local.get $one)))
                (local.set $n (i32.sub (local.get $n) (i32.const 1)))
                (br $l)))))
        (call $md_out (local.get $c) (call $md_attrs))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $l)))
    (local.get $after))

  ;; Start of the closing backtick run of exactly $n backticks, or 0.
  (func $md_code_end (param $j i32) (param $b i32) (param $n i32) (result i32)
    (local $r i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $j) (local.get $b)))
        (if (i32.eq (call $u (local.get $j)) (i32.const 96))
          (then
            (local.set $r (call $run (local.get $j) (local.get $b) (i32.const 96)))
            (if (i32.eq (local.get $r) (local.get $n)) (then (return (local.get $j))))
            (local.set $j (i32.add (local.get $j) (i32.shl (local.get $r) (i32.const 1))))
            (br $l)))
        (local.set $j (i32.add (local.get $j) (i32.const 2)))
        (br $l)))
    (i32.const 0))

  ;; "[text](url)" with $i at "[". On success sets the link state (text is
  ;; linked until the "]", then "](url)" is skipped) and returns 1.
  (func $md_link (param $i i32) (param $b i32) (result i32)
    (local $j i32) (local $depth i32) (local $x i32) (local $us i32) (local $ue i32) (local $k i32)
    (local.set $j (i32.add (local.get $i) (i32.const 2)))
    (block $found
      (loop $l
        (if (i32.ge_u (local.get $j) (local.get $b)) (then (return (i32.const 0))))
        (local.set $x (call $u (local.get $j)))
        (if (i32.eq (local.get $x) (i32.const 92))
          (then (local.set $j (i32.add (local.get $j) (i32.const 4))) (br $l)))
        (if (i32.eq (local.get $x) (i32.const 91))
          (then (local.set $depth (i32.add (local.get $depth) (i32.const 1)))))
        (if (i32.eq (local.get $x) (i32.const 93))
          (then
            (br_if $found (i32.eqz (local.get $depth)))
            (local.set $depth (i32.sub (local.get $depth) (i32.const 1)))))
        (local.set $j (i32.add (local.get $j) (i32.const 2)))
        (br $l)))
    (if (i32.ge_u (i32.add (local.get $j) (i32.const 2)) (local.get $b)) (then (return (i32.const 0))))
    (if (i32.ne (call $u (i32.add (local.get $j) (i32.const 2))) (i32.const 40)) (then (return (i32.const 0))))
    (local.set $us (call $skip_sp (i32.add (local.get $j) (i32.const 4)) (local.get $b)))
    (local.set $ue (local.get $us))
    (block $e
      (loop $l2
        (br_if $e (i32.ge_u (local.get $ue) (local.get $b)))
        (local.set $x (call $u (local.get $ue)))
        (br_if $e (i32.or (i32.eq (local.get $x) (i32.const 41)) (call $is_space (local.get $x))))
        (local.set $ue (i32.add (local.get $ue) (i32.const 2)))
        (br $l2)))
    ;; skip an optional title up to ")"
    (local.set $k (local.get $ue))
    (block $e2
      (loop $l3
        (if (i32.ge_u (local.get $k) (local.get $b)) (then (return (i32.const 0))))
        (br_if $e2 (i32.eq (call $u (local.get $k)) (i32.const 41)))
        (local.set $k (i32.add (local.get $k) (i32.const 2)))
        (br $l3)))
    (global.set $il (i32.const 0))
    (if (i32.gt_u (local.get $ue) (local.get $us))
      (then
        (global.set $il (call $link_id (local.get $us)
                          (i32.shr_u (i32.sub (local.get $ue) (local.get $us)) (i32.const 1))))))
    (global.set $ilend (local.get $j))
    (global.set $ilskip (i32.add (local.get $k) (i32.const 2)))
    (i32.const 1))

  ;; An http(s) URL at $i: "<url>" form when $angle, else a bare URL (minus
  ;; trailing punctuation). Emits it as linked text; returns the resume
  ;; address or 0.
  (func $md_autolink (param $i i32) (param $b i32) (param $angle i32) (result i32)
    (local $e i32) (local $x i32) (local $resume i32) (local $at i32)
    (if (i32.eqz (i32.or (call $match (local.get $i) (local.get $b) (i32.const 68))
                         (call $match (local.get $i) (local.get $b) (i32.const 69))))
      (then (return (i32.const 0))))
    (local.set $e (local.get $i))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $e) (local.get $b)))
        (local.set $x (call $u (local.get $e)))
        (br_if $d (i32.or (call $is_ws (local.get $x)) (i32.eq (local.get $x) (i32.const 60))))
        (br_if $d (i32.and (local.get $angle) (i32.eq (local.get $x) (i32.const 62))))
        (local.set $e (i32.add (local.get $e) (i32.const 2)))
        (br $l)))
    (if (local.get $angle)
      (then
        (if (i32.ge_u (local.get $e) (local.get $b)) (then (return (i32.const 0))))
        (if (i32.ne (call $u (local.get $e)) (i32.const 62)) (then (return (i32.const 0))))
        (local.set $resume (i32.add (local.get $e) (i32.const 2))))
      (else
        (block $td
          (loop $tl
            (br_if $td (i32.le_u (local.get $e) (local.get $i)))
            (local.set $x (call $u (i32.sub (local.get $e) (i32.const 2))))
            (br_if $td (i32.eqz
              (i32.or
                (i32.or (i32.or (i32.eq (local.get $x) (i32.const 46)) (i32.eq (local.get $x) (i32.const 44)))
                        (i32.or (i32.eq (local.get $x) (i32.const 59)) (i32.eq (local.get $x) (i32.const 58))))
                (i32.or (i32.or (i32.eq (local.get $x) (i32.const 33)) (i32.eq (local.get $x) (i32.const 63)))
                        (i32.or (i32.eq (local.get $x) (i32.const 41)) (i32.eq (local.get $x) (i32.const 39)))))))
            (local.set $e (i32.sub (local.get $e) (i32.const 2)))
            (br $tl)))
        (local.set $resume (local.get $e))))
    (local.set $at (i32.or (global.get $im)
                           (i32.shl (call $link_id (local.get $i) (i32.shr_u (i32.sub (local.get $e) (local.get $i)) (i32.const 1)))
                                    (i32.const 5))))
    (block $od
      (loop $ol
        (br_if $od (i32.ge_u (local.get $i) (local.get $e)))
        (call $md_out (call $u (local.get $i)) (local.get $at))
        (local.set $i (i32.add (local.get $i) (i32.const 2)))
        (br $ol)))
    (local.get $resume))

  ;; Phase 2 for one block: inline source [a, b) of T to cells.
  (func $md_inline (param $a i32) (param $b i32)
    (local $i i32) (local $c i32) (local $n i32) (local $j i32) (local $s i32) (local $e i32) (local $at i32)
    (global.set $im (i32.const 0))
    (global.set $il (i32.const 0))
    (global.set $ilend (i32.const 0))
    (local.set $i (local.get $a))
    (block $done
      (loop $l
        (br_if $done (i32.ge_u (local.get $i) (local.get $b)))
        ;; end of link text: skip "](url)"
        (if (i32.and (i32.ne (global.get $ilend) (i32.const 0)) (i32.eq (local.get $i) (global.get $ilend)))
          (then
            (global.set $il (i32.const 0))
            (global.set $ilend (i32.const 0))
            (local.set $i (global.get $ilskip))
            (br $l)))
        (local.set $c (call $u (local.get $i)))
        ;; backslash escape
        (if (i32.and (i32.eq (local.get $c) (i32.const 92)) (i32.lt_u (i32.add (local.get $i) (i32.const 2)) (local.get $b)))
          (then
            (if (call $is_punct (call $u (i32.add (local.get $i) (i32.const 2))))
              (then
                (call $md_out (call $u (i32.add (local.get $i) (i32.const 2))) (call $md_attrs))
                (local.set $i (i32.add (local.get $i) (i32.const 4)))
                (br $l)))))
        ;; code span
        (if (i32.eq (local.get $c) (i32.const 96))
          (then
            (local.set $n (call $run (local.get $i) (local.get $b) (i32.const 96)))
            (local.set $s (i32.add (local.get $i) (i32.shl (local.get $n) (i32.const 1))))
            (local.set $e (call $md_code_end (local.get $s) (local.get $b) (local.get $n)))
            (if (local.get $e)
              (then
                (local.set $j (i32.add (local.get $e) (i32.shl (local.get $n) (i32.const 1))))
                ;; one space is stripped from each side when both are present
                (if (i32.and
                      (i32.ge_u (i32.sub (local.get $e) (local.get $s)) (i32.const 4))
                      (i32.and (i32.eq (call $u (local.get $s)) (i32.const 32))
                               (i32.eq (call $u (i32.sub (local.get $e) (i32.const 2))) (i32.const 32))))
                  (then
                    (local.set $s (i32.add (local.get $s) (i32.const 2)))
                    (local.set $e (i32.sub (local.get $e) (i32.const 2)))))
                (local.set $at (i32.or (call $md_attrs) (i32.const 16)))
                (block $cd
                  (loop $cl
                    (br_if $cd (i32.ge_u (local.get $s) (local.get $e)))
                    (call $md_out (call $u (local.get $s)) (local.get $at))
                    (local.set $s (i32.add (local.get $s) (i32.const 2)))
                    (br $cl)))
                (local.set $i (local.get $j))
                (br $l)))
            ;; no closing run: the backticks are literal
            (block $bd
              (loop $bl
                (br_if $bd (i32.eqz (local.get $n)))
                (call $md_out (i32.const 96) (call $md_attrs))
                (local.set $n (i32.sub (local.get $n) (i32.const 1)))
                (br $bl)))
            (local.set $i (local.get $s))
            (br $l)))
        ;; emphasis and strikethrough
        (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 42)) (i32.eq (local.get $c) (i32.const 95)))
                    (i32.eq (local.get $c) (i32.const 126)))
          (then
            (local.set $i (call $md_emph (local.get $i) (local.get $a) (local.get $b) (local.get $c)))
            (br $l)))
        ;; links, and images (kept as a link on their alt text)
        (if (i32.eqz (global.get $ilend))
          (then
            (if (i32.and (i32.eq (local.get $c) (i32.const 33))
                         (i32.and (i32.lt_u (i32.add (local.get $i) (i32.const 2)) (local.get $b))
                                  (i32.eq (call $u (i32.add (local.get $i) (i32.const 2))) (i32.const 91))))
              (then
                (if (call $md_link (i32.add (local.get $i) (i32.const 2)) (local.get $b))
                  (then (local.set $i (i32.add (local.get $i) (i32.const 4))) (br $l)))))
            (if (i32.eq (local.get $c) (i32.const 91))
              (then
                (if (call $md_link (local.get $i) (local.get $b))
                  (then (local.set $i (i32.add (local.get $i) (i32.const 2))) (br $l)))))))
        ;; <u>, </u> and <autolinks>
        (if (i32.eq (local.get $c) (i32.const 60))
          (then
            (if (call $match (local.get $i) (local.get $b) (i32.const 24))
              (then
                (global.set $im (i32.or (global.get $im) (i32.const 4)))
                (local.set $i (i32.add (local.get $i) (i32.const 6)))
                (br $l)))
            (if (call $match (local.get $i) (local.get $b) (i32.const 25))
              (then
                (global.set $im (i32.and (global.get $im) (i32.const -5)))
                (local.set $i (i32.add (local.get $i) (i32.const 8)))
                (br $l)))
            (if (i32.eqz (global.get $il))
              (then
                (local.set $j (call $md_autolink (i32.add (local.get $i) (i32.const 2)) (local.get $b) (i32.const 1)))
                (if (local.get $j) (then (local.set $i (local.get $j)) (br $l)))))))
        ;; bare http(s) URL at the start of a word
        (if (i32.and (i32.eq (local.get $c) (i32.const 104)) (i32.eqz (global.get $il)))
          (then
            (if (i32.or (i32.eq (local.get $i) (local.get $a))
                        (call $is_ws (call $u (i32.sub (local.get $i) (i32.const 2)))))
              (then
                (local.set $j (call $md_autolink (local.get $i) (local.get $b) (i32.const 0)))
                (if (local.get $j) (then (local.set $i (local.get $j)) (br $l)))))))
        (call $md_out (local.get $c) (call $md_attrs))
        (local.set $i (i32.add (local.get $i) (i32.const 2)))
        (br $l))))

  ;; Phase 2 over all block records: cells at $c0, returns their number.
  ;; The final block's terminator is left off (like a paste); its attrs are
  ;; left in $last_attrs.
  (func $md_cells (param $r i32) (param $c0 i32) (result i32)
    (local $s i32) (local $e i32) (local $attrs i32)
    (global.set $mC (local.get $c0))
    (global.set $last_attrs (i32.const -1))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $r) (global.get $mR)))
        (if (i32.ge_s (global.get $last_attrs) (i32.const 0))
          (then (call $md_out (i32.const 10) (global.get $last_attrs))))
        (local.set $s (i32.load (local.get $r)))
        (local.set $e (i32.load offset=4 (local.get $r)))
        (local.set $attrs (i32.load offset=8 (local.get $r)))
        (global.set $last_attrs (local.get $attrs))
        (if (i32.eq (local.get $attrs) (i32.const 8))
          (then
            (block $cd
              (loop $cl
                (br_if $cd (i32.ge_u (local.get $s) (local.get $e)))
                (call $md_out (call $u (local.get $s)) (i32.const 0))
                (local.set $s (i32.add (local.get $s) (i32.const 2)))
                (br $cl))))
          (else (call $md_inline (local.get $s) (local.get $e))))
        (local.set $r (i32.add (local.get $r) (i32.const 12)))
        (br $l)))
    (i32.shr_u (i32.sub (global.get $mC) (local.get $c0)) (i32.const 2)))

  ;; Parse $n units of Markdown at OUT and insert the result at the selection.
  (func $paste_markdown (export "paste_markdown") (param $n i32) (result i32)
    (local $t i32) (local $r i32) (local $c i32)
    ;; scratch after the source: T (<= 2n units), records (<= n+1), cells (<= 3n)
    (local.set $t (i32.add (global.get $OUT)
                           (i32.and (i32.add (i32.shl (local.get $n) (i32.const 1)) (i32.const 7)) (i32.const -8))))
    (local.set $r (i32.add (local.get $t) (i32.shl (i32.add (local.get $n) (i32.const 8)) (i32.const 2))))
    (local.set $c (i32.add (local.get $r) (i32.mul (i32.add (local.get $n) (i32.const 8)) (i32.const 12))))
    (call $ensure (i32.add (local.get $c) (i32.mul (i32.add (local.get $n) (i32.const 8)) (i32.const 12))))
    (global.set $mT (local.get $t))
    (global.set $mR (local.get $r))
    (global.set $mrec (i32.const 0))
    (call $md_blocks (global.get $OUT) (i32.add (global.get $OUT) (i32.shl (local.get $n) (i32.const 1))))
    (call $insert_cells_at
      (local.get $c)
      (call $md_cells (local.get $r) (local.get $c))
      (global.get $last_attrs)))
