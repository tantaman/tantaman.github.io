;; ui-draw.wat -- framebuffer primitives, the glyph cache and text measuring.
;;
;; Glyphs come from the signed distance fields in the font atlas. The first
;; time a glyph is needed at a size, it is rasterized into a coverage bitmap
;; (one byte per pixel) in the glyph cache; drawing then only blends that
;; bitmap. The cache is a hash table keyed by face, glyph, size and synthetic
;; bold, and is simply emptied when it fills up.

  ;; ---------------------------------------------------------------------
  ;; Pixels. All drawing is clipped to ($cx0, $cy0) - ($cx1, $cy1).
  ;; ---------------------------------------------------------------------

  (func $clip (param $x0 i32) (param $y0 i32) (param $x1 i32) (param $y1 i32)
    (global.set $cx0 (select (local.get $x0) (i32.const 0) (i32.gt_s (local.get $x0) (i32.const 0))))
    (global.set $cy0 (select (local.get $y0) (i32.const 0) (i32.gt_s (local.get $y0) (i32.const 0))))
    (global.set $cx1 (select (local.get $x1) (global.get $W) (i32.lt_s (local.get $x1) (global.get $W))))
    (global.set $cy1 (select (local.get $y1) (global.get $H) (i32.lt_s (local.get $y1) (global.get $H)))))

  (func $px_addr (param $x i32) (param $y i32) (result i32)
    (i32.add (global.get $FB) (i32.shl (i32.add (i32.mul (local.get $y) (global.get $W)) (local.get $x)) (i32.const 2))))

  ;; Solid rectangle: the first row is written word by word, the rest copied.
  (func $fill (param $x i32) (param $y i32) (param $w i32) (param $h i32) (param $c i32)
    (local $x0 i32) (local $y0 i32) (local $x1 i32) (local $y1 i32) (local $a i32) (local $end i32) (local $row i32) (local $n i32)
    (local.set $x0 (select (local.get $x) (global.get $cx0) (i32.gt_s (local.get $x) (global.get $cx0))))
    (local.set $y0 (select (local.get $y) (global.get $cy0) (i32.gt_s (local.get $y) (global.get $cy0))))
    (local.set $x1 (i32.add (local.get $x) (local.get $w)))
    (local.set $x1 (select (local.get $x1) (global.get $cx1) (i32.lt_s (local.get $x1) (global.get $cx1))))
    (local.set $y1 (i32.add (local.get $y) (local.get $h)))
    (local.set $y1 (select (local.get $y1) (global.get $cy1) (i32.lt_s (local.get $y1) (global.get $cy1))))
    (if (i32.or (i32.ge_s (local.get $x0) (local.get $x1)) (i32.ge_s (local.get $y0) (local.get $y1))) (then (return)))
    (local.set $row (call $px_addr (local.get $x0) (local.get $y0)))
    (local.set $n (i32.shl (i32.sub (local.get $x1) (local.get $x0)) (i32.const 2)))
    (local.set $a (local.get $row))
    (local.set $end (i32.add (local.get $row) (local.get $n)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $a) (local.get $end)))
        (i32.store (local.get $a) (local.get $c))
        (local.set $a (i32.add (local.get $a) (i32.const 4)))
        (br $l)))
    (local.set $y0 (i32.add (local.get $y0) (i32.const 1)))
    (block $d2
      (loop $l2
        (br_if $d2 (i32.ge_s (local.get $y0) (local.get $y1)))
        (memory.copy (call $px_addr (local.get $x0) (local.get $y0)) (local.get $row) (local.get $n))
        (local.set $y0 (i32.add (local.get $y0) (i32.const 1)))
        (br $l2))))

  ;; Blend colour $c over the pixel at $a with coverage $cov (0..255).
  ;; Only the three colour lanes are blended, so this works for both
  ;; framebuffer byte orders.
  (func $blend (param $a i32) (param $c i32) (param $cov i32)
    (local $d i32) (local $s i32)
    (if (i32.ge_u (local.get $cov) (i32.const 255))
      (then (i32.store (local.get $a) (local.get $c)) (return)))
    (local.set $cov (i32.add (local.get $cov) (i32.shr_u (local.get $cov) (i32.const 7))))
    (local.set $d (i32.load8_u (local.get $a)))
    (local.set $s (i32.and (local.get $c) (i32.const 0xFF)))
    (i32.store8 (local.get $a)
      (i32.add (local.get $d) (i32.shr_s (i32.mul (i32.sub (local.get $s) (local.get $d)) (local.get $cov)) (i32.const 8))))
    (local.set $d (i32.load8_u offset=1 (local.get $a)))
    (local.set $s (i32.and (i32.shr_u (local.get $c) (i32.const 8)) (i32.const 0xFF)))
    (i32.store8 offset=1 (local.get $a)
      (i32.add (local.get $d) (i32.shr_s (i32.mul (i32.sub (local.get $s) (local.get $d)) (local.get $cov)) (i32.const 8))))
    (local.set $d (i32.load8_u offset=2 (local.get $a)))
    (local.set $s (i32.and (i32.shr_u (local.get $c) (i32.const 16)) (i32.const 0xFF)))
    (i32.store8 offset=2 (local.get $a)
      (i32.add (local.get $d) (i32.shr_s (i32.mul (i32.sub (local.get $s) (local.get $d)) (local.get $cov)) (i32.const 8)))))

  (func $cov (param $v f32) (result i32)
    (i32.trunc_sat_f32_s (f32.nearest (f32.mul (f32.max (f32.const 0) (f32.min (f32.const 1) (local.get $v))) (f32.const 255)))))

  ;; Anti-aliased filled rectangle with corner radius $r.
  (func $rrect (param $x i32) (param $y i32) (param $w i32) (param $h i32) (param $r i32) (param $c i32)
    (local $i i32) (local $j i32) (local $px i32) (local $py i32) (local $cx f32) (local $cy f32) (local $d f32) (local $rf f32)
    (if (i32.gt_s (i32.shl (local.get $r) (i32.const 1)) (local.get $w)) (then (local.set $r (i32.shr_s (local.get $w) (i32.const 1)))))
    (if (i32.gt_s (i32.shl (local.get $r) (i32.const 1)) (local.get $h)) (then (local.set $r (i32.shr_s (local.get $h) (i32.const 1)))))
    (if (i32.le_s (local.get $r) (i32.const 0))
      (then (call $fill (local.get $x) (local.get $y) (local.get $w) (local.get $h) (local.get $c)) (return)))
    ;; the cross between the corners
    (call $fill (i32.add (local.get $x) (local.get $r)) (local.get $y)
                (i32.sub (local.get $w) (i32.shl (local.get $r) (i32.const 1))) (local.get $h) (local.get $c))
    (call $fill (local.get $x) (i32.add (local.get $y) (local.get $r))
                (local.get $r) (i32.sub (local.get $h) (i32.shl (local.get $r) (i32.const 1))) (local.get $c))
    (call $fill (i32.sub (i32.add (local.get $x) (local.get $w)) (local.get $r)) (i32.add (local.get $y) (local.get $r))
                (local.get $r) (i32.sub (local.get $h) (i32.shl (local.get $r) (i32.const 1))) (local.get $c))
    ;; the four corners, by distance to each corner's circle
    (local.set $rf (f32.convert_i32_s (local.get $r)))
    (loop $jl
      (local.set $i (i32.const 0))
      (loop $il
        (local.set $d (f32.sqrt (f32.add
          (f32.mul (f32.sub (local.get $rf) (f32.add (f32.convert_i32_s (local.get $i)) (f32.const 0.5)))
                   (f32.sub (local.get $rf) (f32.add (f32.convert_i32_s (local.get $i)) (f32.const 0.5))))
          (f32.mul (f32.sub (local.get $rf) (f32.add (f32.convert_i32_s (local.get $j)) (f32.const 0.5)))
                   (f32.sub (local.get $rf) (f32.add (f32.convert_i32_s (local.get $j)) (f32.const 0.5)))))))
        (local.set $px (call $cov (f32.add (f32.sub (local.get $rf) (local.get $d)) (f32.const 0.5))))
        (if (local.get $px)
          (then
            (call $plot (i32.add (local.get $x) (local.get $i)) (i32.add (local.get $y) (local.get $j)) (local.get $c) (local.get $px))
            (call $plot (i32.sub (i32.add (local.get $x) (local.get $w)) (i32.add (local.get $i) (i32.const 1)))
                        (i32.add (local.get $y) (local.get $j)) (local.get $c) (local.get $px))
            (call $plot (i32.add (local.get $x) (local.get $i))
                        (i32.sub (i32.add (local.get $y) (local.get $h)) (i32.add (local.get $j) (i32.const 1))) (local.get $c) (local.get $px))
            (call $plot (i32.sub (i32.add (local.get $x) (local.get $w)) (i32.add (local.get $i) (i32.const 1)))
                        (i32.sub (i32.add (local.get $y) (local.get $h)) (i32.add (local.get $j) (i32.const 1))) (local.get $c) (local.get $px))))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br_if $il (i32.lt_s (local.get $i) (local.get $r))))
      (local.set $j (i32.add (local.get $j) (i32.const 1)))
      (br_if $jl (i32.lt_s (local.get $j) (local.get $r)))))

  ;; One blended pixel, clipped.
  (func $plot (param $x i32) (param $y i32) (param $c i32) (param $cov i32)
    (if (i32.and
          (i32.and (i32.ge_s (local.get $x) (global.get $cx0)) (i32.lt_s (local.get $x) (global.get $cx1)))
          (i32.and (i32.ge_s (local.get $y) (global.get $cy0)) (i32.lt_s (local.get $y) (global.get $cy1))))
      (then (call $blend (call $px_addr (local.get $x) (local.get $y)) (local.get $c) (local.get $cov)))))

  ;; Anti-aliased line segment of width $wd, by distance to the segment.
  (func $line (param $x0 f32) (param $y0 f32) (param $x1 f32) (param $y1 f32) (param $wd f32) (param $c i32)
    (local $bx0 i32) (local $by0 i32) (local $bx1 i32) (local $by1 i32) (local $x i32) (local $y i32)
    (local $dx f32) (local $dy f32) (local $len2 f32) (local $t f32) (local $px f32) (local $py f32) (local $ex f32) (local $ey f32)
    (local $half f32)
    (local.set $half (f32.mul (local.get $wd) (f32.const 0.5)))
    (local.set $bx0 (i32.trunc_sat_f32_s (f32.floor (f32.sub (f32.min (local.get $x0) (local.get $x1)) (f32.add (local.get $half) (f32.const 1))))))
    (local.set $by0 (i32.trunc_sat_f32_s (f32.floor (f32.sub (f32.min (local.get $y0) (local.get $y1)) (f32.add (local.get $half) (f32.const 1))))))
    (local.set $bx1 (i32.trunc_sat_f32_s (f32.ceil (f32.add (f32.max (local.get $x0) (local.get $x1)) (f32.add (local.get $half) (f32.const 1))))))
    (local.set $by1 (i32.trunc_sat_f32_s (f32.ceil (f32.add (f32.max (local.get $y0) (local.get $y1)) (f32.add (local.get $half) (f32.const 1))))))
    (local.set $dx (f32.sub (local.get $x1) (local.get $x0)))
    (local.set $dy (f32.sub (local.get $y1) (local.get $y0)))
    (local.set $len2 (f32.max (f32.const 0.0001) (f32.add (f32.mul (local.get $dx) (local.get $dx)) (f32.mul (local.get $dy) (local.get $dy)))))
    (local.set $y (local.get $by0))
    (block $yd
      (loop $yl
        (br_if $yd (i32.ge_s (local.get $y) (local.get $by1)))
        (local.set $py (f32.add (f32.convert_i32_s (local.get $y)) (f32.const 0.5)))
        (local.set $x (local.get $bx0))
        (block $xd
          (loop $xl
            (br_if $xd (i32.ge_s (local.get $x) (local.get $bx1)))
            (local.set $px (f32.add (f32.convert_i32_s (local.get $x)) (f32.const 0.5)))
            (local.set $t (f32.max (f32.const 0) (f32.min (f32.const 1)
              (f32.div (f32.add (f32.mul (f32.sub (local.get $px) (local.get $x0)) (local.get $dx))
                                (f32.mul (f32.sub (local.get $py) (local.get $y0)) (local.get $dy)))
                       (local.get $len2)))))
            (local.set $ex (f32.sub (f32.add (local.get $x0) (f32.mul (local.get $t) (local.get $dx))) (local.get $px)))
            (local.set $ey (f32.sub (f32.add (local.get $y0) (f32.mul (local.get $t) (local.get $dy))) (local.get $py)))
            (call $plot (local.get $x) (local.get $y) (local.get $c)
              (call $cov (f32.add (f32.sub (local.get $half)
                (f32.sqrt (f32.add (f32.mul (local.get $ex) (local.get $ex)) (f32.mul (local.get $ey) (local.get $ey)))))
                (f32.const 0.5))))
            (local.set $x (i32.add (local.get $x) (i32.const 1)))
            (br $xl)))
        (local.set $y (i32.add (local.get $y) (i32.const 1)))
        (br $yl))))

  ;; ---------------------------------------------------------------------
  ;; Font atlas access
  ;; ---------------------------------------------------------------------

  ;; Glyph index for a code point (0 is the missing-glyph box).
  (func $gid (param $cp i32) (result i32)
    (if (i32.ge_u (local.get $cp) (global.get $cmap_n)) (then (return (i32.const 0))))
    (i32.load16_u (i32.add (global.get $cmap) (i32.shl (local.get $cp) (i32.const 1)))))

  (func $face_rec (param $face i32) (result i32)
    (i32.add (global.get $faces) (i32.shl (local.get $face) (i32.const 5))))

  ;; 16-byte glyph record: f32 advance, i16 x, i16 y, u16 w, u16 h, u32 bitmap
  (func $grec (param $face i32) (param $gid i32) (result i32)
    (i32.add
      (i32.add (global.get $FONT) (i32.load offset=20 (call $face_rec (local.get $face))))
      (i32.shl (local.get $gid) (i32.const 4))))

  (func $ascent (param $face i32) (result f32) (f32.load (call $face_rec (local.get $face))))
  (func $descent (param $face i32) (result f32) (f32.load offset=4 (call $face_rec (local.get $face))))

  ;; Kerning between two ASCII characters, in ems.
  (func $kern_em (param $face i32) (param $a i32) (param $b i32) (result f32)
    (if (i32.or (i32.ge_u (i32.sub (local.get $a) (i32.const 32)) (i32.const 95))
                (i32.ge_u (i32.sub (local.get $b) (i32.const 32)) (i32.const 95)))
      (then (return (f32.const 0))))
    (f32.mul
      (f32.convert_i32_s
        (i32.load8_s
          (i32.add (global.get $kern)
            (i32.add (i32.mul (local.get $face) (i32.const 9025))
              (i32.add (i32.mul (i32.sub (local.get $a) (i32.const 32)) (i32.const 95))
                       (i32.sub (local.get $b) (i32.const 32)))))))
      (f32.const 0.001)))

  ;; ---------------------------------------------------------------------
  ;; Glyph cache. A slot is 16 bytes:
  ;;   +0 key (0 = empty)  +4 bitmap  +8 w | h << 16  +12 x | y << 16 (i16)
  ;; x, y place the bitmap's top-left relative to the pen on the baseline.
  ;; ---------------------------------------------------------------------

  (func $cache_clear
    (memory.fill (global.get $GTAB) (i32.const 0) (i32.const 0x20000))
    (global.set $gtop (global.get $GBMP))
    (global.set $gcount (i32.const 0)))

  ;; Cached bitmap for a glyph at a size, rasterizing it on a miss.
  ;; Returns the slot, or 0 for a glyph with no ink (a space).
  (func $glyph (param $face i32) (param $gid i32) (param $size f32) (param $bold i32) (result i32)
    (local $key i32) (local $slot i32) (local $e i32) (local $rec i32) (local $k f32) (local $need i32)
    (local.set $rec (call $grec (local.get $face) (local.get $gid)))
    (if (i32.eqz (i32.load16_u offset=8 (local.get $rec))) (then (return (i32.const 0))))
    (local.set $key
      (i32.or
        (i32.or (i32.add (local.get $face) (i32.const 1)) (i32.shl (local.get $gid) (i32.const 3)))
        (i32.or
          (i32.shl (i32.and (i32.trunc_sat_f32_u (f32.nearest (f32.mul (local.get $size) (f32.const 4)))) (i32.const 0x3FFF))
                   (i32.const 16))
          (i32.shl (local.get $bold) (i32.const 30)))))
    (block $miss
      (loop $again
        (local.set $slot (i32.shr_u (i32.mul (local.get $key) (i32.const 0x9E3779B1)) (i32.const 19)))
        (loop $probe
          (local.set $e (i32.add (global.get $GTAB) (i32.shl (local.get $slot) (i32.const 4))))
          (if (i32.eq (i32.load (local.get $e)) (local.get $key)) (then (return (local.get $e))))
          (br_if $miss (i32.eqz (i32.load (local.get $e))))
          (local.set $slot (i32.and (i32.add (local.get $slot) (i32.const 1)) (i32.const 8191)))
          (br $probe))))
    ;; miss: make sure there is room, else start the cache over
    (local.set $k (f32.div (local.get $size) (global.get $E)))
    (local.set $need
      (i32.mul
        (i32.add (i32.trunc_sat_f32_u (f32.mul (f32.convert_i32_u (i32.load16_u offset=8 (local.get $rec))) (local.get $k))) (i32.const 2))
        (i32.add (i32.trunc_sat_f32_u (f32.mul (f32.convert_i32_u (i32.load16_u offset=10 (local.get $rec))) (local.get $k))) (i32.const 2))))
    (if (i32.or (i32.gt_u (global.get $gcount) (i32.const 6000))
                (i32.gt_u (i32.add (global.get $gtop) (local.get $need)) (global.get $GBMP_END)))
      (then
        (call $cache_clear)
        (local.set $slot (i32.shr_u (i32.mul (local.get $key) (i32.const 0x9E3779B1)) (i32.const 19)))
        (local.set $e (i32.add (global.get $GTAB) (i32.shl (local.get $slot) (i32.const 4))))))
    (i32.store (local.get $e) (local.get $key))
    (call $raster (local.get $rec) (local.get $size) (local.get $bold) (local.get $e))
    (global.set $gcount (i32.add (global.get $gcount) (i32.const 1)))
    (local.get $e))

  ;; Rasterize a glyph's distance field at $size px into the cache.
  ;; Each output pixel samples the field bilinearly; the distance to the
  ;; outline in pixels, plus half a pixel, is its coverage.
  (func $raster (param $rec i32) (param $size f32) (param $bold i32) (param $e i32)
    (local $tw i32) (local $th i32) (local $tex i32) (local $k f32) (local $fx0 f32) (local $fy0 f32)
    (local $ox i32) (local $oy i32) (local $fx f32) (local $fy f32) (local $ow i32) (local $oh i32)
    (local $i i32) (local $j i32) (local $u f32) (local $v f32) (local $u0 i32) (local $v0 i32) (local $tu f32) (local $tv f32)
    (local $s00 f32) (local $s10 f32) (local $s01 f32) (local $s11 f32) (local $s f32) (local $dscale f32) (local $bias f32)
    (local $dst i32) (local $row i32)
    (local.set $tw (i32.load16_u offset=8 (local.get $rec)))
    (local.set $th (i32.load16_u offset=10 (local.get $rec)))
    (local.set $tex (i32.add (global.get $FONT) (i32.load offset=12 (local.get $rec))))
    (local.set $k (f32.div (local.get $size) (global.get $E)))
    (local.set $fx0 (f32.mul (f32.convert_i32_s (i32.load16_s offset=4 (local.get $rec))) (local.get $k)))
    (local.set $fy0 (f32.mul (f32.convert_i32_s (i32.load16_s offset=6 (local.get $rec))) (local.get $k)))
    (local.set $ox (i32.trunc_sat_f32_s (f32.floor (local.get $fx0))))
    (local.set $oy (i32.trunc_sat_f32_s (f32.floor (local.get $fy0))))
    (local.set $fx (f32.sub (local.get $fx0) (f32.convert_i32_s (local.get $ox))))
    (local.set $fy (f32.sub (local.get $fy0) (f32.convert_i32_s (local.get $oy))))
    (local.set $ow (i32.trunc_sat_f32_s (f32.ceil (f32.add (f32.mul (f32.convert_i32_u (local.get $tw)) (local.get $k)) (local.get $fx)))))
    (local.set $oh (i32.trunc_sat_f32_s (f32.ceil (f32.add (f32.mul (f32.convert_i32_u (local.get $th)) (local.get $k)) (local.get $fy)))))
    ;; field units to output pixels
    (local.set $dscale (f32.mul (f32.div (global.get $S) (f32.const 127)) (local.get $k)))
    (local.set $bias (f32.add (f32.const 0.5) (global.get $emb)))
    (if (local.get $bold) (then (local.set $bias (f32.add (local.get $bias) (f32.mul (local.get $size) (f32.const 0.03))))))
    (local.set $dst (global.get $gtop))
    (block $jd
      (loop $jl
        (br_if $jd (i32.ge_s (local.get $j) (local.get $oh)))
        (local.set $v (f32.sub (f32.div (f32.sub (f32.add (f32.convert_i32_s (local.get $j)) (f32.const 0.5)) (local.get $fy)) (local.get $k)) (f32.const 0.5)))
        (local.set $v0 (i32.trunc_sat_f32_s (f32.floor (local.get $v))))
        (local.set $tv (f32.sub (local.get $v) (f32.convert_i32_s (local.get $v0))))
        (local.set $i (i32.const 0))
        (block $id
          (loop $il
            (br_if $id (i32.ge_s (local.get $i) (local.get $ow)))
            (local.set $u (f32.sub (f32.div (f32.sub (f32.add (f32.convert_i32_s (local.get $i)) (f32.const 0.5)) (local.get $fx)) (local.get $k)) (f32.const 0.5)))
            (local.set $u0 (i32.trunc_sat_f32_s (f32.floor (local.get $u))))
            (local.set $tu (f32.sub (local.get $u) (f32.convert_i32_s (local.get $u0))))
            (local.set $s00 (call $texel (local.get $tex) (local.get $tw) (local.get $th) (local.get $u0) (local.get $v0)))
            (local.set $s10 (call $texel (local.get $tex) (local.get $tw) (local.get $th) (i32.add (local.get $u0) (i32.const 1)) (local.get $v0)))
            (local.set $s01 (call $texel (local.get $tex) (local.get $tw) (local.get $th) (local.get $u0) (i32.add (local.get $v0) (i32.const 1))))
            (local.set $s11 (call $texel (local.get $tex) (local.get $tw) (local.get $th) (i32.add (local.get $u0) (i32.const 1)) (i32.add (local.get $v0) (i32.const 1))))
            (local.set $s
              (f32.add
                (f32.mul (f32.add (local.get $s00) (f32.mul (f32.sub (local.get $s10) (local.get $s00)) (local.get $tu)))
                         (f32.sub (f32.const 1) (local.get $tv)))
                (f32.mul (f32.add (local.get $s01) (f32.mul (f32.sub (local.get $s11) (local.get $s01)) (local.get $tu)))
                         (local.get $tv))))
            (i32.store8 (i32.add (local.get $dst) (local.get $i))
              (call $cov (f32.add (f32.mul (f32.sub (local.get $s) (f32.const 128)) (local.get $dscale)) (local.get $bias))))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $il)))
        (local.set $dst (i32.add (local.get $dst) (local.get $ow)))
        (local.set $j (i32.add (local.get $j) (i32.const 1)))
        (br $jl)))
    (i32.store offset=4 (local.get $e) (global.get $gtop))
    (i32.store offset=8 (local.get $e) (i32.or (local.get $ow) (i32.shl (local.get $oh) (i32.const 16))))
    (i32.store offset=12 (local.get $e) (i32.or (i32.and (local.get $ox) (i32.const 0xFFFF)) (i32.shl (local.get $oy) (i32.const 16))))
    (global.set $gtop (local.get $dst)))

  ;; A distance field texel; outside the cell is "far outside".
  (func $texel (param $tex i32) (param $tw i32) (param $th i32) (param $u i32) (param $v i32) (result f32)
    (if (i32.or (i32.ge_u (local.get $u) (local.get $tw)) (i32.ge_u (local.get $v) (local.get $th)))
      (then (return (f32.const 0))))
    (f32.convert_i32_u (i32.load8_u (i32.add (local.get $tex) (i32.add (i32.mul (local.get $v) (local.get $tw)) (local.get $u))))))

  ;; Blend a cached glyph with its pen at (x, y) on the baseline.
  (func $blit (param $e i32) (param $x i32) (param $y i32) (param $c i32)
    (local $src i32) (local $w i32) (local $h i32) (local $gx i32) (local $gy i32)
    (local $i0 i32) (local $i1 i32) (local $j i32) (local $j1 i32) (local $i i32) (local $a i32) (local $s i32) (local $d i32)
    (local.set $src (i32.load offset=4 (local.get $e)))
    (local.set $w (i32.and (i32.load offset=8 (local.get $e)) (i32.const 0xFFFF)))
    (local.set $h (i32.shr_u (i32.load offset=8 (local.get $e)) (i32.const 16)))
    (local.set $gx (i32.add (local.get $x) (i32.load16_s offset=12 (local.get $e))))
    (local.set $gy (i32.add (local.get $y) (i32.load16_s offset=14 (local.get $e))))
    ;; clip in bitmap coordinates
    (local.set $i0 (i32.sub (global.get $cx0) (local.get $gx)))
    (if (i32.lt_s (local.get $i0) (i32.const 0)) (then (local.set $i0 (i32.const 0))))
    (local.set $i1 (i32.sub (global.get $cx1) (local.get $gx)))
    (if (i32.gt_s (local.get $i1) (local.get $w)) (then (local.set $i1 (local.get $w))))
    (local.set $j (i32.sub (global.get $cy0) (local.get $gy)))
    (if (i32.lt_s (local.get $j) (i32.const 0)) (then (local.set $j (i32.const 0))))
    (local.set $j1 (i32.sub (global.get $cy1) (local.get $gy)))
    (if (i32.gt_s (local.get $j1) (local.get $h)) (then (local.set $j1 (local.get $h))))
    (block $jd
      (loop $jl
        (br_if $jd (i32.ge_s (local.get $j) (local.get $j1)))
        (local.set $s (i32.add (local.get $src) (i32.add (i32.mul (local.get $j) (local.get $w)) (local.get $i0))))
        (local.set $d (call $px_addr (i32.add (local.get $gx) (local.get $i0)) (i32.add (local.get $gy) (local.get $j))))
        (local.set $i (local.get $i0))
        (block $id
          (loop $il
            (br_if $id (i32.ge_s (local.get $i) (local.get $i1)))
            (local.set $a (i32.load8_u (local.get $s)))
            (if (local.get $a) (then (call $blend (local.get $d) (local.get $c) (local.get $a))))
            (local.set $s (i32.add (local.get $s) (i32.const 1)))
            (local.set $d (i32.add (local.get $d) (i32.const 4)))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $il)))
        (local.set $j (i32.add (local.get $j) (i32.const 1)))
        (br $jl))))

  ;; Draw code point $cp with its pen at (x, y). Faux bold only for faces
  ;; that have no real bold (code).
  (func $draw_cp (param $cp i32) (param $face i32) (param $size f32) (param $bold i32) (param $x i32) (param $y i32) (param $c i32)
    (local $e i32)
    (local.set $e (call $glyph (local.get $face) (call $gid (local.get $cp)) (local.get $size) (local.get $bold)))
    (if (local.get $e) (then (call $blit (local.get $e) (local.get $x) (local.get $y) (local.get $c)))))

  ;; ---------------------------------------------------------------------
  ;; Text measuring
  ;; ---------------------------------------------------------------------

  ;; Face for a character with marks $m in a block of type $t:
  ;; 0 serif, 1 bold, 2 italic, 3 bold italic, 4 mono.
  (func $face_for (param $t i32) (param $m i32) (result i32)
    (if (i32.or (i32.eq (local.get $t) (i32.const 8)) (i32.ne (i32.and (local.get $m) (i32.const 16)) (i32.const 0)))
      (then (return (i32.const 4))))
    (i32.or
      (select (i32.const 1) (i32.const 0)
        (i32.or (i32.ne (i32.and (local.get $m) (i32.const 1)) (i32.const 0))
                (i32.eq (i32.load offset=8 (call $style (local.get $t))) (i32.const 1))))
      (select (i32.const 2) (i32.const 0) (i32.ne (i32.and (local.get $m) (i32.const 2)) (i32.const 0)))))

  ;; Font size in px for a character with marks $m in a block of type $t.
  (func $size_for (param $t i32) (param $m i32) (result f32)
    (local $s f32)
    (local.set $s (f32.mul (f32.load (call $style (local.get $t))) (global.get $scale)))
    (if (result f32) (i32.and (i32.ne (i32.and (local.get $m) (i32.const 16)) (i32.const 0))
                              (i32.ne (local.get $t) (i32.const 8)))
      (then (f32.mul (local.get $s) (f32.const 0.88)))
      (else (local.get $s))))

  (func $marks_of (param $c i32) (result i32)
    (select (i32.const 0) (i32.and (i32.shr_u (local.get $c) (i32.const 16)) (i32.const 31)) (call $is_nl (local.get $c))))

  ;; Advance in px of cell $c followed by cell $next, in a block of type $t.
  ;; The same function measures for layout, drawing and hit testing.
  (func $adv (param $c i32) (param $next i32) (param $t i32) (result f32)
    (local $ch i32) (local $m i32) (local $face i32) (local $size f32) (local $a f32) (local $n i32)
    (local.set $ch (i32.and (local.get $c) (i32.const 0xFFFF)))
    (local.set $m (call $marks_of (local.get $c)))
    (local.set $face (call $face_for (local.get $t) (local.get $m)))
    (local.set $size (call $size_for (local.get $t) (local.get $m)))
    ;; the low half of a surrogate pair was drawn with the high half
    (if (i32.eq (i32.and (local.get $ch) (i32.const 0xFC00)) (i32.const 0xDC00)) (then (return (f32.const 0))))
    (if (i32.eq (local.get $ch) (i32.const 9))
      (then (return (f32.mul (f32.mul (f32.load (call $grec (local.get $face) (call $gid (i32.const 32)))) (local.get $size)) (f32.const 4)))))
    (local.set $a (f32.mul (f32.load (call $grec (local.get $face) (call $gid (local.get $ch)))) (local.get $size)))
    ;; kerning only between characters in the same face
    (local.set $n (i32.and (local.get $next) (i32.const 0xFFFF)))
    (if (i32.and (i32.lt_u (local.get $ch) (i32.const 127)) (i32.lt_u (local.get $n) (i32.const 127)))
      (then
        (if (i32.eq (call $face_for (local.get $t) (call $marks_of (local.get $next))) (local.get $face))
          (then
            (local.set $a (f32.add (local.get $a)
              (f32.mul (call $kern_em (local.get $face) (local.get $ch) (local.get $n)) (local.get $size))))))))
    (local.get $a))

  ;; Width of interface string $k.
  (func $str_width (param $k i32) (param $face i32) (param $size f32) (result f32)
    (local $p i32) (local $end i32) (local $w f32) (local $cp i32) (local $next i32)
    (local.set $p (call $ui_str (local.get $k)))
    (local.set $end (i32.add (local.get $p) (call $ui_len (local.get $k))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $end)))
        (local.set $cp (call $ui_cp (i32.load8_u (local.get $p))))
        (local.set $next (i32.const 0))
        (if (i32.lt_u (i32.add (local.get $p) (i32.const 1)) (local.get $end))
          (then (local.set $next (i32.load8_u offset=1 (local.get $p)))))
        (local.set $w (f32.add (local.get $w)
          (f32.mul (f32.add (f32.load (call $grec (local.get $face) (call $gid (local.get $cp))))
                            (call $kern_em (local.get $face) (local.get $cp) (local.get $next)))
                   (local.get $size))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $w))

  ;; Draw interface string $k with its pen at (x, y); returns the end x.
  (func $draw_str (param $k i32) (param $face i32) (param $size f32) (param $x f32) (param $y i32) (param $c i32) (result f32)
    (local $p i32) (local $end i32) (local $cp i32) (local $next i32)
    (local.set $p (call $ui_str (local.get $k)))
    (local.set $end (i32.add (local.get $p) (call $ui_len (local.get $k))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $end)))
        (local.set $cp (call $ui_cp (i32.load8_u (local.get $p))))
        (local.set $next (i32.const 0))
        (if (i32.lt_u (i32.add (local.get $p) (i32.const 1)) (local.get $end))
          (then (local.set $next (i32.load8_u offset=1 (local.get $p)))))
        (call $draw_cp (local.get $cp) (local.get $face) (local.get $size) (i32.const 0)
          (i32.trunc_sat_f32_s (f32.nearest (local.get $x))) (local.get $y) (local.get $c))
        (local.set $x (f32.add (local.get $x)
          (f32.mul (f32.add (f32.load (call $grec (local.get $face) (call $gid (local.get $cp))))
                            (call $kern_em (local.get $face) (local.get $cp) (local.get $next)))
                   (local.get $size))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $x))
