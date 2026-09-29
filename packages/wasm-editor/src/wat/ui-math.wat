;; ui-math.wat -- a TeX math typesetter, in the manner of TeX's appendix G.
;;
;; A formula's source (UTF-16 at MSRC) is read by recursive descent straight
;; into boxes: every construct lays out its parts as soon as they are read
;; and emits drawing items for them, so there is no parse tree. An item is
;; 32 bytes at MITEMS, positioned relative to the formula's origin (left
;; end of its baseline, y down):
;;   +0 kind: 1 glyph, 2 rule (filled rectangle), 3 stroke (line segment)
;;   +4 x  +8 y (f32, px)
;;   glyph   +12 code point  +16 face  +20 size (f32)  +24 flags: 1 faux
;;           bold, 2 an error (drawn in the error colour)
;;   rule    +12 w  +16 h (f32)
;;   stroke  +12 x1  +16 y1  +20 width (f32)
;; A box is a run of consecutive items plus its width, height and depth
;; ($bw, $bh, $bd). Putting boxes together only moves item runs.
;;
;; A list of atoms ($m_list) is laid out once it is complete: each atom
;; (32 bytes on MSTK: item start, type, w, h, d, italic correction, flags)
;; gets its TeX class, binary operators that cannot be binary become
;; ordinary, and the spaces between classes come from TeX's table (thin,
;; medium, thick; some only in display and text style).
;;
;; Fonts are KaTeX's Computer Modern faces in the atlas: 6 math italic,
;; 7 roman (operators, relations, arrows, digits), 8 and 9 the large
;; operators and delimiters (text and display size), 10 AMS (blackboard
;; bold), 11 calligraphic, 12 bold; \text uses the document's own faces.
;; Delimiters taller than the fonts' largest, and radical signs, are drawn
;; as strokes. Metrics are the ink boxes of the distance fields, and the
;; spacing parameters (in ems) are cmsy10's.
;;
;; Supported: letters, digits, operators and punctuation with TeX's spacing;
;; about 440 commands (Greek, relations, arrows, binary operators, big
;; operators with limits, \lim-style operator names, accents); ^ _ and ';
;; \frac \dfrac \tfrac \cfrac \binom \sqrt[n]{}; \left \right \middle and
;; \big...\Bigg; \overline \underline \overrightarrow \overset \underset
;; \stackrel \boxed \phantom \not; \mathrm \mathbf \mathit \mathbb
;; \mathcal \mathsf \mathtt \boldsymbol \operatorname \text \textbf...;
;; spaces \, \: \; \! \quad \qquad; \displaystyle and friends; the
;; environments matrix, pmatrix, bmatrix, Bmatrix, vmatrix, Vmatrix,
;; smallmatrix, cases, rcases, dcases, aligned, align, split, gathered,
;; gather, equation and array{lcr}; and at the top level of an equation,
;; lines split by \\ (aligned at & when there are any). Anything else
;; is drawn as its name in the error colour.

  ;; ---------------------------------------------------------------------
  ;; Commands: "name\tKK F CCCC\n" -- kind (hex), face (hex), code (hex).
  ;; Kinds 00-07 are symbols of that TeX class (ord op bin rel open close
  ;; punct inner) drawn as CCCC in face F. The others, with what F and
  ;; CCCC mean for them:
  ;;   10 \frac (F: style, 0 as is, 1 display, 2 text)    11 \binom (F: style)
  ;;   12 \sqrt   13 \left   14 \right   15 \middle
  ;;   16 \big... (F: 1-4 size, CCCC: class)
  ;;   17 big operator, limits in display style (CCCC)    18 integral (CCCC)
  ;;   19 operator name with limits (\lim), 1a without (\sin) (CCCC: class)
  ;;   1b accent (CCCC; F 1: wide)   1c \overline   1d \underline
  ;;   1e font of letters (F: 1 rm, 2 bf, 3 it, 4 bb, 5 cal, 6 sf, 7 tt,
  ;;      8 bold italic, 0 normal)
  ;;   1f text (F: face)   20 space (CCCC: mu, signed)
  ;;   21 \begin  22 \end  23 \limits  24 \nolimits
  ;;   25 \not (CCCC: the relation it negates, 0 for the next atom)
  ;;   26 \overset  27 \underset  28 \stackrel  29 style (F: 0 D .. 3 SS)
  ;;   2a \operatorname  2b \overrightarrow  2c \overleftarrow  2d \phantom
  ;;   2e \mathrel... (CCCC: class)  2f \boxed  30 \substack
  ;;   31 ignored  32 ignored with its argument (\label, \tag)
  ;; ---------------------------------------------------------------------
  (data (i32.const 0x1970000)
    ;; Greek
    "alpha\t00 6 03b1\nbeta\t00 6 03b2\ngamma\t00 6 03b3\ndelta\t00 6 03b4\nepsilon\t00 6 03f5\n"
    "varepsilon\t00 6 03b5\nzeta\t00 6 03b6\neta\t00 6 03b7\ntheta\t00 6 03b8\nvartheta\t00 6 03d1\n"
    "iota\t00 6 03b9\nkappa\t00 6 03ba\nvarkappa\t00 a 03f0\nlambda\t00 6 03bb\nmu\t00 6 03bc\n"
    "nu\t00 6 03bd\nxi\t00 6 03be\nomicron\t00 6 03bf\npi\t00 6 03c0\nvarpi\t00 6 03d6\n"
    "rho\t00 6 03c1\nvarrho\t00 6 03f1\nsigma\t00 6 03c3\nvarsigma\t00 6 03c2\ntau\t00 6 03c4\n"
    "upsilon\t00 6 03c5\nphi\t00 6 03d5\nvarphi\t00 6 03c6\nchi\t00 6 03c7\npsi\t00 6 03c8\n"
    "omega\t00 6 03c9\ndigamma\t00 a 03dd\n"
    "Gamma\t00 7 0393\nDelta\t00 7 0394\nTheta\t00 7 0398\nLambda\t00 7 039b\nXi\t00 7 039e\n"
    "Pi\t00 7 03a0\nSigma\t00 7 03a3\nUpsilon\t00 7 03a5\nPhi\t00 7 03a6\nPsi\t00 7 03a8\nOmega\t00 7 03a9\n"
    "varGamma\t00 6 0393\nvarDelta\t00 6 0394\nvarTheta\t00 6 0398\nvarLambda\t00 6 039b\nvarXi\t00 6 039e\n"
    "varPi\t00 6 03a0\nvarSigma\t00 6 03a3\nvarUpsilon\t00 6 03a5\nvarPhi\t00 6 03a6\nvarPsi\t00 6 03a8\n"
    "varOmega\t00 6 03a9\n"
    ;; ordinary symbols
    "infty\t00 7 221e\npartial\t00 7 2202\nnabla\t00 7 2207\nforall\t00 7 2200\nexists\t00 7 2203\n"
    "nexists\t00 a 2204\nemptyset\t00 7 2205\nvarnothing\t00 7 2205\naleph\t00 7 2135\nhbar\t00 7 210f\n"
    "hslash\t00 a 210f\nell\t00 7 2113\nwp\t00 7 2118\nRe\t00 7 211c\nIm\t00 7 2111\nimath\t00 6 0131\n"
    "jmath\t00 6 0237\nprime\t00 7 2032\nangle\t00 7 2220\nmeasuredangle\t00 a 2221\ntop\t00 7 22a4\n"
    "bot\t00 7 22a5\nneg\t00 7 00ac\nlnot\t00 7 00ac\nflat\t00 7 266d\nnatural\t00 7 266e\nsharp\t00 7 266f\n"
    "clubsuit\t00 7 2663\ndiamondsuit\t00 7 2662\nheartsuit\t00 7 2661\nspadesuit\t00 7 2660\n"
    "triangle\t00 7 25b3\nsquare\t00 a 25a1\nBox\t00 a 25a1\nblacksquare\t00 a 25a0\nlozenge\t00 a 25ca\n"
    "bigstar\t00 a 2605\ncheckmark\t00 a 2713\ncomplement\t00 a 2201\nmho\t00 a 2127\neth\t00 a 00f0\n"
    "Bbbk\t00 a 006b\nbackslash\t00 7 005c\nvert\t00 7 2223\nVert\t00 7 2225\nsurd\t00 7 221a\n"
    "|\t00 7 2225\n$\t00 7 0024\n%\t00 7 0025\n&\t00 7 0026\n#\t00 7 0023\n_\t00 7 005f\n"
    "ldots\t07 7 2026\ndots\t07 7 2026\ncdots\t07 7 22ef\nvdots\t00 7 22ee\nddots\t07 7 22f1\n"
    ;; delimiters
    "{\t04 7 007b\n}\t05 7 007d\nlbrace\t04 7 007b\nrbrace\t05 7 007d\nlangle\t04 7 27e8\n"
    "rangle\t05 7 27e9\nlfloor\t04 7 230a\nrfloor\t05 7 230b\nlceil\t04 7 2308\nrceil\t05 7 2309\n"
    "lvert\t04 7 2223\nrvert\t05 7 2223\nlVert\t04 7 2225\nrVert\t05 7 2225\nlbrack\t04 7 005b\n"
    "rbrack\t05 7 005d\n"
    ;; binary operators
    "pm\t02 7 00b1\nmp\t02 7 2213\ntimes\t02 7 00d7\ndiv\t02 7 00f7\ncdot\t02 7 22c5\nast\t02 7 2217\n"
    "star\t02 7 22c6\ncirc\t02 7 2218\nbullet\t02 7 2219\nsetminus\t02 7 2216\ncup\t02 7 222a\n"
    "cap\t02 7 2229\nsqcup\t02 7 2294\nsqcap\t02 7 2293\nuplus\t02 7 228e\nwedge\t02 7 2227\n"
    "land\t02 7 2227\nvee\t02 7 2228\nlor\t02 7 2228\noplus\t02 7 2295\nominus\t02 7 2296\n"
    "otimes\t02 7 2297\noslash\t02 7 2298\nodot\t02 7 2299\nbigcirc\t02 7 25ef\ndiamond\t02 7 22c4\n"
    "amalg\t02 7 2a3f\nwr\t02 7 2240\ndagger\t02 7 2020\nddagger\t02 7 2021\ntriangleleft\t02 7 25c3\n"
    "triangleright\t02 7 25b9\nbigtriangleup\t02 7 25b3\nbigtriangledown\t02 7 25bd\n"
    "smallsetminus\t02 a 2216\nltimes\t02 a 22c9\nrtimes\t02 a 22ca\nboxplus\t02 a 229e\n"
    "boxtimes\t02 a 22a0\nintercal\t02 a 22ba\nveebar\t02 a 22bb\nlhd\t02 a 22b2\nrhd\t02 a 22b3\n"
    "unlhd\t02 a 22b4\nunrhd\t02 a 22b5\n"
    ;; relations
    "leq\t03 7 2264\nle\t03 7 2264\ngeq\t03 7 2265\nge\t03 7 2265\nequiv\t03 7 2261\napprox\t03 7 2248\n"
    "sim\t03 7 223c\nsimeq\t03 7 2243\ncong\t03 7 2245\npropto\t03 7 221d\nasymp\t03 7 224d\n"
    "doteq\t03 7 2250\nprec\t03 7 227a\nsucc\t03 7 227b\npreceq\t03 7 2aaf\nsucceq\t03 7 2ab0\n"
    "ll\t03 7 226a\ngg\t03 7 226b\nsubset\t03 7 2282\nsupset\t03 7 2283\nsubseteq\t03 7 2286\n"
    "supseteq\t03 7 2287\nsqsubseteq\t03 7 2291\nsqsupseteq\t03 7 2292\nin\t03 7 2208\nni\t03 7 220b\n"
    "owns\t03 7 220b\nmid\t03 7 2223\nparallel\t03 7 2225\nperp\t03 7 22a5\nvdash\t03 7 22a2\n"
    "dashv\t03 7 22a3\nmodels\t03 7 22a8\nsmile\t03 7 2323\nfrown\t03 7 2322\nbowtie\t03 7 22c8\n"
    "Join\t03 7 22c8\nleqslant\t03 a 2a7d\ngeqslant\t03 a 2a7e\nleqq\t03 a 2266\ngeqq\t03 a 2267\n"
    "lesssim\t03 a 2272\ngtrsim\t03 a 2273\nsubsetneq\t03 a 228a\nsupsetneq\t03 a 228b\n"
    "nsubseteq\t03 a 2288\nnsupseteq\t03 a 2289\nnleq\t03 a 2270\nngeq\t03 a 2271\nnless\t03 a 226e\n"
    "ngtr\t03 a 226f\nnmid\t03 a 2224\nnparallel\t03 a 2226\nnsim\t03 a 2241\ntriangleq\t03 a 225c\n"
    "doteqdot\t03 a 2251\nVdash\t03 a 22a9\nvartriangleleft\t03 a 22b2\nvartriangleright\t03 a 22b3\n"
    "multimap\t03 a 22b8\ntherefore\t03 a 2234\nbecause\t03 a 2235\ncolon\t06 7 003a\n"
    ;; arrows
    "leftarrow\t03 7 2190\ngets\t03 7 2190\nrightarrow\t03 7 2192\nto\t03 7 2192\nuparrow\t03 7 2191\n"
    "downarrow\t03 7 2193\nleftrightarrow\t03 7 2194\nupdownarrow\t03 7 2195\nnearrow\t03 7 2197\n"
    "searrow\t03 7 2198\nswarrow\t03 7 2199\nnwarrow\t03 7 2196\nLeftarrow\t03 7 21d0\n"
    "Rightarrow\t03 7 21d2\nUparrow\t03 7 21d1\nDownarrow\t03 7 21d3\nLeftrightarrow\t03 7 21d4\n"
    "Updownarrow\t03 7 21d5\nmapsto\t03 7 21a6\nhookleftarrow\t03 7 21a9\nhookrightarrow\t03 7 21aa\n"
    "leftharpoonup\t03 7 21bc\nleftharpoondown\t03 7 21bd\nrightharpoonup\t03 7 21c0\n"
    "rightharpoondown\t03 7 21c1\nrightleftharpoons\t03 7 21cc\nlongleftarrow\t03 7 27f5\n"
    "longrightarrow\t03 7 27f6\nlongleftrightarrow\t03 7 27f7\nLongleftarrow\t03 7 27f8\n"
    "Longrightarrow\t03 7 27f9\nLongleftrightarrow\t03 7 27fa\nlongmapsto\t03 7 27fc\n"
    "implies\t03 7 27f9\nimpliedby\t03 7 27f8\niff\t03 7 27fa\ntwoheadrightarrow\t03 a 21a0\n"
    "rightarrowtail\t03 a 21a3\nrightsquigarrow\t03 a 21dd\nleadsto\t03 a 21dd\n"
    "circlearrowleft\t03 a 21ba\ncirclearrowright\t03 a 21bb\n"
    ;; negations
    "not\t25 7 0000\nneq\t25 7 003d\nne\t25 7 003d\nnotin\t25 7 2208\n"
    ;; big operators
    "sum\t17 0 2211\nprod\t17 0 220f\ncoprod\t17 0 2210\nbigcup\t17 0 22c3\nbigcap\t17 0 22c2\n"
    "bigvee\t17 0 22c1\nbigwedge\t17 0 22c0\nbigoplus\t17 0 2a01\nbigotimes\t17 0 2a02\n"
    "bigodot\t17 0 2a00\nbiguplus\t17 0 2a04\nbigsqcup\t17 0 2a06\n"
    "int\t18 0 222b\niint\t18 0 222c\niiint\t18 0 222d\noint\t18 0 222e\nintop\t18 0 222b\n"
    ;; operator names
    "lim\t19 0 0001\nliminf\t19 0 0001\nlimsup\t19 0 0001\nmax\t19 0 0001\nmin\t19 0 0001\n"
    "sup\t19 0 0001\ninf\t19 0 0001\ndet\t19 0 0001\ngcd\t19 0 0001\nPr\t19 0 0001\n"
    "sin\t1a 0 0001\ncos\t1a 0 0001\ntan\t1a 0 0001\ncot\t1a 0 0001\nsec\t1a 0 0001\ncsc\t1a 0 0001\n"
    "arcsin\t1a 0 0001\narccos\t1a 0 0001\narctan\t1a 0 0001\nsinh\t1a 0 0001\ncosh\t1a 0 0001\n"
    "tanh\t1a 0 0001\ncoth\t1a 0 0001\nlog\t1a 0 0001\nln\t1a 0 0001\nlg\t1a 0 0001\nexp\t1a 0 0001\n"
    "arg\t1a 0 0001\ndeg\t1a 0 0001\ndim\t1a 0 0001\nhom\t1a 0 0001\nker\t1a 0 0001\nbmod\t1a 0 0002\n"
    ;; accents
    "hat\t1b 0 02c6\ncheck\t1b 0 02c7\ntilde\t1b 0 02dc\nacute\t1b 0 02ca\ngrave\t1b 0 02cb\n"
    "dot\t1b 0 02d9\nddot\t1b 0 00a8\nbreve\t1b 0 02d8\nbar\t1b 0 02c9\nvec\t1b 0 20d7\n"
    "mathring\t1b 0 02da\nwidehat\t1b 1 02c6\nwidetilde\t1b 1 02dc\n"
    "overline\t1c 0 0000\nunderline\t1d 0 0000\n"
    ;; fonts and text
    "mathnormal\t1e 0 0000\nmathrm\t1e 1 0000\nmathbf\t1e 2 0000\nbold\t1e 2 0000\nmathit\t1e 3 0000\n"
    "mathbb\t1e 4 0000\nBbb\t1e 4 0000\nmathcal\t1e 5 0000\nmathsf\t1e 6 0000\nmathtt\t1e 7 0000\n"
    "boldsymbol\t1e 8 0000\nbm\t1e 8 0000\n"
    "text\t1f 0 0000\ntextrm\t1f 0 0000\ntextnormal\t1f 0 0000\ntextup\t1f 0 0000\nmbox\t1f 0 0000\n"
    "textbf\t1f 1 0000\ntextit\t1f 2 0000\ntextsl\t1f 2 0000\nemph\t1f 2 0000\ntexttt\t1f 4 0000\n"
    "textsf\t1f 5 0000\n"
    ;; spaces, in mu (1/18 em)
    ",\t20 0 0003\n:\t20 0 0004\n>\t20 0 0004\n;\t20 0 0005\n!\t20 0 fffd\n \t20 0 0006\n"
    "quad\t20 0 0012\nqquad\t20 0 0024\nenspace\t20 0 0009\nthinspace\t20 0 0003\nmedspace\t20 0 0004\n"
    "thickspace\t20 0 0005\nnegthinspace\t20 0 fffd\nnegmedspace\t20 0 fffc\nnegthickspace\t20 0 fffb\n"
    "space\t20 0 0006\nnobreakspace\t20 0 0006\n"
    ;; structure
    "frac\t10 0 0000\ndfrac\t10 1 0000\ntfrac\t10 2 0000\ncfrac\t10 1 0000\nbinom\t11 0 0000\n"
    "dbinom\t11 1 0000\ntbinom\t11 2 0000\nsqrt\t12 0 0000\nleft\t13 0 0000\nright\t14 0 0000\n"
    "middle\t15 0 0000\n"
    "big\t16 1 0000\nBig\t16 2 0000\nbigg\t16 3 0000\nBigg\t16 4 0000\nbigl\t16 1 0004\nBigl\t16 2 0004\n"
    "biggl\t16 3 0004\nBiggl\t16 4 0004\nbigr\t16 1 0005\nBigr\t16 2 0005\nbiggr\t16 3 0005\n"
    "Biggr\t16 4 0005\nbigm\t16 1 0003\nBigm\t16 2 0003\nbiggm\t16 3 0003\nBiggm\t16 4 0003\n"
    "begin\t21 0 0000\nend\t22 0 0000\nlimits\t23 0 0000\nnolimits\t24 0 0000\n"
    "overset\t26 0 0000\nunderset\t27 0 0000\nstackrel\t28 0 0000\n"
    "displaystyle\t29 0 0000\ntextstyle\t29 1 0000\nscriptstyle\t29 2 0000\nscriptscriptstyle\t29 3 0000\n"
    "operatorname\t2a 0 0000\noverrightarrow\t2b 0 0000\noverleftarrow\t2c 0 0000\nphantom\t2d 0 0000\n"
    "mathord\t2e 0 0000\nmathop\t2e 0 0001\nmathbin\t2e 0 0002\nmathrel\t2e 0 0003\nmathopen\t2e 0 0004\n"
    "mathclose\t2e 0 0005\nmathpunct\t2e 0 0006\nmathinner\t2e 0 0007\nboxed\t2f 0 0000\n"
    "substack\t30 0 0000\nnonumber\t31 0 0000\nnotag\t31 0 0000\n\\\t31 0 0000\nlabel\t32 0 0000\n"
    "tag\t32 0 0000\n"
    "\00")

  ;; Environments: "name\tLLLL RRRR k\n", the delimiters around it and its
  ;; kind: m matrix, s small matrix, c cases, C cases in display style,
  ;; a aligned (r l r l ...), g gathered (centred), r array (from {lcr}).
  (data (i32.const 0x1972000)
    "matrix\t0000 0000 m\npmatrix\t0028 0029 m\nbmatrix\t005b 005d m\nBmatrix\t007b 007d m\n"
    "vmatrix\t007c 007c m\nVmatrix\t2225 2225 m\nsmallmatrix\t0000 0000 s\ncases\t007b 0000 c\n"
    "dcases\t007b 0000 C\nrcases\t0000 007d c\naligned\t0000 0000 a\nalign\t0000 0000 a\n"
    "align*\t0000 0000 a\nsplit\t0000 0000 a\ngathered\t0000 0000 g\ngather\t0000 0000 g\n"
    "gather*\t0000 0000 g\nequation\t0000 0000 g\nequation*\t0000 0000 g\narray\t0000 0000 r\n"
    "\00")

  ;; Space between atoms of classes l and r: row l, column r, in the order
  ;; ord op bin rel open close punct inner. 1 thin, 2 medium, 3 thick;
  ;; +4: only in display and text style.
  (data (i32.const 0x1972800)
    "\00\01\06\07\00\00\00\05"
    "\01\01\00\07\00\00\00\05"
    "\06\06\00\00\06\00\00\06"
    "\07\07\00\00\07\00\00\07"
    "\00\00\00\00\00\00\00\00"
    "\00\01\06\07\00\00\00\05"
    "\05\05\00\05\05\05\05\05"
    "\05\01\06\07\05\00\05\05")

  ;; ---------------------------------------------------------------------
  ;; State
  ;; ---------------------------------------------------------------------

  (global $mp (mut i32) (i32.const 0))       ;; read pointer into MSRC
  (global $me (mut i32) (i32.const 0))       ;; end of the source
  (global $mi (mut i32) (i32.const 0))       ;; items used
  (global $msp (mut i32) (i32.const 0))      ;; top of MSTK
  (global $mdep (mut i32) (i32.const 0))     ;; nesting, to bound recursion
  (global $mbase (mut f32) (f32.const 18))   ;; text-style size, px
  (global $mfont (mut i32) (i32.const 0))    ;; font of letters (kind 1e)
  (global $mleft (mut i32) (i32.const 0))    ;; open \left
  (global $marr (mut i32) (i32.const 0))     ;; open arrays: & and \\ end a list
  (global $merr (mut i32) (i32.const 0))     ;; the formula has an error

  ;; the box just built
  (global $bw (mut f32) (f32.const 0))
  (global $bh (mut f32) (f32.const 0))
  (global $bd (mut f32) (f32.const 0))
  (global $bic (mut f32) (f32.const 0))      ;; italic correction
  (global $bchar (mut i32) (i32.const 0))    ;; a single character
  (global $btype (mut i32) (i32.const 0))    ;; its class, as an atom
  (global $blim (mut i32) (i32.const 0))     ;; an operator taking limits

  ;; a glyph's metrics, px: advance, height, depth, ink left and right
  (global $gw (mut f32) (f32.const 0))
  (global $gh (mut f32) (f32.const 0))
  (global $gd (mut f32) (f32.const 0))
  (global $gl (mut f32) (f32.const 0))
  (global $gr (mut f32) (f32.const 0))

  ;; a command's name, and its table record
  (global $cn_a (mut i32) (i32.const 0))
  (global $cn_n (mut i32) (i32.const 0))

  ;; ---------------------------------------------------------------------
  ;; Reading the source
  ;; ---------------------------------------------------------------------

  ;; The unit at the read pointer, -1 at the end.
  (func $m_peek (result i32)
    (if (result i32) (i32.ge_u (global.get $mp) (global.get $me))
      (then (i32.const -1))
      (else (i32.load16_u (global.get $mp)))))

  (func $m_peek_at (param $k i32) (result i32)
    (local $a i32)
    (local.set $a (i32.add (global.get $mp) (i32.shl (local.get $k) (i32.const 1))))
    (if (result i32) (i32.ge_u (local.get $a) (global.get $me))
      (then (i32.const -1))
      (else (i32.load16_u (local.get $a)))))

  (func $m_adv
    (if (i32.lt_u (global.get $mp) (global.get $me))
      (then (global.set $mp (i32.add (global.get $mp) (i32.const 2))))))

  (func $is_letter (param $c i32) (result i32)
    (i32.lt_u (i32.sub (i32.or (local.get $c) (i32.const 32)) (i32.const 97)) (i32.const 26)))

  ;; Skip spaces, newlines and % comments.
  (func $m_skip
    (local $c i32)
    (loop $l
      (local.set $c (call $m_peek))
      (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 9)))
                  (i32.or (i32.eq (local.get $c) (i32.const 10)) (i32.eq (local.get $c) (i32.const 13))))
        (then (call $m_adv) (br $l)))
      (if (i32.eq (local.get $c) (i32.const 37))
        (then
          (block $d
            (loop $cl
              (local.set $c (call $m_peek))
              (br_if $d (i32.or (i32.eq (local.get $c) (i32.const -1)) (i32.eq (local.get $c) (i32.const 10))))
              (call $m_adv)
              (br $cl)))
          (br $l)))))

  ;; At "\": read the command's name (a run of letters, or one other
  ;; character) into $cn_a / $cn_n; spaces after a word are skipped.
  (func $m_read_name
    (call $m_adv)
    (global.set $cn_a (global.get $mp))
    (global.set $cn_n (i32.const 0))
    (if (i32.eq (call $m_peek) (i32.const -1)) (then (return)))
    (if (i32.eqz (call $is_letter (call $m_peek)))
      (then (call $m_adv) (global.set $cn_n (i32.const 1)) (return)))
    (block $d
      (loop $l
        (br_if $d (i32.eqz (call $is_letter (call $m_peek))))
        (call $m_adv)
        (global.set $cn_n (i32.add (global.get $cn_n) (i32.const 1)))
        (br $l)))
    (call $m_skip))

  ;; Hex digits at $p.
  (func $hexn (param $p i32) (param $n i32) (result i32)
    (local $v i32) (local $c i32)
    (block $d
      (loop $l
        (br_if $d (i32.eqz (local.get $n)))
        (local.set $c (i32.load8_u (local.get $p)))
        (local.set $v (i32.or (i32.shl (local.get $v) (i32.const 4))
          (select (i32.sub (local.get $c) (i32.const 87)) (i32.sub (local.get $c) (i32.const 48))
                  (i32.ge_u (local.get $c) (i32.const 97)))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (local.set $n (i32.sub (local.get $n) (i32.const 1)))
        (br $l)))
    (local.get $v))

  ;; The record for the $n-unit name at $a in the table at $t: the address
  ;; of its fields (after the tab), or 0.
  (func $m_lookup_in (param $t i32) (param $a i32) (param $n i32) (result i32)
    (local $p i32) (local $k i32)
    (local.set $p (local.get $t))
    (block $miss
      (loop $rec
        (br_if $miss (i32.eqz (i32.load8_u (local.get $p))))
        (local.set $k (i32.const 0))
        (block $no
          (loop $cmp
            (if (i32.ge_u (local.get $k) (local.get $n))
              (then
                (if (i32.eq (i32.load8_u (i32.add (local.get $p) (local.get $k))) (i32.const 9))
                  (then (return (i32.add (i32.add (local.get $p) (local.get $k)) (i32.const 1)))))
                (br $no)))
            (br_if $no (i32.ne (i32.load8_u (i32.add (local.get $p) (local.get $k)))
                               (i32.load16_u (i32.add (local.get $a) (i32.shl (local.get $k) (i32.const 1))))))
            (local.set $k (i32.add (local.get $k) (i32.const 1)))
            (br $cmp)))
        ;; on to the next line
        (loop $skip
          (local.set $k (i32.load8_u (local.get $p)))
          (local.set $p (i32.add (local.get $p) (i32.const 1)))
          (br_if $skip (i32.ne (local.get $k) (i32.const 10))))
        (br $rec)))
    (i32.const 0))

  (func $m_lookup (param $a i32) (param $n i32) (result i32)
    (call $m_lookup_in (global.get $MTAB) (local.get $a) (local.get $n)))

  (func $f_kind (param $f i32) (result i32) (call $hexn (local.get $f) (i32.const 2)))
  (func $f_face (param $f i32) (result i32) (call $hexn (i32.add (local.get $f) (i32.const 3)) (i32.const 1)))
  (func $f_cp (param $f i32) (result i32) (call $hexn (i32.add (local.get $f) (i32.const 5)) (i32.const 4)))

  ;; The symbol drawn as code point $cp (for symbols typed as themselves,
  ;; like "≤"): its fields, or 0.
  (func $m_lookup_cp (param $cp i32) (result i32)
    (local $p i32) (local $f i32)
    (local.set $p (global.get $MTAB))
    (block $miss
      (loop $rec
        (br_if $miss (i32.eqz (i32.load8_u (local.get $p))))
        (loop $name
          (local.set $f (i32.load8_u (local.get $p)))
          (local.set $p (i32.add (local.get $p) (i32.const 1)))
          (br_if $name (i32.ne (local.get $f) (i32.const 9))))
        (if (i32.and (i32.lt_u (call $f_kind (local.get $p)) (i32.const 8))
                     (i32.eq (call $f_cp (local.get $p)) (local.get $cp)))
          (then (return (local.get $p))))
        (local.set $p (i32.add (local.get $p) (i32.const 10)))
        (br $rec)))
    (i32.const 0))

  ;; ---------------------------------------------------------------------
  ;; Items
  ;; ---------------------------------------------------------------------

  ;; A new item of $kind at the origin; 0 when the formula is too big.
  (func $mi_new (param $kind i32) (result i32)
    (local $a i32)
    (if (i32.ge_u (global.get $mi) (global.get $MI_MAX)) (then (return (i32.const 0))))
    (local.set $a (i32.add (global.get $MITEMS) (i32.shl (global.get $mi) (i32.const 5))))
    (global.set $mi (i32.add (global.get $mi) (i32.const 1)))
    (memory.fill (local.get $a) (i32.const 0) (i32.const 32))
    (i32.store (local.get $a) (local.get $kind))
    (local.get $a))

  (func $mi_glyph (param $cp i32) (param $face i32) (param $size f32) (param $flags i32)
    (local $a i32)
    (local.set $a (call $mi_new (i32.const 1)))
    (if (i32.eqz (local.get $a)) (then (return)))
    (i32.store offset=12 (local.get $a) (local.get $cp))
    (i32.store offset=16 (local.get $a) (local.get $face))
    (f32.store offset=20 (local.get $a) (local.get $size))
    (i32.store offset=24 (local.get $a) (local.get $flags)))

  (func $mi_rule (param $x f32) (param $y f32) (param $w f32) (param $h f32)
    (local $a i32)
    (local.set $a (call $mi_new (i32.const 2)))
    (if (i32.eqz (local.get $a)) (then (return)))
    (f32.store offset=4 (local.get $a) (local.get $x))
    (f32.store offset=8 (local.get $a) (local.get $y))
    (f32.store offset=12 (local.get $a) (local.get $w))
    (f32.store offset=16 (local.get $a) (local.get $h)))

  (func $mi_seg (param $x0 f32) (param $y0 f32) (param $x1 f32) (param $y1 f32) (param $wd f32)
    (local $a i32)
    (local.set $a (call $mi_new (i32.const 3)))
    (if (i32.eqz (local.get $a)) (then (return)))
    (f32.store offset=4 (local.get $a) (local.get $x0))
    (f32.store offset=8 (local.get $a) (local.get $y0))
    (f32.store offset=12 (local.get $a) (local.get $x1))
    (f32.store offset=16 (local.get $a) (local.get $y1))
    (f32.store offset=20 (local.get $a) (local.get $wd)))

  ;; Move items [i0, i1) by (dx, dy).
  (func $mi_shift (param $i0 i32) (param $i1 i32) (param $dx f32) (param $dy f32)
    (local $a i32) (local $end i32)
    (local.set $a (i32.add (global.get $MITEMS) (i32.shl (local.get $i0) (i32.const 5))))
    (local.set $end (i32.add (global.get $MITEMS) (i32.shl (local.get $i1) (i32.const 5))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $a) (local.get $end)))
        (f32.store offset=4 (local.get $a) (f32.add (f32.load offset=4 (local.get $a)) (local.get $dx)))
        (f32.store offset=8 (local.get $a) (f32.add (f32.load offset=8 (local.get $a)) (local.get $dy)))
        (if (i32.eq (i32.load (local.get $a)) (i32.const 3))
          (then
            (f32.store offset=12 (local.get $a) (f32.add (f32.load offset=12 (local.get $a)) (local.get $dx)))
            (f32.store offset=16 (local.get $a) (f32.add (f32.load offset=16 (local.get $a)) (local.get $dy)))))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $l))))

  ;; Mark items [i0, i1) as errors.
  (func $mi_error (param $i0 i32) (param $i1 i32)
    (local $a i32)
    (global.set $merr (i32.const 1))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i0) (local.get $i1)))
        (local.set $a (i32.add (global.get $MITEMS) (i32.shl (local.get $i0) (i32.const 5))))
        (if (i32.eq (i32.load (local.get $a)) (i32.const 1))
          (then (i32.store offset=24 (local.get $a) (i32.or (i32.load offset=24 (local.get $a)) (i32.const 2)))))
        (local.set $i0 (i32.add (local.get $i0) (i32.const 1)))
        (br $l))))

  ;; ---------------------------------------------------------------------
  ;; Sizes and metrics
  ;; ---------------------------------------------------------------------

  ;; Styles: 0 display, 1 text, 2 script, 3 scriptscript; +4 cramped.
  (func $st_size (param $st i32) (result f32)
    (local.set $st (i32.and (local.get $st) (i32.const 3)))
    (f32.mul (global.get $mbase)
      (select (f32.const 1) (select (f32.const 0.7) (f32.const 0.5) (i32.eq (local.get $st) (i32.const 2)))
              (i32.le_u (local.get $st) (i32.const 1)))))

  (func $st_sup (param $st i32) (result i32)
    (i32.or (select (i32.const 2) (i32.const 3) (i32.le_u (i32.and (local.get $st) (i32.const 3)) (i32.const 1)))
            (i32.and (local.get $st) (i32.const 4))))

  (func $st_sub (param $st i32) (result i32)
    (i32.or (call $st_sup (local.get $st)) (i32.const 4)))

  (func $st_num (param $st i32) (result i32)
    (local $s i32)
    (local.set $s (i32.add (i32.and (local.get $st) (i32.const 3)) (i32.const 1)))
    (i32.or (select (i32.const 3) (local.get $s) (i32.gt_u (local.get $s) (i32.const 3)))
            (i32.and (local.get $st) (i32.const 4))))

  (func $is_display (param $st i32) (result i32)
    (i32.eqz (i32.and (local.get $st) (i32.const 3))))

  ;; Metrics of $cp in $face at $size into $gw $gh $gd $gl $gr, from the
  ;; glyph's cell in the atlas (the ink box, give or take a texel).
  (func $gmet (param $cp i32) (param $face i32) (param $size f32)
    (local $rec i32) (local $k f32) (local $x f32) (local $y f32)
    (local.set $rec (call $grec (local.get $face) (call $gid (local.get $cp))))
    (local.set $k (f32.div (local.get $size) (global.get $E)))
    (global.set $gw (f32.mul (f32.load (local.get $rec)) (local.get $size)))
    (if (i32.eqz (i32.load16_u offset=8 (local.get $rec)))
      (then
        (global.set $gh (f32.const 0))
        (global.set $gd (f32.const 0))
        (global.set $gl (f32.const 0))
        (global.set $gr (f32.const 0))
        (return)))
    (local.set $x (f32.convert_i32_s (i32.load16_s offset=4 (local.get $rec))))
    (local.set $y (f32.convert_i32_s (i32.load16_s offset=6 (local.get $rec))))
    (global.set $gl (f32.mul (f32.add (local.get $x) (global.get $S)) (local.get $k)))
    (global.set $gr (f32.mul (f32.sub (f32.add (local.get $x) (f32.convert_i32_u (i32.load16_u offset=8 (local.get $rec))))
                                      (global.get $S))
                             (local.get $k)))
    (global.set $gh (f32.mul (f32.neg (f32.add (local.get $y) (global.get $S))) (local.get $k)))
    (global.set $gd (f32.mul (f32.sub (f32.add (local.get $y) (f32.convert_i32_u (i32.load16_u offset=10 (local.get $rec))))
                                      (global.get $S))
                             (local.get $k))))

  ;; An empty box.
  (func $box0
    (global.set $bw (f32.const 0))
    (global.set $bh (f32.const 0))
    (global.set $bd (f32.const 0))
    (global.set $bic (f32.const 0))
    (global.set $bchar (i32.const 0))
    (global.set $btype (i32.const 0))
    (global.set $blim (i32.const 0)))

  ;; A box of one glyph, as a character.
  (func $m_glyph (param $cp i32) (param $face i32) (param $size f32) (param $flags i32)
    (call $gmet (local.get $cp) (local.get $face) (local.get $size))
    (call $mi_glyph (local.get $cp) (local.get $face) (local.get $size) (local.get $flags))
    (global.set $bw (global.get $gw))
    (global.set $bh (global.get $gh))
    (global.set $bd (global.get $gd))
    (global.set $bic (f32.max (f32.const 0) (f32.sub (global.get $gr) (global.get $gw))))
    (global.set $bchar (i32.const 1))
    (global.set $blim (i32.const 0)))

  ;; A glyph centred on the math axis (big operators, delimiters).
  (func $m_glyph_axis (param $cp i32) (param $face i32) (param $size f32) (param $axis f32)
    (local $y f32)
    (call $gmet (local.get $cp) (local.get $face) (local.get $size))
    (local.set $y (f32.sub (f32.mul (f32.sub (global.get $gh) (global.get $gd)) (f32.const 0.5)) (local.get $axis)))
    (call $mi_glyph (local.get $cp) (local.get $face) (local.get $size) (i32.const 0))
    (call $mi_shift (i32.sub (global.get $mi) (i32.const 1)) (global.get $mi) (f32.const 0) (local.get $y))
    (global.set $bw (global.get $gw))
    (global.set $bh (f32.sub (global.get $gh) (local.get $y)))
    (global.set $bd (f32.add (global.get $gd) (local.get $y)))
    (global.set $bic (f32.max (f32.const 0) (f32.sub (global.get $gr) (global.get $gw))))
    (global.set $bchar (i32.const 0))
    (global.set $blim (i32.const 0)))

  ;; ---------------------------------------------------------------------
  ;; Lists of atoms
  ;;
  ;; Atom records on MSTK, 32 bytes: +0 first item, +4 class (0-7; 8 is a
  ;; space, which classes skip over), +8 w, +12 h, +16 d, +20 italic
  ;; correction (f32), +24 flags: 1 a single character, 2 an operator that
  ;; takes limits in display style, 4 \limits, 8 \nolimits, 16 has scripts.
  ;; ---------------------------------------------------------------------

  ;; Push the box just built, whose items start at $i0, as an atom.
  ;; Returns the record, or 0 when the stack is full.
  (func $m_push (param $i0 i32) (result i32)
    (local $a i32)
    (local.set $a (global.get $msp))
    (if (i32.gt_u (i32.add (local.get $a) (i32.const 32)) (global.get $MSTK_END)) (then (return (i32.const 0))))
    (i32.store (local.get $a) (local.get $i0))
    (i32.store offset=4 (local.get $a) (global.get $btype))
    (f32.store offset=8 (local.get $a) (global.get $bw))
    (f32.store offset=12 (local.get $a) (global.get $bh))
    (f32.store offset=16 (local.get $a) (global.get $bd))
    (f32.store offset=20 (local.get $a) (global.get $bic))
    (i32.store offset=24 (local.get $a)
      (i32.or (global.get $bchar) (i32.shl (global.get $blim) (i32.const 1))))
    (global.set $msp (i32.add (local.get $a) (i32.const 32)))
    (local.get $a))

  ;; Space between classes $l and $r in style $st.
  (func $m_space (param $l i32) (param $r i32) (param $st i32) (result f32)
    (local $v i32)
    (local.set $v (i32.load8_u (i32.add (i32.add (global.get $MTAB) (i32.const 0x2800))
                                        (i32.add (i32.shl (local.get $l) (i32.const 3)) (local.get $r)))))
    (if (i32.and (i32.and (local.get $v) (i32.const 4)) (i32.ge_u (i32.and (local.get $st) (i32.const 3)) (i32.const 2)))
      (then (return (f32.const 0))))
    (local.set $v (i32.and (local.get $v) (i32.const 3)))
    (if (i32.eqz (local.get $v)) (then (return (f32.const 0))))
    ;; 3, 4 or 5 mu
    (f32.div (f32.mul (call $st_size (local.get $st)) (f32.convert_i32_u (i32.add (local.get $v) (i32.const 2))))
             (f32.const 18)))

  ;; Lay out the atoms from $base to the stack top as a list whose items
  ;; start at $i0: fix classes, then place each atom with the space its
  ;; neighbours call for. Sets the box; a list of one atom keeps its class.
  (func $m_pack (param $base i32) (param $st i32)
    (local $a i32) (local $prev i32) (local $t i32) (local $pt i32) (local $x f32) (local $h f32) (local $d f32)
    (local $i1 i32) (local $n i32) (local $last i32)
    ;; binary operators with nothing to operate on are ordinary
    (local.set $a (local.get $base))
    (block $d1
      (loop $l1
        (br_if $d1 (i32.ge_u (local.get $a) (global.get $msp)))
        (local.set $t (i32.load offset=4 (local.get $a)))
        (if (i32.ne (local.get $t) (i32.const 8))
          (then
            (if (i32.eq (local.get $t) (i32.const 2))
              (then
                (if (i32.eqz (local.get $prev))
                  (then (local.set $t (i32.const 0)))
                  (else
                    (local.set $pt (i32.load offset=4 (local.get $prev)))
                    (if (i32.or (i32.or (i32.eq (local.get $pt) (i32.const 1)) (i32.eq (local.get $pt) (i32.const 2)))
                                (i32.or (i32.or (i32.eq (local.get $pt) (i32.const 3)) (i32.eq (local.get $pt) (i32.const 4)))
                                        (i32.eq (local.get $pt) (i32.const 6))))
                      (then (local.set $t (i32.const 0))))))
                (i32.store offset=4 (local.get $a) (local.get $t))))
            (if (i32.and (local.get $prev)
                  (i32.or (i32.eq (local.get $t) (i32.const 3)) (i32.or (i32.eq (local.get $t) (i32.const 5)) (i32.eq (local.get $t) (i32.const 6)))))
              (then
                (if (i32.eq (i32.load offset=4 (local.get $prev)) (i32.const 2))
                  (then (i32.store offset=4 (local.get $prev) (i32.const 0))))))
            (local.set $prev (local.get $a))
            (local.set $n (i32.add (local.get $n) (i32.const 1)))
            (local.set $last (local.get $a))))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $l1)))
    (if (local.get $prev)
      (then
        (if (i32.eq (i32.load offset=4 (local.get $prev)) (i32.const 2))
          (then (i32.store offset=4 (local.get $prev) (i32.const 0))))))
    ;; place them
    (local.set $pt (i32.const -1))
    (local.set $a (local.get $base))
    (block $d2
      (loop $l2
        (br_if $d2 (i32.ge_u (local.get $a) (global.get $msp)))
        (local.set $t (i32.load offset=4 (local.get $a)))
        (if (i32.ne (local.get $t) (i32.const 8))
          (then
            (if (i32.ge_s (local.get $pt) (i32.const 0))
              (then (local.set $x (f32.add (local.get $x) (call $m_space (local.get $pt) (local.get $t) (local.get $st))))))
            (local.set $pt (local.get $t))))
        (local.set $i1
          (if (result i32) (i32.lt_u (i32.add (local.get $a) (i32.const 32)) (global.get $msp))
            (then (i32.load offset=32 (local.get $a)))
            (else (global.get $mi))))
        (call $mi_shift (i32.load (local.get $a)) (local.get $i1) (local.get $x) (f32.const 0))
        (local.set $x (f32.add (local.get $x) (f32.load offset=8 (local.get $a))))
        (local.set $h (f32.max (local.get $h) (f32.load offset=12 (local.get $a))))
        (local.set $d (f32.max (local.get $d) (f32.load offset=16 (local.get $a))))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $l2)))
    (call $box0)
    (global.set $bw (local.get $x))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (if (i32.eq (local.get $n) (i32.const 1))
      (then
        (global.set $btype (i32.load offset=4 (local.get $last)))
        (global.set $blim (i32.ne (i32.and (i32.load offset=24 (local.get $last)) (i32.const 2)) (i32.const 0))))))

  ;; Does the source continue with "\\" (a new row)?
  (func $m_at_rows (result i32)
    (i32.and (i32.eq (call $m_peek) (i32.const 92)) (i32.eq (call $m_peek_at (i32.const 1)) (i32.const 92))))

  ;; A list of atoms in style $st, up to the end, the character $stop (not
  ;; consumed), & or \\ in an array, \right or \middle after \left, or
  ;; \end. With $lead it starts with an empty ordinary atom (for the right
  ;; column of an aligned pair, so "&= x" spaces its relation).
  (func $m_list (param $st i32) (param $stop i32) (param $lead i32)
    (local $base i32) (local $c i32) (local $save i32) (local $f i32) (local $k i32) (local $last i32) (local $i0 i32)
    (local $t i32)
    (local.set $base (global.get $msp))
    (global.set $mdep (i32.add (global.get $mdep) (i32.const 1)))
    (if (local.get $lead)
      (then (call $box0) (local.set $last (call $m_push (global.get $mi)))))
    (block $done
      (loop $parse
        (call $m_skip)
        (local.set $c (call $m_peek))
        (br_if $done (i32.eq (local.get $c) (i32.const -1)))
        (br_if $done (i32.and (i32.ne (local.get $stop) (i32.const 0)) (i32.eq (local.get $c) (local.get $stop))))
        (if (i32.eq (local.get $c) (i32.const 125))
          (then
            (br_if $done (local.get $stop))
            (call $m_adv)
            (br $parse)))
        (br_if $done (i32.and (i32.eq (local.get $c) (i32.const 38)) (i32.ne (global.get $marr) (i32.const 0))))
        (if (i32.eq (local.get $c) (i32.const 92))
          (then
            (br_if $done (i32.and (call $m_at_rows) (i32.ne (global.get $marr) (i32.const 0))))
            (local.set $save (global.get $mp))
            (call $m_read_name)
            (local.set $f (call $m_lookup (global.get $cn_a) (global.get $cn_n)))
            (if (local.get $f)
              (then
                (local.set $k (call $f_kind (local.get $f)))
                (if (i32.and (i32.or (i32.eq (local.get $k) (i32.const 0x14)) (i32.eq (local.get $k) (i32.const 0x15)))
                             (i32.ne (global.get $mleft) (i32.const 0)))
                  (then (global.set $mp (local.get $save)) (br $done)))
                (if (i32.and (i32.eq (local.get $k) (i32.const 0x22)) (i32.ne (global.get $marr) (i32.const 0)))
                  (then (global.set $mp (local.get $save)) (br $done)))
                (if (i32.eq (local.get $k) (i32.const 0x23))
                  (then
                    (if (local.get $last)
                      (then (i32.store offset=24 (local.get $last)
                              (i32.or (i32.and (i32.load offset=24 (local.get $last)) (i32.const -9)) (i32.const 4)))))
                    (br $parse)))
                (if (i32.eq (local.get $k) (i32.const 0x24))
                  (then
                    (if (local.get $last)
                      (then (i32.store offset=24 (local.get $last)
                              (i32.or (i32.and (i32.load offset=24 (local.get $last)) (i32.const -5)) (i32.const 8)))))
                    (br $parse)))
                (if (i32.eq (local.get $k) (i32.const 0x29))
                  (then
                    (local.set $st (i32.or (call $f_face (local.get $f)) (i32.and (local.get $st) (i32.const 4))))
                    (br $parse)))
                (br_if $parse (i32.eq (local.get $k) (i32.const 0x31)))))
            (global.set $mp (local.get $save))))
        ;; scripts attach to the atom before them, or to an empty one
        (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 94)) (i32.eq (local.get $c) (i32.const 95)))
                    (i32.eq (local.get $c) (i32.const 39)))
          (then
            (if (i32.or (i32.eqz (local.get $last))
                        (i32.ne (i32.and (i32.load offset=24 (local.get $last)) (i32.const 16)) (i32.const 0)))
              (then (call $box0) (local.set $last (call $m_push (global.get $mi)))))
            (if (local.get $last)
              (then (call $m_scripts (local.get $last) (local.get $st)))
              (else (call $m_adv)))
            (br $parse)))
        (local.set $i0 (global.get $mi))
        (local.set $t (call $m_atom (local.get $st)))
        (if (i32.ge_s (local.get $t) (i32.const 0))
          (then (local.set $last (call $m_push (local.get $i0)))))
        (br $parse)))
    (global.set $mdep (i32.sub (global.get $mdep) (i32.const 1)))
    (call $m_pack (local.get $base) (local.get $st))
    (global.set $msp (local.get $base)))

  ;; An argument: a {group}, or a single atom. Stops short of what ends a
  ;; list (it is left for the list).
  (func $m_arg (param $st i32)
    (local $c i32)
    (call $m_skip)
    (local.set $c (call $m_peek))
    (if (i32.eq (local.get $c) (i32.const 123))
      (then
        (call $m_adv)
        (call $m_list (local.get $st) (i32.const 125) (i32.const 0))
        (if (i32.eq (call $m_peek) (i32.const 125)) (then (call $m_adv)))
        (global.set $bchar (i32.const 0))
        (return)))
    (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const -1)) (i32.eq (local.get $c) (i32.const 125)))
                (i32.or (i32.eq (local.get $c) (i32.const 38)) (call $m_at_rows)))
      (then (call $box0) (return)))
    (if (i32.lt_s (call $m_atom (local.get $st)) (i32.const 0))
      (then (call $box0))))

  ;; Superscripts, subscripts and primes after the atom at $rec (TeX's
  ;; rules 13a and 18): beside it, or as limits above and below.
  (func $m_scripts (param $rec i32) (param $st i32)
    (local $c i32) (local $sup0 i32) (local $sub0 i32) (local $hsup i32) (local $hsub i32) (local $k i32)
    (local $ws f32) (local $hs f32) (local $ds f32) (local $wb f32) (local $hb f32) (local $db f32)
    (local $w f32) (local $h f32) (local $d f32) (local $ic f32) (local $flags i32) (local $sz f32) (local $ssz f32)
    (local $u f32) (local $v f32) (local $xh f32) (local $th f32) (local $p f32) (local $g f32) (local $xs f32) (local $xb f32)
    (local $n0 i32) (local $n1 i32) (local $wm f32) (local $sup1 i32) (local $sub1 i32)
    (local.set $sup0 (i32.const -1))
    (local.set $sub0 (i32.const -1))
    (local.set $ssz (call $st_size (call $st_sup (local.get $st))))
    (block $done
      (loop $more
        (call $m_skip)
        (local.set $c (call $m_peek))
        (if (i32.eq (local.get $c) (i32.const 39))
          (then
            (if (local.get $hsup)
              (then (call $m_adv) (br $more)))
            ;; primes, then maybe a superscript joined to them
            (local.set $sup0 (global.get $mi))
            (block $pd
              (loop $pl
                (br_if $pd (i32.ne (call $m_peek) (i32.const 39)))
                (call $m_adv)
                (local.set $k (global.get $mi))
                (call $m_glyph (i32.const 0x2032) (i32.const 7) (local.get $ssz) (i32.const 0))
                (call $mi_shift (local.get $k) (global.get $mi) (local.get $ws) (f32.const 0))
                (local.set $ws (f32.add (local.get $ws) (global.get $bw)))
                (local.set $hs (f32.max (local.get $hs) (global.get $bh)))
                (local.set $ds (f32.max (local.get $ds) (global.get $bd)))
                (br $pl)))
            (call $m_skip)
            (if (i32.eq (call $m_peek) (i32.const 94))
              (then
                (call $m_adv)
                (local.set $k (global.get $mi))
                (call $m_arg (call $st_sup (local.get $st)))
                (call $mi_shift (local.get $k) (global.get $mi) (local.get $ws) (f32.const 0))
                (local.set $ws (f32.add (local.get $ws) (global.get $bw)))
                (local.set $hs (f32.max (local.get $hs) (global.get $bh)))
                (local.set $ds (f32.max (local.get $ds) (global.get $bd)))))
            (local.set $sup1 (global.get $mi))
            (local.set $hsup (i32.const 1))
            (br $more)))
        (if (i32.eq (local.get $c) (i32.const 94))
          (then
            (call $m_adv)
            (local.set $k (global.get $mi))
            (call $m_arg (call $st_sup (local.get $st)))
            (if (local.get $hsup)
              ;; a second superscript is an error in TeX; drop it
              (then (global.set $mi (local.get $k)))
              (else
                (local.set $sup0 (local.get $k))
                (local.set $sup1 (global.get $mi))
                (local.set $ws (global.get $bw))
                (local.set $hs (global.get $bh))
                (local.set $ds (global.get $bd))
                (local.set $hsup (i32.const 1))))
            (br $more)))
        (if (i32.eq (local.get $c) (i32.const 95))
          (then
            (call $m_adv)
            (local.set $k (global.get $mi))
            (call $m_arg (call $st_sub (local.get $st)))
            (if (local.get $hsub)
              (then (global.set $mi (local.get $k)))
              (else
                (local.set $sub0 (local.get $k))
                (local.set $sub1 (global.get $mi))
                (local.set $wb (global.get $bw))
                (local.set $hb (global.get $bh))
                (local.set $db (global.get $bd))
                (local.set $hsub (i32.const 1))))
            (br $more)))))
    (if (i32.eqz (i32.or (local.get $hsup) (local.get $hsub))) (then (return)))
    (local.set $w (f32.load offset=8 (local.get $rec)))
    (local.set $h (f32.load offset=12 (local.get $rec)))
    (local.set $d (f32.load offset=16 (local.get $rec)))
    (local.set $ic (f32.load offset=20 (local.get $rec)))
    (local.set $flags (i32.load offset=24 (local.get $rec)))
    (local.set $sz (call $st_size (local.get $st)))
    ;; the nucleus runs up to the first script
    (local.set $n0 (i32.load (local.get $rec)))
    (local.set $n1 (global.get $mi))
    (if (i32.ge_s (local.get $sup0) (i32.const 0))
      (then (local.set $n1 (select (local.get $sup0) (local.get $n1) (i32.lt_u (local.get $sup0) (local.get $n1))))))
    (if (i32.ge_s (local.get $sub0) (i32.const 0))
      (then (local.set $n1 (select (local.get $sub0) (local.get $n1) (i32.lt_u (local.get $sub0) (local.get $n1))))))
    (if (i32.eqz (i32.and (local.get $flags) (i32.const 8)))
      (then
        (if (i32.or (i32.and (local.get $flags) (i32.const 4))
                    (i32.and (i32.ne (i32.and (local.get $flags) (i32.const 2)) (i32.const 0)) (call $is_display (local.get $st))))
          (then
            ;; limits, centred above and below
            (local.set $wm (f32.max (local.get $w) (f32.max (local.get $ws) (local.get $wb))))
            (call $mi_shift (local.get $n0) (local.get $n1) (f32.mul (f32.sub (local.get $wm) (local.get $w)) (f32.const 0.5)) (f32.const 0))
            (if (local.get $hsup)
              (then
                (local.set $u (f32.max (f32.mul (local.get $sz) (f32.const 0.111))
                                       (f32.sub (f32.mul (local.get $sz) (f32.const 0.2)) (local.get $ds))))
                (call $mi_shift (local.get $sup0) (local.get $sup1)
                  (f32.add (f32.mul (f32.sub (local.get $wm) (local.get $ws)) (f32.const 0.5)) (f32.mul (local.get $ic) (f32.const 0.5)))
                  (f32.neg (f32.add (f32.add (local.get $h) (local.get $u)) (local.get $ds))))
                (local.set $h (f32.add (f32.add (f32.add (local.get $h) (local.get $u)) (f32.add (local.get $ds) (local.get $hs)))
                                       (f32.mul (local.get $sz) (f32.const 0.1))))))
            (if (local.get $hsub)
              (then
                (local.set $v (f32.max (f32.mul (local.get $sz) (f32.const 0.166))
                                       (f32.sub (f32.mul (local.get $sz) (f32.const 0.6)) (local.get $hb))))
                (call $mi_shift (local.get $sub0) (local.get $sub1)
                  (f32.sub (f32.mul (f32.sub (local.get $wm) (local.get $wb)) (f32.const 0.5)) (f32.mul (local.get $ic) (f32.const 0.5)))
                  (f32.add (f32.add (local.get $d) (local.get $v)) (local.get $hb)))
                (local.set $d (f32.add (f32.add (f32.add (local.get $d) (local.get $v)) (f32.add (local.get $hb) (local.get $db)))
                                       (f32.mul (local.get $sz) (f32.const 0.1))))))
            (f32.store offset=8 (local.get $rec) (local.get $wm))
            (f32.store offset=12 (local.get $rec) (local.get $h))
            (f32.store offset=16 (local.get $rec) (local.get $d))
            (f32.store offset=20 (local.get $rec) (f32.const 0))
            (i32.store offset=24 (local.get $rec) (i32.or (i32.and (local.get $flags) (i32.const -2)) (i32.const 16)))
            (return)))))
    ;; beside the nucleus
    (local.set $xh (f32.mul (local.get $sz) (f32.const 0.431)))
    (local.set $th (f32.mul (local.get $sz) (f32.const 0.04)))
    (if (i32.eqz (i32.and (local.get $flags) (i32.const 1)))
      (then
        (local.set $u (f32.sub (local.get $h) (f32.mul (local.get $ssz) (f32.const 0.386))))
        (local.set $v (f32.add (local.get $d) (f32.mul (call $st_size (call $st_sub (local.get $st))) (f32.const 0.05))))))
    (if (local.get $hsup)
      (then
        (local.set $p
          (if (result f32) (i32.and (local.get $st) (i32.const 4))
            (then (f32.const 0.289))
            (else (select (f32.const 0.413) (f32.const 0.363) (call $is_display (local.get $st))))))
        (local.set $u (f32.max (local.get $u)
          (f32.max (f32.mul (local.get $p) (local.get $sz)) (f32.add (local.get $ds) (f32.mul (local.get $xh) (f32.const 0.25))))))))
    (if (local.get $hsub)
      (then
        (if (local.get $hsup)
          (then
            (local.set $v (f32.max (local.get $v) (f32.mul (local.get $sz) (f32.const 0.247))))
            (local.set $g (f32.sub (f32.sub (local.get $u) (local.get $ds)) (f32.sub (local.get $hb) (local.get $v))))
            (if (f32.lt (local.get $g) (f32.mul (local.get $th) (f32.const 4)))
              (then (local.set $v (f32.add (local.get $v) (f32.sub (f32.mul (local.get $th) (f32.const 4)) (local.get $g))))))
            (local.set $g (f32.sub (f32.mul (local.get $xh) (f32.const 0.8)) (f32.sub (local.get $u) (local.get $ds))))
            (if (f32.gt (local.get $g) (f32.const 0))
              (then
                (local.set $u (f32.add (local.get $u) (local.get $g)))
                (local.set $v (f32.sub (local.get $v) (local.get $g))))))
          (else
            (local.set $v (f32.max (local.get $v)
              (f32.max (f32.mul (local.get $sz) (f32.const 0.15)) (f32.sub (local.get $hb) (f32.mul (local.get $xh) (f32.const 0.8))))))))))
    ;; an operator's subscript tucks under it by its italic correction; a
    ;; letter's superscript clears its slant
    (local.set $xs (local.get $w))
    (local.set $xb (local.get $w))
    (if (i32.eq (i32.load offset=4 (local.get $rec)) (i32.const 1))
      (then (local.set $xb (f32.sub (local.get $w) (local.get $ic))))
      (else (local.set $xs (f32.add (local.get $w) (local.get $ic)))))
    (local.set $wm (local.get $w))
    (if (local.get $hsup)
      (then
        (call $mi_shift (local.get $sup0) (local.get $sup1) (local.get $xs) (f32.neg (local.get $u)))
        (local.set $wm (f32.max (local.get $wm) (f32.add (local.get $xs) (local.get $ws))))
        (local.set $h (f32.max (local.get $h) (f32.add (local.get $u) (local.get $hs))))))
    (if (local.get $hsub)
      (then
        (call $mi_shift (local.get $sub0) (local.get $sub1) (local.get $xb) (local.get $v))
        (local.set $wm (f32.max (local.get $wm) (f32.add (local.get $xb) (local.get $wb))))
        (local.set $d (f32.max (local.get $d) (f32.add (local.get $v) (local.get $db))))))
    (f32.store offset=8 (local.get $rec) (f32.add (local.get $wm) (f32.mul (local.get $sz) (f32.const 0.05))))
    (f32.store offset=12 (local.get $rec) (local.get $h))
    (f32.store offset=16 (local.get $rec) (local.get $d))
    (f32.store offset=20 (local.get $rec) (f32.const 0))
    (i32.store offset=24 (local.get $rec) (i32.or (i32.and (local.get $flags) (i32.const -2)) (i32.const 16))))

  ;; ---------------------------------------------------------------------
  ;; Atoms
  ;; ---------------------------------------------------------------------

  ;; One atom: a group, a character or a command. Sets the box and
  ;; returns its class, or -1 when it made nothing (the input is consumed
  ;; either way).
  (func $m_atom (param $st i32) (result i32)
    (local $t i32)
    ;; nested too deeply: skip ahead rather than overflow the stack
    (if (i32.gt_u (global.get $mdep) (i32.const 60))
      (then (call $box0) (call $m_adv) (return (i32.const -1))))
    (global.set $mdep (i32.add (global.get $mdep) (i32.const 1)))
    (local.set $t (call $m_atom_in (local.get $st)))
    (global.set $mdep (i32.sub (global.get $mdep) (i32.const 1)))
    (local.get $t))

  (func $m_atom_in (param $st i32) (result i32)
    (local $c i32)
    (local.set $c (call $m_peek))
    (call $box0)
    (if (i32.eq (local.get $c) (i32.const -1)) (then (return (i32.const -1))))
    (if (i32.eq (local.get $c) (i32.const 123))
      (then
        (call $m_arg (local.get $st))
        (global.set $btype (i32.const 0))
        (return (i32.const 0))))
    (if (i32.eq (local.get $c) (i32.const 92)) (then (return (call $m_command (local.get $st)))))
    (call $m_adv)
    (call $m_char (local.get $c) (local.get $st)))

  (func $is_upper (param $c i32) (result i32)
    (i32.lt_u (i32.sub (local.get $c) (i32.const 65)) (i32.const 26)))

  ;; A letter or digit in the current font (\mathbf and friends).
  (func $m_alnum (param $c i32) (param $st i32) (result i32)
    (local $face i32) (local $flags i32) (local $f i32)
    (local.set $f (global.get $mfont))
    (if (call $is_digit (local.get $c))
      (then
        (local.set $face (i32.const 7))
        (if (i32.eq (local.get $f) (i32.const 2)) (then (local.set $face (i32.const 12))))
        (if (i32.eq (local.get $f) (i32.const 8)) (then (local.set $face (i32.const 12))))
        (if (i32.eq (local.get $f) (i32.const 6)) (then (local.set $face (i32.const 5))))
        (if (i32.eq (local.get $f) (i32.const 7)) (then (local.set $face (i32.const 4)))))
      (else
        (local.set $face (i32.const 6))
        (if (i32.eq (local.get $f) (i32.const 1)) (then (local.set $face (i32.const 7))))
        (if (i32.eq (local.get $f) (i32.const 2)) (then (local.set $face (i32.const 12))))
        (if (i32.eq (local.get $f) (i32.const 4))
          (then (local.set $face (select (i32.const 10) (i32.const 7) (call $has_glyph (i32.const 10) (call $gid (local.get $c)))))))
        (if (i32.eq (local.get $f) (i32.const 5))
          (then (local.set $face (select (i32.const 11) (i32.const 6) (call $is_upper (local.get $c))))))
        (if (i32.eq (local.get $f) (i32.const 6)) (then (local.set $face (i32.const 5))))
        (if (i32.eq (local.get $f) (i32.const 7)) (then (local.set $face (i32.const 4))))
        (if (i32.eq (local.get $f) (i32.const 8)) (then (local.set $flags (i32.const 1))))))
    (call $m_glyph (local.get $c) (local.get $face) (call $st_size (local.get $st)) (local.get $flags))
    (global.set $btype (i32.const 0))
    (i32.const 0))

  ;; A symbol from the table: code point $cp of class $t in $face, bold
  ;; when the font asks for it and the face has no bold of its own.
  (func $m_symbol (param $cp i32) (param $face i32) (param $t i32) (param $st i32) (result i32)
    (local $flags i32)
    (if (i32.or (i32.eq (global.get $mfont) (i32.const 2)) (i32.eq (global.get $mfont) (i32.const 8)))
      (then
        (if (i32.and (i32.eq (global.get $mfont) (i32.const 2))
                     (call $has_glyph (i32.const 12) (call $gid (local.get $cp))))
          (then (local.set $face (i32.const 12)))
          (else (local.set $flags (i32.const 1))))))
    (call $m_glyph (local.get $cp) (local.get $face) (call $st_size (local.get $st)) (local.get $flags))
    (global.set $btype (local.get $t))
    (local.get $t))

  ;; A character that is not a command ($c, already consumed).
  (func $m_char (param $c i32) (param $st i32) (result i32)
    (local $f i32) (local $t i32) (local $cp i32) (local $face i32)
    (if (i32.or (call $is_letter (local.get $c)) (call $is_digit (local.get $c)))
      (then (return (call $m_alnum (local.get $c) (local.get $st)))))
    (local.set $cp (local.get $c))
    (local.set $face (i32.const 7))
    (local.set $t (i32.const -1))
    (if (i32.eq (local.get $c) (i32.const 43)) (then (local.set $t (i32.const 2))))
    (if (i32.eq (local.get $c) (i32.const 45)) (then (local.set $t (i32.const 2)) (local.set $cp (i32.const 0x2212))))
    (if (i32.eq (local.get $c) (i32.const 42)) (then (local.set $t (i32.const 2)) (local.set $cp (i32.const 0x2217))))
    (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 61)) (i32.eq (local.get $c) (i32.const 60)))
                (i32.or (i32.eq (local.get $c) (i32.const 62)) (i32.eq (local.get $c) (i32.const 58))))
      (then (local.set $t (i32.const 3))))
    (if (i32.or (i32.eq (local.get $c) (i32.const 44)) (i32.eq (local.get $c) (i32.const 59)))
      (then (local.set $t (i32.const 6))))
    (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 33)) (i32.eq (local.get $c) (i32.const 63)))
                (i32.or (i32.eq (local.get $c) (i32.const 41)) (i32.eq (local.get $c) (i32.const 93))))
      (then (local.set $t (i32.const 5))))
    (if (i32.or (i32.eq (local.get $c) (i32.const 40)) (i32.eq (local.get $c) (i32.const 91)))
      (then (local.set $t (i32.const 4))))
    (if (i32.eq (local.get $c) (i32.const 39))
      (then (local.set $t (i32.const 0)) (local.set $cp (i32.const 0x2032))))
    ;; "~" is a space; "&", "^", "_", "#" and "$" out of place are skipped
    (if (i32.eq (local.get $c) (i32.const 126))
      (then
        (call $box0)
        (global.set $bw (f32.div (f32.mul (call $st_size (local.get $st)) (f32.const 6)) (f32.const 18)))
        (global.set $btype (i32.const 8))
        (return (i32.const 8))))
    (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 38)) (i32.eq (local.get $c) (i32.const 94)))
                (i32.or (i32.or (i32.eq (local.get $c) (i32.const 95)) (i32.eq (local.get $c) (i32.const 35)))
                        (i32.eq (local.get $c) (i32.const 36))))
      (then (return (i32.const -1))))
    (if (i32.lt_s (local.get $t) (i32.const 0))
      (then
        (local.set $t (i32.const 0))
        (if (i32.ge_u (local.get $c) (i32.const 128))
          (then
            ;; symbols typed as themselves ("≤", "α") take their class
            (local.set $f (call $m_lookup_cp (local.get $c)))
            (if (local.get $f)
              (then
                (local.set $t (call $f_kind (local.get $f)))
                (local.set $face (call $f_face (local.get $f))))
              (else
                (if (i32.eq (i32.and (local.get $c) (i32.const 0xFC00)) (i32.const 0xD800))
                  (then (call $m_adv) (local.set $cp (i32.const 0xFFFF))))
                (if (i32.eqz (call $has_glyph (i32.const 7) (call $gid (local.get $cp))))
                  (then (local.set $face (select (i32.const 6) (i32.const 0)
                                                 (call $has_glyph (i32.const 6) (call $gid (local.get $cp)))))))))))))
    (call $m_symbol (local.get $cp) (local.get $face) (local.get $t) (local.get $st)))

  ;; An unknown command: its name, in the error colour.
  (func $m_unknown (param $st i32) (result i32)
    (local $i0 i32) (local $k i32) (local $x f32) (local $h f32) (local $d f32) (local $sz f32) (local $c i32)
    (local.set $i0 (global.get $mi))
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $c (i32.const 92))
    (loop $l
      (call $gmet (local.get $c) (i32.const 7) (local.get $sz))
      (call $mi_glyph (local.get $c) (i32.const 7) (local.get $sz) (i32.const 2))
      (call $mi_shift (i32.sub (global.get $mi) (i32.const 1)) (global.get $mi) (local.get $x) (f32.const 0))
      (local.set $x (f32.add (local.get $x) (global.get $gw)))
      (local.set $h (f32.max (local.get $h) (global.get $gh)))
      (local.set $d (f32.max (local.get $d) (global.get $gd)))
      (if (i32.lt_u (local.get $k) (global.get $cn_n))
        (then
          (local.set $c (i32.load16_u (i32.add (global.get $cn_a) (i32.shl (local.get $k) (i32.const 1)))))
          (local.set $k (i32.add (local.get $k) (i32.const 1)))
          (br $l))))
    (call $mi_error (local.get $i0) (global.get $mi))
    (call $box0)
    (global.set $bw (local.get $x))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (i32.const 0))

  ;; Skip a {balanced group}, if one comes next.
  (func $m_skip_group
    (local $depth i32) (local $c i32)
    (call $m_skip)
    (if (i32.ne (call $m_peek) (i32.const 123)) (then (return)))
    (block $d
      (loop $l
        (local.set $c (call $m_peek))
        (br_if $d (i32.eq (local.get $c) (i32.const -1)))
        (call $m_adv)
        (if (i32.eq (local.get $c) (i32.const 92)) (then (call $m_adv) (br $l)))
        (if (i32.eq (local.get $c) (i32.const 123)) (then (local.set $depth (i32.add (local.get $depth) (i32.const 1)))))
        (if (i32.eq (local.get $c) (i32.const 125))
          (then
            (local.set $depth (i32.sub (local.get $depth) (i32.const 1)))
            (br_if $d (i32.eqz (local.get $depth)))))
        (br $l))))

  ;; A command at "\".
  (func $m_command (param $st i32) (result i32)
    (local $f i32) (local $k i32) (local $face i32) (local $cp i32) (local $i0 i32) (local $save i32) (local $sz f32)
    (local $t i32)
    (call $m_read_name)
    (if (i32.eqz (global.get $cn_n)) (then (return (i32.const -1))))
    (local.set $f (call $m_lookup (global.get $cn_a) (global.get $cn_n)))
    (if (i32.eqz (local.get $f)) (then (return (call $m_unknown (local.get $st)))))
    (local.set $k (call $f_kind (local.get $f)))
    (local.set $face (call $f_face (local.get $f)))
    (local.set $cp (call $f_cp (local.get $f)))
    (local.set $sz (call $st_size (local.get $st)))
    (if (i32.lt_u (local.get $k) (i32.const 8))
      (then (return (call $m_symbol (local.get $cp) (local.get $face) (local.get $k) (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x10)) (then (return (call $m_frac (local.get $st) (local.get $face) (i32.const 1)))))
    (if (i32.eq (local.get $k) (i32.const 0x11)) (then (return (call $m_frac (local.get $st) (local.get $face) (i32.const 0)))))
    (if (i32.eq (local.get $k) (i32.const 0x12)) (then (return (call $m_sqrt (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x13)) (then (return (call $m_left (local.get $st)))))
    ;; \right or \middle without \left: just the delimiter
    (if (i32.or (i32.eq (local.get $k) (i32.const 0x14)) (i32.eq (local.get $k) (i32.const 0x15)))
      (then
        (call $m_delim (call $m_read_delim) (f32.const 0) (local.get $st))
        (return (i32.const 0))))
    (if (i32.eq (local.get $k) (i32.const 0x16))
      (then
        (call $m_delim (call $m_read_delim)
          (f32.mul (local.get $sz) (f32.add (f32.const 0.6) (f32.mul (f32.convert_i32_u (local.get $face)) (f32.const 0.6))))
          (local.get $st))
        (global.set $btype (local.get $cp))
        (return (local.get $cp))))
    (if (i32.eq (local.get $k) (i32.const 0x17)) (then (return (call $m_bigop (local.get $cp) (local.get $st) (i32.const 1)))))
    (if (i32.eq (local.get $k) (i32.const 0x18)) (then (return (call $m_bigop (local.get $cp) (local.get $st) (i32.const 0)))))
    (if (i32.or (i32.eq (local.get $k) (i32.const 0x19)) (i32.eq (local.get $k) (i32.const 0x1a)))
      (then (return (call $m_opname (local.get $cp) (i32.eq (local.get $k) (i32.const 0x19)) (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x1b)) (then (return (call $m_accent (local.get $cp) (local.get $face) (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x1c)) (then (return (call $m_rule_line (local.get $st) (i32.const 1)))))
    (if (i32.eq (local.get $k) (i32.const 0x1d)) (then (return (call $m_rule_line (local.get $st) (i32.const 0)))))
    (if (i32.eq (local.get $k) (i32.const 0x1e))
      (then
        (local.set $save (global.get $mfont))
        (global.set $mfont (local.get $face))
        (call $m_arg (local.get $st))
        (global.set $mfont (local.get $save))
        (global.set $btype (i32.const 0))
        (return (i32.const 0))))
    (if (i32.eq (local.get $k) (i32.const 0x1f)) (then (return (call $m_text (local.get $face) (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x20))
      (then
        ;; a space of CCCC mu (signed)
        (call $box0)
        (global.set $bw (f32.div (f32.mul (local.get $sz) (f32.convert_i32_s (i32.extend16_s (local.get $cp)))) (f32.const 18)))
        (global.set $btype (i32.const 8))
        (return (i32.const 8))))
    (if (i32.eq (local.get $k) (i32.const 0x21)) (then (return (call $m_env (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x22))
      (then (call $m_skip_group) (return (i32.const -1))))
    (if (i32.eq (local.get $k) (i32.const 0x25)) (then (return (call $m_not (local.get $cp) (local.get $st)))))
    (if (i32.and (i32.ge_u (local.get $k) (i32.const 0x26)) (i32.le_u (local.get $k) (i32.const 0x28)))
      (then (return (call $m_overset (local.get $k) (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x2a))
      (then
        ;; \operatorname{name}, or \operatorname*{name} with limits
        (local.set $t (i32.eq (call $m_peek) (i32.const 42)))
        (if (local.get $t) (then (call $m_adv)))
        (local.set $save (global.get $mfont))
        (global.set $mfont (i32.const 1))
        (call $m_arg (local.get $st))
        (global.set $mfont (local.get $save))
        (global.set $btype (i32.const 1))
        (global.set $blim (local.get $t))
        (global.set $bchar (i32.const 0))
        (return (i32.const 1))))
    (if (i32.or (i32.eq (local.get $k) (i32.const 0x2b)) (i32.eq (local.get $k) (i32.const 0x2c)))
      (then (return (call $m_over_arrow (local.get $st) (i32.eq (local.get $k) (i32.const 0x2b))))))
    (if (i32.eq (local.get $k) (i32.const 0x2d))
      (then
        (local.set $i0 (global.get $mi))
        (call $m_arg (local.get $st))
        (global.set $mi (local.get $i0))
        (global.set $btype (i32.const 0))
        (return (i32.const 0))))
    (if (i32.eq (local.get $k) (i32.const 0x2e))
      (then
        (call $m_arg (local.get $st))
        (global.set $btype (local.get $cp))
        (global.set $bchar (i32.const 0))
        (return (local.get $cp))))
    (if (i32.eq (local.get $k) (i32.const 0x2f)) (then (return (call $m_boxed (local.get $st)))))
    (if (i32.eq (local.get $k) (i32.const 0x30))
      (then
        (call $m_skip)
        (if (i32.eq (call $m_peek) (i32.const 123))
          (then
            (call $m_adv)
            (call $m_array (local.get $st) (i32.const 83) (i32.const 125))
            (if (i32.eq (call $m_peek) (i32.const 125)) (then (call $m_adv)))
            (return (i32.const 0))))
        (return (i32.const -1))))
    (if (i32.eq (local.get $k) (i32.const 0x32)) (then (call $m_skip_group)))
    ;; \limits, \nolimits and styles out of place, and ignored commands
    (i32.const -1))

  ;; ---------------------------------------------------------------------
  ;; Constructs
  ;; ---------------------------------------------------------------------

  ;; \frac (with a bar) or \binom (without, in parentheses), TeX's rule 15.
  ;; $force: 1 display style (\dfrac), 2 text style (\tfrac).
  (func $m_frac (param $st i32) (param $force i32) (param $bar i32) (result i32)
    (local $sz f32) (local $th f32) (local $axis f32) (local $n0 i32) (local $d0 i32)
    (local $wn f32) (local $hn f32) (local $dn f32) (local $wd f32) (local $hd f32) (local $dd f32)
    (local $u f32) (local $v f32) (local $phi f32) (local $g f32) (local $wm f32) (local $nd f32) (local $disp i32)
    (local $l0 i32) (local $r0 i32) (local $lw f32) (local $h f32) (local $d f32) (local $hh f32)
    (if (i32.eq (local.get $force) (i32.const 1)) (then (local.set $st (i32.and (local.get $st) (i32.const 4)))))
    (if (i32.eq (local.get $force) (i32.const 2)) (then (local.set $st (i32.or (i32.and (local.get $st) (i32.const 4)) (i32.const 1)))))
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $th (f32.mul (local.get $sz) (f32.const 0.04)))
    (local.set $axis (f32.mul (local.get $sz) (f32.const 0.25)))
    (local.set $disp (call $is_display (local.get $st)))
    (local.set $n0 (global.get $mi))
    (call $m_arg (call $st_num (local.get $st)))
    (local.set $wn (global.get $bw))
    (local.set $hn (global.get $bh))
    (local.set $dn (global.get $bd))
    (local.set $d0 (global.get $mi))
    (call $m_arg (i32.or (call $st_num (local.get $st)) (i32.const 4)))
    (local.set $wd (global.get $bw))
    (local.set $hd (global.get $bh))
    (local.set $dd (global.get $bd))
    (local.set $v (select (f32.const 0.686) (f32.const 0.345) (local.get $disp)))
    (if (local.get $bar)
      (then
        (local.set $u (f32.mul (local.get $sz) (select (f32.const 0.677) (f32.const 0.394) (local.get $disp))))
        (local.set $v (f32.mul (local.get $sz) (local.get $v)))
        (local.set $phi (f32.mul (local.get $th) (select (f32.const 3) (f32.const 1) (local.get $disp))))
        (local.set $g (f32.sub (f32.sub (local.get $u) (local.get $dn)) (f32.add (local.get $axis) (f32.mul (local.get $th) (f32.const 0.5)))))
        (if (f32.lt (local.get $g) (local.get $phi))
          (then (local.set $u (f32.add (local.get $u) (f32.sub (local.get $phi) (local.get $g))))))
        (local.set $g (f32.sub (f32.sub (local.get $axis) (f32.mul (local.get $th) (f32.const 0.5))) (f32.sub (local.get $hd) (local.get $v))))
        (if (f32.lt (local.get $g) (local.get $phi))
          (then (local.set $v (f32.add (local.get $v) (f32.sub (local.get $phi) (local.get $g)))))))
      (else
        (local.set $u (f32.mul (local.get $sz) (select (f32.const 0.677) (f32.const 0.444) (local.get $disp))))
        (local.set $v (f32.mul (local.get $sz) (local.get $v)))
        (local.set $phi (f32.mul (local.get $th) (select (f32.const 7) (f32.const 3) (local.get $disp))))
        (local.set $g (f32.sub (f32.sub (local.get $u) (local.get $dn)) (f32.sub (local.get $hd) (local.get $v))))
        (if (f32.lt (local.get $g) (local.get $phi))
          (then
            (local.set $u (f32.add (local.get $u) (f32.mul (f32.sub (local.get $phi) (local.get $g)) (f32.const 0.5))))
            (local.set $v (f32.add (local.get $v) (f32.mul (f32.sub (local.get $phi) (local.get $g)) (f32.const 0.5))))))))
    (local.set $wm (f32.max (local.get $wn) (local.get $wd)))
    (local.set $nd (select (f32.mul (local.get $sz) (f32.const 0.12)) (f32.const 0) (local.get $bar)))
    (call $mi_shift (local.get $n0) (local.get $d0)
      (f32.add (local.get $nd) (f32.mul (f32.sub (local.get $wm) (local.get $wn)) (f32.const 0.5))) (f32.neg (local.get $u)))
    (call $mi_shift (local.get $d0) (global.get $mi)
      (f32.add (local.get $nd) (f32.mul (f32.sub (local.get $wm) (local.get $wd)) (f32.const 0.5))) (local.get $v))
    (if (local.get $bar)
      (then (call $mi_rule (local.get $nd) (f32.neg (f32.add (local.get $axis) (f32.mul (local.get $th) (f32.const 0.5))))
                            (local.get $wm) (local.get $th))))
    (local.set $h (f32.add (local.get $u) (local.get $hn)))
    (local.set $d (f32.add (local.get $v) (local.get $dd)))
    (call $box0)
    (global.set $bw (f32.add (local.get $wm) (f32.mul (local.get $nd) (f32.const 2))))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (global.set $btype (i32.const 7))
    (if (local.get $bar) (then (return (i32.const 7))))
    ;; \binom: parentheses of TeX's delim1 / delim2 size, or enough to cover
    (local.set $hh (f32.max (f32.mul (local.get $sz) (select (f32.const 2.39) (f32.const 1.01) (local.get $disp)))
                            (f32.mul (f32.max (f32.sub (local.get $h) (local.get $axis)) (f32.add (local.get $d) (local.get $axis))) (f32.const 1.8))))
    (local.set $l0 (global.get $mi))
    (call $m_delim (i32.const 40) (local.get $hh) (local.get $st))
    (local.set $lw (global.get $bw))
    (local.set $h (f32.max (local.get $h) (global.get $bh)))
    (local.set $d (f32.max (local.get $d) (global.get $bd)))
    (call $mi_shift (local.get $n0) (local.get $l0) (local.get $lw) (f32.const 0))
    (local.set $r0 (global.get $mi))
    (call $m_delim (i32.const 41) (local.get $hh) (local.get $st))
    (call $mi_shift (local.get $r0) (global.get $mi) (f32.add (local.get $lw) (local.get $wm)) (f32.const 0))
    (global.set $bw (f32.add (f32.add (local.get $lw) (local.get $wm)) (global.get $bw)))
    (global.set $bh (f32.max (local.get $h) (global.get $bh)))
    (global.set $bd (f32.max (local.get $d) (global.get $bd)))
    (global.set $btype (i32.const 7))
    (i32.const 7))

  ;; \sqrt[index]{body}: a stroked radical sign over the body (rule 11).
  (func $m_sqrt (param $st i32) (result i32)
    (local $sz f32) (local $th f32) (local $clr f32) (local $b0 i32) (local $bw0 f32) (local $bh0 f32) (local $bd0 f32)
    (local $i0 i32) (local $iw f32) (local $ih f32) (local $id f32) (local $has i32)
    (local $need f32) (local $tot f32) (local $yt f32) (local $yb f32) (local $sw f32) (local $hs f32) (local $x f32) (local $s0 i32)
    (local $w f32) (local $h f32) (local $d f32) (local $mu f32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $th (f32.mul (local.get $sz) (f32.const 0.04)))
    (local.set $mu (f32.div (local.get $sz) (f32.const 18)))
    (call $m_skip)
    (local.set $i0 (global.get $mi))
    (if (i32.eq (call $m_peek) (i32.const 91))
      (then
        (call $m_adv)
        (call $m_list (i32.const 7) (i32.const 93) (i32.const 0))
        (if (i32.eq (call $m_peek) (i32.const 93)) (then (call $m_adv)))
        (local.set $iw (global.get $bw))
        (local.set $ih (global.get $bh))
        (local.set $id (global.get $bd))
        (local.set $has (i32.const 1))))
    (local.set $b0 (global.get $mi))
    (call $m_arg (i32.or (local.get $st) (i32.const 4)))
    (local.set $bw0 (global.get $bw))
    (local.set $bh0 (global.get $bh))
    (local.set $bd0 (global.get $bd))
    (local.set $clr (f32.add (local.get $th)
      (f32.mul (select (f32.mul (local.get $sz) (f32.const 0.431)) (local.get $th) (call $is_display (local.get $st))) (f32.const 0.25))))
    ;; the sign is at least as tall as the font's; the extra clearance is
    ;; shared above and below
    (local.set $need (f32.add (f32.add (local.get $bh0) (local.get $bd0)) (f32.add (local.get $clr) (local.get $th))))
    (local.set $tot (f32.max (local.get $need) (f32.mul (local.get $sz) (f32.const 1.0))))
    (local.set $clr (f32.add (local.get $clr) (f32.mul (f32.sub (local.get $tot) (local.get $need)) (f32.const 0.5))))
    (local.set $yt (f32.neg (f32.add (f32.add (local.get $bh0) (local.get $clr)) (local.get $th))))
    (local.set $yb (f32.add (local.get $yt) (local.get $tot)))
    (local.set $sw (f32.mul (local.get $sz) (f32.min (f32.const 1.0) (f32.add (f32.const 0.78) (f32.mul (f32.div (local.get $tot) (local.get $sz)) (f32.const 0.04))))))
    (local.set $hs (f32.min (local.get $tot) (f32.mul (local.get $sz) (f32.const 1.0))))
    (local.set $s0 (global.get $mi))
    ;; tick, heavy down stroke, long thin up stroke, then the bar
    (call $mi_seg (f32.mul (local.get $sw) (f32.const 0.06)) (f32.sub (local.get $yb) (f32.mul (local.get $hs) (f32.const 0.42)))
                  (f32.mul (local.get $sw) (f32.const 0.2)) (f32.sub (local.get $yb) (f32.mul (local.get $hs) (f32.const 0.5)))
                  (f32.mul (local.get $th) (f32.const 1.1)))
    (call $mi_seg (f32.mul (local.get $sw) (f32.const 0.2)) (f32.sub (local.get $yb) (f32.mul (local.get $hs) (f32.const 0.5)))
                  (f32.mul (local.get $sw) (f32.const 0.44)) (f32.sub (local.get $yb) (f32.mul (local.get $th) (f32.const 0.9)))
                  (f32.mul (local.get $th) (f32.const 2.2)))
    (call $mi_seg (f32.mul (local.get $sw) (f32.const 0.44)) (f32.sub (local.get $yb) (f32.mul (local.get $th) (f32.const 0.9)))
                  (f32.sub (local.get $sw) (f32.mul (local.get $th) (f32.const 0.5))) (f32.add (local.get $yt) (f32.mul (local.get $th) (f32.const 0.5)))
                  (f32.mul (local.get $th) (f32.const 1.1)))
    (call $mi_rule (f32.sub (local.get $sw) (f32.mul (local.get $th) (f32.const 0.5))) (local.get $yt)
                   (f32.add (f32.add (local.get $bw0) (f32.mul (local.get $th) (f32.const 0.5))) (f32.mul (local.get $sz) (f32.const 0.06)))
                   (local.get $th))
    (call $mi_shift (local.get $b0) (local.get $s0) (local.get $sw) (f32.const 0))
    (local.set $w (f32.add (f32.add (local.get $sw) (local.get $bw0)) (f32.mul (local.get $sz) (f32.const 0.06))))
    (local.set $h (f32.add (f32.neg (local.get $yt)) (local.get $th)))
    (local.set $d (f32.max (local.get $bd0) (local.get $yb)))
    (if (local.get $has)
      (then
        ;; the index sits over the tick: 5mu in, then the sign 10mu back
        (local.set $x (f32.sub (f32.add (f32.mul (local.get $mu) (f32.const 5)) (local.get $iw)) (f32.mul (local.get $mu) (f32.const 10))))
        (local.set $x (f32.max (local.get $x) (f32.const 0)))
        (call $mi_shift (local.get $i0) (local.get $b0)
          (f32.sub (f32.add (local.get $x) (f32.mul (local.get $mu) (f32.const 10))) (local.get $iw))
          (f32.sub (local.get $yb) (f32.add (f32.mul (local.get $tot) (f32.const 0.6)) (local.get $id))))
        (call $mi_shift (local.get $b0) (global.get $mi) (local.get $x) (f32.const 0))
        (local.set $w (f32.add (local.get $w) (local.get $x)))
        (local.set $h (f32.max (local.get $h)
          (f32.add (f32.sub (f32.add (f32.mul (local.get $tot) (f32.const 0.6)) (local.get $id)) (local.get $yb)) (local.get $ih))))))
    (call $box0)
    (global.set $bw (local.get $w))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (i32.const 0))

  ;; The delimiter after \left, \right, \big...: a code point, 0 for ".".
  (func $m_read_delim (result i32)
    (local $c i32) (local $f i32)
    (call $m_skip)
    (local.set $c (call $m_peek))
    (if (i32.eq (local.get $c) (i32.const -1)) (then (return (i32.const 0))))
    (if (i32.eq (local.get $c) (i32.const 92))
      (then
        (call $m_read_name)
        (local.set $f (call $m_lookup (global.get $cn_a) (global.get $cn_n)))
        (if (i32.eqz (local.get $f)) (then (return (i32.const 0))))
        (if (i32.ge_u (call $f_kind (local.get $f)) (i32.const 8)) (then (return (i32.const 0))))
        (return (call $f_cp (local.get $f)))))
    (call $m_adv)
    (if (i32.eq (local.get $c) (i32.const 46)) (then (return (i32.const 0))))
    (if (i32.eq (local.get $c) (i32.const 60)) (then (return (i32.const 0x27e8))))
    (if (i32.eq (local.get $c) (i32.const 62)) (then (return (i32.const 0x27e9))))
    (local.get $c))

  ;; A delimiter at least $H tall, centred on the axis: the font's glyph if
  ;; one is tall enough (roman, then the two larger sizes), else strokes.
  (func $m_delim (param $cp i32) (param $H f32) (param $st i32)
    (local $sz f32) (local $axis f32) (local $face i32) (local $g i32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $axis (f32.mul (local.get $sz) (f32.const 0.25)))
    (call $box0)
    (if (i32.eqz (local.get $cp))
      (then (global.set $bw (f32.mul (local.get $sz) (f32.const 0.12))) (return)))
    (if (i32.eq (local.get $cp) (i32.const 0x2223)) (then (local.set $cp (i32.const 0x7c))))
    (if (i32.eq (local.get $cp) (i32.const 0x2016)) (then (local.set $cp (i32.const 0x2225))))
    (local.set $face (i32.const 7))
    (block $none
      (loop $try
        (local.set $g (local.get $cp))
        (if (i32.and (i32.eq (local.get $face) (i32.const 8)) (i32.eq (local.get $cp) (i32.const 0x7c)))
          (then (local.set $g (i32.const 0x2223))))
        (if (call $has_glyph (local.get $face) (call $gid (local.get $g)))
          (then
            (call $gmet (local.get $g) (local.get $face) (local.get $sz))
            (if (f32.ge (f32.add (global.get $gh) (global.get $gd)) (f32.sub (local.get $H) (f32.mul (local.get $sz) (f32.const 0.01))))
              (then
                (call $m_glyph_axis (local.get $g) (local.get $face) (local.get $sz) (local.get $axis))
                (return)))))
        (local.set $face (i32.add (local.get $face) (i32.const 1)))
        (br_if $try (i32.le_u (local.get $face) (i32.const 9)))))
    (call $m_delim_strokes (local.get $cp) (local.get $H) (local.get $st)))

;; A delimiter of any height, drawn with strokes: thick where the font's
  ;; would be thick, thin at the ends. Right-hand ones are mirror images.
  (func $m_delim_strokes (param $cp i32) (param $H f32) (param $st i32)
    (local $sz f32) (local $axis f32) (local $yt f32) (local $yb f32) (local $yc f32) (local $w f32) (local $xl f32) (local $xr f32)
    (local $thin f32) (local $thick f32) (local $i i32) (local $t f32) (local $e f32) (local $f f32) (local $x0 f32) (local $y0 f32)
    (local $x1 f32) (local $y1 f32) (local $mir i32) (local $xm f32) (local $s f32) (local $hs f32) (local $hook f32) (local $cusp f32)
    (local $half i32) (local $wd f32) (local $face i32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $axis (f32.mul (local.get $sz) (f32.const 0.25)))
    (local.set $yc (f32.neg (local.get $axis)))
    (local.set $yt (f32.sub (local.get $yc) (f32.mul (local.get $H) (f32.const 0.5))))
    (local.set $yb (f32.add (local.get $yc) (f32.mul (local.get $H) (f32.const 0.5))))
    (local.set $thin (f32.mul (local.get $sz) (f32.const 0.036)))
    (local.set $thick (f32.mul (local.get $sz) (f32.const 0.078)))
    (local.set $mir (i32.or (i32.or (i32.eq (local.get $cp) (i32.const 41)) (i32.eq (local.get $cp) (i32.const 93)))
                            (i32.or (i32.or (i32.eq (local.get $cp) (i32.const 125)) (i32.eq (local.get $cp) (i32.const 0x27e9)))
                                    (i32.or (i32.eq (local.get $cp) (i32.const 0x230b)) (i32.eq (local.get $cp) (i32.const 0x2309))))))
    (block $shape
      ;; ( ): a bow, flatter in the middle the taller it is
      (if (i32.or (i32.eq (local.get $cp) (i32.const 40)) (i32.eq (local.get $cp) (i32.const 41)))
        (then
          (local.set $w (f32.min (f32.mul (local.get $sz) (f32.const 0.85))
                                 (f32.add (f32.mul (local.get $sz) (f32.const 0.42)) (f32.mul (local.get $H) (f32.const 0.05)))))
          (local.set $xl (f32.mul (local.get $sz) (f32.const 0.12)))
          (local.set $xr (f32.sub (local.get $w) (f32.mul (local.get $sz) (f32.const 0.08))))
          (loop $l
            (local.set $t (f32.div (f32.convert_i32_u (local.get $i)) (f32.const 24)))
            (local.set $e (f32.abs (f32.sub (f32.mul (local.get $t) (f32.const 2)) (f32.const 1))))
            (local.set $f (f32.mul (local.get $e) (local.get $e)))
            (if (f32.gt (local.get $H) (f32.mul (local.get $sz) (f32.const 2.5))) (then (local.set $f (f32.mul (local.get $f) (local.get $e)))))
            (if (f32.gt (local.get $H) (f32.mul (local.get $sz) (f32.const 4))) (then (local.set $f (f32.mul (local.get $f) (local.get $e)))))
            (local.set $x1 (f32.add (local.get $xl) (f32.mul (f32.sub (local.get $xr) (local.get $xl)) (local.get $f))))
            (local.set $y1 (f32.add (local.get $yt) (f32.mul (local.get $t) (local.get $H))))
            (if (local.get $i)
              (then (call $m_seg_m (local.get $x0) (local.get $y0) (local.get $x1) (local.get $y1)
                      (f32.add (local.get $thin) (f32.mul (f32.sub (local.get $thick) (local.get $thin)) (f32.sub (f32.const 1) (local.get $f))))
                      (local.get $w) (local.get $mir))))
            (local.set $x0 (local.get $x1))
            (local.set $y0 (local.get $y1))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br_if $l (i32.le_u (local.get $i) (i32.const 24))))
          (br $shape)))
      ;; [ ] and the floor and ceiling brackets: a stem and one or two feet
      (if (i32.or (i32.or (i32.eq (local.get $cp) (i32.const 91)) (i32.eq (local.get $cp) (i32.const 93)))
                  (i32.eq (i32.and (local.get $cp) (i32.const -4)) (i32.const 0x2308)))
        (then
          (local.set $w (f32.mul (local.get $sz) (f32.const 0.42)))
          (local.set $xl (f32.mul (local.get $sz) (f32.const 0.14)))
          (local.set $xr (f32.sub (local.get $w) (f32.mul (local.get $sz) (f32.const 0.08))))
          (local.set $wd (f32.mul (local.get $sz) (f32.const 0.05)))
          (call $m_seg_m (local.get $xl) (local.get $yt) (local.get $xl) (local.get $yb) (local.get $wd) (local.get $w) (local.get $mir))
          ;; [ ] and the ceilings have a top foot, [ ] and the floors a bottom one
          (if (i32.ne (i32.and (local.get $cp) (i32.const -2)) (i32.const 0x230a))
            (then (call $m_seg_m (local.get $xl) (f32.add (local.get $yt) (f32.mul (local.get $thin) (f32.const 0.5)))
                    (local.get $xr) (f32.add (local.get $yt) (f32.mul (local.get $thin) (f32.const 0.5)))
                    (local.get $thin) (local.get $w) (local.get $mir))))
          (if (i32.ne (i32.and (local.get $cp) (i32.const -2)) (i32.const 0x2308))
            (then (call $m_seg_m (local.get $xl) (f32.sub (local.get $yb) (f32.mul (local.get $thin) (f32.const 0.5)))
                    (local.get $xr) (f32.sub (local.get $yb) (f32.mul (local.get $thin) (f32.const 0.5)))
                    (local.get $thin) (local.get $w) (local.get $mir))))
          (br $shape)))
      ;; { }: hooks at the ends, a stem, and a cusp in the middle
      (if (i32.or (i32.eq (local.get $cp) (i32.const 123)) (i32.eq (local.get $cp) (i32.const 125)))
        (then
          (local.set $w (f32.mul (local.get $sz) (f32.const 0.58)))
          (local.set $xl (f32.mul (local.get $sz) (f32.const 0.1)))
          (local.set $xr (f32.sub (local.get $w) (f32.mul (local.get $sz) (f32.const 0.1))))
          (local.set $xm (f32.mul (f32.add (local.get $xl) (local.get $xr)) (f32.const 0.5)))
          ;; the hooks' length, as a fraction of half the height
          (local.set $hs (f32.min (f32.const 0.4) (f32.div (f32.mul (local.get $sz) (f32.const 0.3)) (f32.mul (local.get $H) (f32.const 0.5)))))
          (loop $halves
            (local.set $i (i32.const 0))
            (loop $l2
              (local.set $s (f32.div (f32.convert_i32_u (local.get $i)) (f32.const 24)))
              (local.set $hook (f32.max (f32.const 0) (f32.sub (f32.const 1) (f32.div (local.get $s) (local.get $hs)))))
              (local.set $hook (f32.mul (local.get $hook) (local.get $hook)))
              (local.set $cusp (f32.max (f32.const 0) (f32.div (f32.sub (local.get $s) (f32.sub (f32.const 1) (local.get $hs))) (local.get $hs))))
              (local.set $cusp (f32.mul (local.get $cusp) (local.get $cusp)))
              (local.set $x1 (f32.sub (f32.add (local.get $xm) (f32.mul (f32.sub (local.get $xr) (local.get $xm)) (local.get $hook)))
                                      (f32.mul (f32.sub (local.get $xm) (local.get $xl)) (local.get $cusp))))
              (local.set $y1
                (if (result f32) (local.get $half)
                  (then (f32.sub (local.get $yb) (f32.mul (local.get $s) (f32.mul (local.get $H) (f32.const 0.5)))))
                  (else (f32.add (local.get $yt) (f32.mul (local.get $s) (f32.mul (local.get $H) (f32.const 0.5))))))) 
              (if (local.get $i)
                (then (call $m_seg_m (local.get $x0) (local.get $y0) (local.get $x1) (local.get $y1)
                        (f32.add (local.get $thin) (f32.mul (f32.sub (local.get $thick) (local.get $thin))
                                                            (f32.sub (f32.const 1) (f32.max (local.get $hook) (local.get $cusp)))))
                        (local.get $w) (local.get $mir))))
              (local.set $x0 (local.get $x1))
              (local.set $y0 (local.get $y1))
              (local.set $i (i32.add (local.get $i) (i32.const 1)))
              (br_if $l2 (i32.le_u (local.get $i) (i32.const 24))))
            (local.set $half (i32.add (local.get $half) (i32.const 1)))
            (br_if $halves (i32.lt_u (local.get $half) (i32.const 2))))
          (br $shape)))
      ;; | and double bars
      (if (i32.eq (local.get $cp) (i32.const 124))
        (then
          (local.set $w (f32.mul (local.get $sz) (f32.const 0.28)))
          (local.set $wd (f32.mul (local.get $sz) (f32.const 0.055)))
          (call $mi_seg (f32.mul (local.get $w) (f32.const 0.5)) (f32.add (local.get $yt) (f32.mul (local.get $wd) (f32.const 0.5)))
                        (f32.mul (local.get $w) (f32.const 0.5)) (f32.sub (local.get $yb) (f32.mul (local.get $wd) (f32.const 0.5)))
                        (local.get $wd))
          (br $shape)))
      (if (i32.eq (local.get $cp) (i32.const 0x2225))
        (then
          (local.set $w (f32.mul (local.get $sz) (f32.const 0.5)))
          (local.set $wd (f32.mul (local.get $sz) (f32.const 0.055)))
          (local.set $xm (f32.mul (local.get $sz) (f32.const 0.16)))
          (call $mi_seg (local.get $xm) (f32.add (local.get $yt) (f32.mul (local.get $wd) (f32.const 0.5)))
                        (local.get $xm) (f32.sub (local.get $yb) (f32.mul (local.get $wd) (f32.const 0.5))) (local.get $wd))
          (call $mi_seg (f32.sub (local.get $w) (local.get $xm)) (f32.add (local.get $yt) (f32.mul (local.get $wd) (f32.const 0.5)))
                        (f32.sub (local.get $w) (local.get $xm)) (f32.sub (local.get $yb) (f32.mul (local.get $wd) (f32.const 0.5))) (local.get $wd))
          (br $shape)))
      ;; angle brackets
      (if (i32.or (i32.eq (local.get $cp) (i32.const 0x27e8)) (i32.eq (local.get $cp) (i32.const 0x27e9)))
        (then
          (local.set $w (f32.min (f32.mul (local.get $sz) (f32.const 0.9))
                                 (f32.add (f32.mul (local.get $sz) (f32.const 0.36)) (f32.mul (local.get $H) (f32.const 0.06)))))
          (local.set $xl (f32.mul (local.get $sz) (f32.const 0.1)))
          (local.set $xr (f32.sub (local.get $w) (f32.mul (local.get $sz) (f32.const 0.1))))
          (local.set $wd (f32.mul (local.get $thin) (f32.const 1.3)))
          (call $m_seg_m (local.get $xr) (local.get $yt) (local.get $xl) (local.get $yc) (local.get $wd) (local.get $w) (local.get $mir))
          (call $m_seg_m (local.get $xl) (local.get $yc) (local.get $xr) (local.get $yb) (local.get $wd) (local.get $w) (local.get $mir))
          (br $shape)))
      ;; slashes
      (if (i32.or (i32.eq (local.get $cp) (i32.const 47)) (i32.eq (local.get $cp) (i32.const 92)))
        (then
          (local.set $w (f32.add (f32.mul (local.get $H) (f32.const 0.25)) (f32.mul (local.get $sz) (f32.const 0.2))))
          (local.set $xl (f32.mul (local.get $sz) (f32.const 0.1)))
          (local.set $xr (f32.sub (local.get $w) (f32.mul (local.get $sz) (f32.const 0.1))))
          (call $m_seg_m (local.get $xl) (local.get $yb) (local.get $xr) (local.get $yt) (local.get $thin) (local.get $w)
                         (i32.eq (local.get $cp) (i32.const 92)))
          (br $shape)))
      ;; anything else: the biggest glyph there is
      (local.set $face (select (i32.const 8) (i32.const 7) (call $has_glyph (i32.const 8) (call $gid (local.get $cp)))))
      (call $m_glyph_axis (local.get $cp) (local.get $face) (local.get $sz) (local.get $axis))
      (return))
    (call $box0)
    (global.set $bw (local.get $w))
    (global.set $bh (f32.add (local.get $axis) (f32.mul (local.get $H) (f32.const 0.5))))
    (global.set $bd (f32.sub (f32.mul (local.get $H) (f32.const 0.5)) (local.get $axis))))

  ;; A stroke, mirrored in a box $w wide when $mir.
  (func $m_seg_m (param $x0 f32) (param $y0 f32) (param $x1 f32) (param $y1 f32) (param $wd f32) (param $w f32) (param $mir i32)
    (if (local.get $mir)
      (then
        (local.set $x0 (f32.sub (local.get $w) (local.get $x0)))
        (local.set $x1 (f32.sub (local.get $w) (local.get $x1)))))
    (call $mi_seg (local.get $x0) (local.get $y0) (local.get $x1) (local.get $y1) (local.get $wd)))

  ;; \left ... \middle ... \right: the parts are laid out first, then the
  ;; delimiters are made tall enough for all of them (TeX's rule 19:
  ;; 90.1% of the distance from the axis, or all but 0.5em of it).
  (func $m_left (param $st i32) (result i32)
    (local $sz f32) (local $axis f32) (local $ld i32) (local $base i32) (local $a i32) (local $f i32) (local $save i32)
    (local $mh f32) (local $md f32) (local $H f32) (local $dist f32) (local $x f32) (local $h f32) (local $d f32)
    (local $l0 i32) (local $d0 i32) (local $rd i32) (local $end i32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $axis (f32.mul (local.get $sz) (f32.const 0.25)))
    (local.set $ld (call $m_read_delim))
    (local.set $base (global.get $msp))
    (global.set $mleft (i32.add (global.get $mleft) (i32.const 1)))
    ;; parts on MSTK, 32 bytes: first item, w, h, d, the \middle after it
    (block $done
      (loop $part
        (local.set $a (global.get $msp))
        (br_if $done (i32.gt_u (i32.add (local.get $a) (i32.const 32)) (global.get $MSTK_END)))
        (global.set $msp (i32.add (local.get $a) (i32.const 32)))
        (i32.store (local.get $a) (global.get $mi))
        (call $m_list (local.get $st) (i32.const 0) (i32.const 0))
        (f32.store offset=4 (local.get $a) (global.get $bw))
        (f32.store offset=8 (local.get $a) (global.get $bh))
        (f32.store offset=12 (local.get $a) (global.get $bd))
        (i32.store offset=16 (local.get $a) (i32.const -1))
        (local.set $mh (f32.max (local.get $mh) (global.get $bh)))
        (local.set $md (f32.max (local.get $md) (global.get $bd)))
        (call $m_skip)
        (br_if $done (i32.ne (call $m_peek) (i32.const 92)))
        (local.set $save (global.get $mp))
        (call $m_read_name)
        (local.set $f (call $m_lookup (global.get $cn_a) (global.get $cn_n)))
        (if (i32.eqz (local.get $f)) (then (global.set $mp (local.get $save)) (br $done)))
        (if (i32.eq (call $f_kind (local.get $f)) (i32.const 0x15))
          (then (i32.store offset=16 (local.get $a) (call $m_read_delim)) (br $part)))
        (if (i32.eq (call $f_kind (local.get $f)) (i32.const 0x14))
          (then (local.set $rd (call $m_read_delim)) (br $done)))
        (global.set $mp (local.get $save))))
    (global.set $mleft (i32.sub (global.get $mleft) (i32.const 1)))
    (local.set $end (global.get $msp))
    (local.set $dist (f32.max (f32.sub (local.get $mh) (local.get $axis)) (f32.add (local.get $md) (local.get $axis))))
    (local.set $H (f32.max (f32.mul (local.get $dist) (f32.const 1.802))
                           (f32.sub (f32.mul (local.get $dist) (f32.const 2)) (f32.mul (local.get $sz) (f32.const 0.5)))))
    (local.set $l0 (global.get $mi))
    (call $m_delim (local.get $ld) (local.get $H) (local.get $st))
    (local.set $x (global.get $bw))
    (local.set $h (f32.max (local.get $mh) (global.get $bh)))
    (local.set $d (f32.max (local.get $md) (global.get $bd)))
    (local.set $a (local.get $base))
    (block $pd
      (loop $pl
        (br_if $pd (i32.ge_u (local.get $a) (local.get $end)))
        (call $mi_shift (i32.load (local.get $a))
          (if (result i32) (i32.lt_u (i32.add (local.get $a) (i32.const 32)) (local.get $end))
            (then (i32.load offset=32 (local.get $a)))
            (else (local.get $l0)))
          (local.get $x) (f32.const 0))
        (local.set $x (f32.add (local.get $x) (f32.load offset=4 (local.get $a))))
        (if (i32.ge_s (i32.load offset=16 (local.get $a)) (i32.const 0))
          (then
            (local.set $d0 (global.get $mi))
            (call $m_delim (i32.load offset=16 (local.get $a)) (local.get $H) (local.get $st))
            (call $mi_shift (local.get $d0) (global.get $mi) (local.get $x) (f32.const 0))
            (local.set $x (f32.add (local.get $x) (global.get $bw)))
            (local.set $h (f32.max (local.get $h) (global.get $bh)))
            (local.set $d (f32.max (local.get $d) (global.get $bd)))))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $pl)))
    (local.set $d0 (global.get $mi))
    (call $m_delim (local.get $rd) (local.get $H) (local.get $st))
    (call $mi_shift (local.get $d0) (global.get $mi) (local.get $x) (f32.const 0))
    (local.set $x (f32.add (local.get $x) (global.get $bw)))
    (local.set $h (f32.max (local.get $h) (global.get $bh)))
    (local.set $d (f32.max (local.get $d) (global.get $bd)))
    (global.set $msp (local.get $base))
    (call $box0)
    (global.set $bw (local.get $x))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (global.set $btype (i32.const 7))
    (i32.const 7))

  ;; A big operator (\sum, \int): the display-size glyph in display style.
  (func $m_bigop (param $cp i32) (param $st i32) (param $limits i32) (result i32)
    (local $face i32) (local $sz f32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $face (select (i32.const 9) (i32.const 8) (call $is_display (local.get $st))))
    (if (i32.eqz (call $has_glyph (local.get $face) (call $gid (local.get $cp))))
      (then (local.set $face (i32.const 7))))
    (call $m_glyph_axis (local.get $cp) (local.get $face) (local.get $sz) (f32.mul (local.get $sz) (f32.const 0.25)))
    ;; the slanted integrals reach past their advance: that is their width
    (global.set $bw (f32.add (global.get $bw) (global.get $bic)))
    (global.set $btype (i32.const 1))
    (global.set $blim (local.get $limits))
    (i32.const 1))

  ;; An operator name (\sin, \lim) in roman: the command's own name, with
  ;; "lim inf", "lim sup" spaced and \bmod written "mod".
  (func $m_opname (param $t i32) (param $limits i32) (param $st i32) (result i32)
    (local $k i32) (local $c i32) (local $x f32) (local $h f32) (local $d f32) (local $sz f32) (local $lim i32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $lim (i32.and (i32.eq (global.get $cn_n) (i32.const 6))
                             (i32.eq (i32.load16_u offset=4 (global.get $cn_a)) (i32.const 109))))
    (if (i32.eq (i32.load16_u (global.get $cn_a)) (i32.const 98)) (then (local.set $k (i32.const 1))))
    (block $d0
      (loop $l
        (br_if $d0 (i32.ge_u (local.get $k) (global.get $cn_n)))
        (if (i32.and (local.get $lim) (i32.eq (local.get $k) (i32.const 3)))
          (then (local.set $x (f32.add (local.get $x) (f32.div (local.get $sz) (f32.const 6))))))
        (local.set $c (i32.load16_u (i32.add (global.get $cn_a) (i32.shl (local.get $k) (i32.const 1)))))
        (call $gmet (local.get $c) (i32.const 7) (local.get $sz))
        (call $mi_glyph (local.get $c) (i32.const 7) (local.get $sz) (i32.const 0))
        (call $mi_shift (i32.sub (global.get $mi) (i32.const 1)) (global.get $mi) (local.get $x) (f32.const 0))
        (local.set $x (f32.add (local.get $x) (global.get $gw)))
        (local.set $h (f32.max (local.get $h) (global.get $gh)))
        (local.set $d (f32.max (local.get $d) (global.get $gd)))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l)))
    (call $box0)
    (global.set $bw (local.get $x))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (global.set $btype (local.get $t))
    (global.set $blim (local.get $limits))
    (local.get $t))

  ;; An accent over its argument (rule 12), centred on it (leaning with an
  ;; italic letter); wide accents take a larger size to span it.
  (func $m_accent (param $cp i32) (param $wide i32) (param $st i32) (result i32)
    (local $sz f32) (local $bw0 f32) (local $bh0 f32) (local $bd0 f32) (local $ch i32) (local $ic f32) (local $face i32)
    (local $a0 i32) (local $raise f32) (local $cx f32)
    (local.set $sz (call $st_size (local.get $st)))
    (call $m_arg (i32.or (local.get $st) (i32.const 4)))
    (local.set $bw0 (global.get $bw))
    (local.set $bh0 (global.get $bh))
    (local.set $bd0 (global.get $bd))
    (local.set $ch (global.get $bchar))
    (local.set $ic (global.get $bic))
    (local.set $face (i32.const 7))
    (if (local.get $wide)
      (then
        (call $gmet (local.get $cp) (i32.const 7) (local.get $sz))
        (if (f32.gt (local.get $bw0) (f32.mul (f32.sub (global.get $gr) (global.get $gl)) (f32.const 1.6)))
          (then
            (local.set $face (i32.const 8))
            (call $gmet (local.get $cp) (i32.const 8) (local.get $sz))
            (if (f32.gt (local.get $bw0) (f32.mul (f32.sub (global.get $gr) (global.get $gl)) (f32.const 1.4)))
              (then (local.set $face (i32.const 9))))))))
    (local.set $a0 (global.get $mi))
    (call $gmet (local.get $cp) (local.get $face) (local.get $sz))
    (call $mi_glyph (local.get $cp) (local.get $face) (local.get $sz) (i32.const 0))
    (local.set $raise (f32.max (f32.const 0) (f32.sub (local.get $bh0) (f32.mul (local.get $sz) (f32.const 0.431)))))
    (local.set $cx (f32.add (f32.mul (local.get $bw0) (f32.const 0.5)) (select (f32.mul (local.get $ic) (f32.const 0.5)) (f32.const 0) (local.get $ch))))
    (call $mi_shift (local.get $a0) (global.get $mi)
      (f32.sub (local.get $cx) (f32.mul (f32.add (global.get $gl) (global.get $gr)) (f32.const 0.5)))
      (f32.neg (local.get $raise)))
    (call $box0)
    (global.set $bw (local.get $bw0))
    (global.set $bh (f32.max (local.get $bh0) (f32.add (global.get $gh) (local.get $raise))))
    (global.set $bd (local.get $bd0))
    (i32.const 0))

  ;; \overline ($over) or \underline: a rule 3θ clear of the argument.
  (func $m_rule_line (param $st i32) (param $over i32) (result i32)
    (local $th f32) (local $w f32) (local $h f32) (local $d f32)
    (local.set $th (f32.mul (call $st_size (local.get $st)) (f32.const 0.04)))
    (call $m_arg (i32.or (local.get $st) (select (i32.const 4) (i32.const 0) (local.get $over))))
    (local.set $w (global.get $bw))
    (local.set $h (global.get $bh))
    (local.set $d (global.get $bd))
    (if (local.get $over)
      (then
        (call $mi_rule (f32.const 0) (f32.neg (f32.add (local.get $h) (f32.mul (local.get $th) (f32.const 4)))) (local.get $w) (local.get $th))
        (local.set $h (f32.add (local.get $h) (f32.mul (local.get $th) (f32.const 5)))))
      (else
        (call $mi_rule (f32.const 0) (f32.add (local.get $d) (f32.mul (local.get $th) (f32.const 3))) (local.get $w) (local.get $th))
        (local.set $d (f32.add (local.get $d) (f32.mul (local.get $th) (f32.const 5))))))
    (call $box0)
    (global.set $bw (local.get $w))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (i32.const 0))

  ;; \overrightarrow ($right) or \overleftarrow: an arrow the argument's width.
  (func $m_over_arrow (param $st i32) (param $right i32) (result i32)
    (local $sz f32) (local $w f32) (local $h f32) (local $d f32) (local $b0 i32) (local $y f32) (local $lw f32)
    (local $ah f32) (local $al f32) (local $wm f32) (local $tip f32) (local $back f32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $b0 (global.get $mi))
    (call $m_arg (i32.or (local.get $st) (i32.const 4)))
    (local.set $w (global.get $bw))
    (local.set $h (global.get $bh))
    (local.set $d (global.get $bd))
    (local.set $wm (f32.max (local.get $w) (f32.mul (local.get $sz) (f32.const 0.6))))
    (call $mi_shift (local.get $b0) (global.get $mi) (f32.mul (f32.sub (local.get $wm) (local.get $w)) (f32.const 0.5)) (f32.const 0))
    (local.set $lw (f32.mul (local.get $sz) (f32.const 0.045)))
    (local.set $ah (f32.mul (local.get $sz) (f32.const 0.12)))
    (local.set $al (f32.mul (local.get $sz) (f32.const 0.2)))
    (local.set $y (f32.neg (f32.add (local.get $h) (f32.add (f32.mul (local.get $sz) (f32.const 0.16)) (local.get $ah)))))
    (local.set $tip (select (local.get $wm) (f32.const 0) (local.get $right)))
    (local.set $back (select (f32.sub (local.get $wm) (local.get $al)) (local.get $al) (local.get $right)))
    (call $mi_seg (f32.const 0) (local.get $y) (local.get $wm) (local.get $y) (local.get $lw))
    (call $mi_seg (local.get $back) (f32.sub (local.get $y) (local.get $ah)) (local.get $tip) (local.get $y) (local.get $lw))
    (call $mi_seg (local.get $back) (f32.add (local.get $y) (local.get $ah)) (local.get $tip) (local.get $y) (local.get $lw))
    (call $box0)
    (global.set $bw (local.get $wm))
    (global.set $bh (f32.add (f32.neg (local.get $y)) (f32.add (local.get $ah) (local.get $lw))))
    (global.set $bd (local.get $d))
    (i32.const 0))

  ;; \not: the negation slash over the relation $cp (\neq, \notin) or over
  ;; the next atom.
  (func $m_not (param $cp i32) (param $st i32) (result i32)
    (local $t i32) (local $w f32) (local $h f32) (local $d f32) (local $s0 i32) (local $sz f32)
    (local.set $sz (call $st_size (local.get $st)))
    (if (local.get $cp)
      (then (local.set $t (call $m_symbol (local.get $cp) (i32.const 7) (i32.const 3) (local.get $st))))
      (else
        (call $m_skip)
        (local.set $t (call $m_atom (local.get $st)))
        (if (i32.lt_s (local.get $t) (i32.const 0))
          (then (call $box0) (global.set $bw (f32.mul (call $cp_adv (i32.const 7) (i32.const 61)) (local.get $sz))) (local.set $t (i32.const 3))))))
    (local.set $w (global.get $bw))
    (local.set $h (global.get $bh))
    (local.set $d (global.get $bd))
    (local.set $s0 (global.get $mi))
    (call $gmet (i32.const 0x338) (i32.const 7) (local.get $sz))
    (call $mi_glyph (i32.const 0x338) (i32.const 7) (local.get $sz) (i32.const 0))
    (call $mi_shift (local.get $s0) (global.get $mi)
      (f32.sub (f32.mul (local.get $w) (f32.const 0.5)) (f32.mul (f32.add (global.get $gl) (global.get $gr)) (f32.const 0.5)))
      (f32.const 0))
    (call $box0)
    (global.set $bw (local.get $w))
    (global.set $bh (f32.max (local.get $h) (global.get $gh)))
    (global.set $bd (f32.max (local.get $d) (global.get $gd)))
    (global.set $btype (local.get $t))
    (local.get $t))

  ;; \overset{over}{base}, \underset{under}{base} ($k 26 / 27) keep the
  ;; base's class; \stackrel{over}{base} (28) is a relation.
  (func $m_overset (param $k i32) (param $st i32) (result i32)
    (local $sz f32) (local $t0 i32) (local $b0 i32) (local $tw f32) (local $th f32) (local $td f32)
    (local $w f32) (local $h f32) (local $d f32) (local $t i32) (local $wm f32) (local $g f32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $g (f32.mul (local.get $sz) (f32.const 0.12)))
    (local.set $t0 (global.get $mi))
    (call $m_arg (call $st_sup (local.get $st)))
    (local.set $tw (global.get $bw))
    (local.set $th (global.get $bh))
    (local.set $td (global.get $bd))
    (local.set $b0 (global.get $mi))
    (call $m_arg (local.get $st))
    (local.set $w (global.get $bw))
    (local.set $h (global.get $bh))
    (local.set $d (global.get $bd))
    (local.set $t (select (i32.const 3) (global.get $btype) (i32.eq (local.get $k) (i32.const 0x28))))
    (local.set $wm (f32.max (local.get $w) (local.get $tw)))
    (call $mi_shift (local.get $b0) (global.get $mi) (f32.mul (f32.sub (local.get $wm) (local.get $w)) (f32.const 0.5)) (f32.const 0))
    (if (i32.eq (local.get $k) (i32.const 0x27))
      (then
        (call $mi_shift (local.get $t0) (local.get $b0) (f32.mul (f32.sub (local.get $wm) (local.get $tw)) (f32.const 0.5))
          (f32.add (f32.add (local.get $d) (local.get $g)) (local.get $th)))
        (local.set $d (f32.add (f32.add (local.get $d) (local.get $g)) (f32.add (local.get $th) (local.get $td)))))
      (else
        (call $mi_shift (local.get $t0) (local.get $b0) (f32.mul (f32.sub (local.get $wm) (local.get $tw)) (f32.const 0.5))
          (f32.neg (f32.add (f32.add (local.get $h) (local.get $g)) (local.get $td))))
        (local.set $h (f32.add (f32.add (local.get $h) (local.get $g)) (f32.add (local.get $td) (local.get $th))))))
    (call $box0)
    (global.set $bw (local.get $wm))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (global.set $btype (local.get $t))
    (local.get $t))

  ;; \boxed{...}: a frame 0.3em clear of its argument.
  (func $m_boxed (param $st i32) (result i32)
    (local $sz f32) (local $th f32) (local $pad f32) (local $b0 i32) (local $w f32) (local $h f32) (local $d f32) (local $o f32)
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $th (f32.mul (local.get $sz) (f32.const 0.04)))
    (local.set $pad (f32.mul (local.get $sz) (f32.const 0.3)))
    (local.set $o (f32.add (local.get $pad) (local.get $th)))
    (local.set $b0 (global.get $mi))
    (call $m_arg (local.get $st))
    (local.set $w (f32.add (global.get $bw) (f32.mul (local.get $o) (f32.const 2))))
    (local.set $h (f32.add (global.get $bh) (local.get $o)))
    (local.set $d (f32.add (global.get $bd) (local.get $o)))
    (call $mi_shift (local.get $b0) (global.get $mi) (local.get $o) (f32.const 0))
    (call $mi_rule (f32.const 0) (f32.neg (local.get $h)) (local.get $w) (local.get $th))
    (call $mi_rule (f32.const 0) (f32.sub (local.get $d) (local.get $th)) (local.get $w) (local.get $th))
    (call $mi_rule (f32.const 0) (f32.neg (local.get $h)) (local.get $th) (f32.add (local.get $h) (local.get $d)))
    (call $mi_rule (f32.sub (local.get $w) (local.get $th)) (f32.neg (local.get $h)) (local.get $th) (f32.add (local.get $h) (local.get $d)))
    (call $box0)
    (global.set $bw (local.get $w))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (i32.const 0))

  ;; \text{...} in the document's $face (0 roman, 1 bold, 2 italic, 4 mono,
  ;; 5 sans), at the size of the surrounding text: spaces count, "\$"-style
  ;; escapes are the character, and $...$ inside is math again.
  (func $m_text (param $face i32) (param $st i32) (result i32)
    (local $size f32) (local $x f32) (local $h f32) (local $d f32) (local $c i32) (local $depth i32) (local $sp i32)
    (local $s0 i32) (local $one i32)
    ;; the math is set 10% larger than the text around it
    (local.set $size (f32.div (call $st_size (local.get $st)) (f32.const 1.1)))
    (call $m_skip)
    (if (i32.ne (call $m_peek) (i32.const 123))
      (then (local.set $one (i32.const 1)))
      (else (call $m_adv)))
    (local.set $depth (i32.const 1))
    (block $done
      (loop $l
        (local.set $c (call $m_peek))
        (br_if $done (i32.eq (local.get $c) (i32.const -1)))
        (if (i32.eq (local.get $c) (i32.const 125))
          (then
            (br_if $done (local.get $one))
            (call $m_adv)
            (local.set $depth (i32.sub (local.get $depth) (i32.const 1)))
            (br_if $l (local.get $depth))
            ;; a space before the closing brace counts
            (if (local.get $sp)
              (then (local.set $x (f32.add (local.get $x) (f32.mul (call $cp_adv (local.get $face) (i32.const 32)) (local.get $size))))))
            (br $done)))
        (if (i32.eq (local.get $c) (i32.const 123))
          (then
            (call $m_adv)
            (local.set $depth (i32.add (local.get $depth) (i32.const 1)))
            (br $l)))
        (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 10)))
                    (i32.eq (local.get $c) (i32.const 9)))
          (then (call $m_adv) (local.set $sp (i32.const 1)) (br $l)))
        (if (local.get $sp)
          (then
            (local.set $x (f32.add (local.get $x) (f32.mul (call $cp_adv (local.get $face) (i32.const 32)) (local.get $size))))
            (local.set $sp (i32.const 0))))
        (call $m_adv)
        (if (i32.eq (local.get $c) (i32.const 36))
          (then
            (local.set $s0 (global.get $mi))
            (call $m_list (i32.const 1) (i32.const 36) (i32.const 0))
            (if (i32.eq (call $m_peek) (i32.const 36)) (then (call $m_adv)))
            (call $mi_shift (local.get $s0) (global.get $mi) (local.get $x) (f32.const 0))
            (local.set $x (f32.add (local.get $x) (global.get $bw)))
            (local.set $h (f32.max (local.get $h) (global.get $bh)))
            (local.set $d (f32.max (local.get $d) (global.get $bd)))
            (br_if $done (local.get $one))
            (br $l)))
        (if (i32.eq (local.get $c) (i32.const 92))
          (then
            (local.set $c (call $m_peek))
            (br_if $done (i32.eq (local.get $c) (i32.const -1)))
            (if (call $is_letter (local.get $c))
              (then
                ;; a command inside text: skip its name
                (block $nd
                  (loop $nl
                    (br_if $nd (i32.eqz (call $is_letter (call $m_peek))))
                    (call $m_adv)
                    (br $nl)))
                (br $l)))
            (call $m_adv)
            (if (i32.eq (local.get $c) (i32.const 32)) (then (local.set $sp (i32.const 1)) (br $l)))
            (br_if $l (i32.eq (local.get $c) (i32.const 92)))))
        (call $gmet (local.get $c) (call $face_of (local.get $face) (local.get $c)) (local.get $size))
        (call $mi_glyph (local.get $c) (local.get $face) (local.get $size) (i32.const 0))
        (call $mi_shift (i32.sub (global.get $mi) (i32.const 1)) (global.get $mi) (local.get $x) (f32.const 0))
        (local.set $x (f32.add (local.get $x) (global.get $gw)))
        (local.set $h (f32.max (local.get $h) (global.get $gh)))
        (local.set $d (f32.max (local.get $d) (global.get $gd)))
        (br_if $done (local.get $one))
        (br $l)))
    (call $box0)
    (global.set $bw (local.get $x))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (i32.const 0))

  ;; ---------------------------------------------------------------------
  ;; Arrays: environments, \substack, and the lines of an equation
  ;; ---------------------------------------------------------------------

  ;; array{lcr}'s column alignments, one byte each
  (global $COLSPEC i32 (i32.const 0x1972f00))
  (global $ncolspec (mut i32) (i32.const 0))

  ;; \begin{name} ... \end{name}.
  (func $m_env (param $st i32) (result i32)
    (local $na i32) (local $nn i32) (local $f i32) (local $ld i32) (local $rd i32) (local $kind i32) (local $c i32)
    (local $b0 i32) (local $l0 i32) (local $r0 i32) (local $w f32) (local $h f32) (local $d f32) (local $lw f32)
    (local $H f32) (local $dist f32) (local $sz f32) (local $axis f32) (local $save i32)
    (call $m_skip)
    (if (i32.ne (call $m_peek) (i32.const 123)) (then (return (i32.const -1))))
    (call $m_adv)
    (local.set $na (global.get $mp))
    (block $d0
      (loop $l0
        (local.set $c (call $m_peek))
        (br_if $d0 (i32.or (i32.eq (local.get $c) (i32.const -1)) (i32.eq (local.get $c) (i32.const 125))))
        (call $m_adv)
        (br $l0)))
    (local.set $nn (i32.shr_u (i32.sub (global.get $mp) (local.get $na)) (i32.const 1)))
    (call $m_adv)
    (local.set $f (call $m_lookup_in (i32.add (global.get $MTAB) (i32.const 0x2000)) (local.get $na) (local.get $nn)))
    (local.set $kind (i32.const 103))
    (if (local.get $f)
      (then
        (local.set $ld (call $hexn (local.get $f) (i32.const 4)))
        (local.set $rd (call $hexn (i32.add (local.get $f) (i32.const 5)) (i32.const 4)))
        (local.set $kind (i32.load8_u offset=10 (local.get $f))))
      (else (global.set $merr (i32.const 1))))
    (if (i32.eq (local.get $kind) (i32.const 114))
      (then
        ;; {lcr}
        (global.set $ncolspec (i32.const 0))
        (call $m_skip)
        (if (i32.eq (call $m_peek) (i32.const 123))
          (then
            (call $m_adv)
            (block $sd
              (loop $sl
                (local.set $c (call $m_peek))
                (br_if $sd (i32.or (i32.eq (local.get $c) (i32.const -1)) (i32.eq (local.get $c) (i32.const 125))))
                (if (i32.and (i32.or (i32.or (i32.eq (local.get $c) (i32.const 108)) (i32.eq (local.get $c) (i32.const 99)))
                                     (i32.eq (local.get $c) (i32.const 114)))
                             (i32.lt_u (global.get $ncolspec) (i32.const 64)))
                  (then
                    (i32.store8 (i32.add (global.get $COLSPEC) (global.get $ncolspec)) (local.get $c))
                    (global.set $ncolspec (i32.add (global.get $ncolspec) (i32.const 1)))))
                (call $m_adv)
                (br $sl)))
            (call $m_adv)))))
    (local.set $b0 (global.get $mi))
    (call $m_array (local.get $st) (local.get $kind) (i32.const 0))
    ;; \end{name}
    (call $m_skip)
    (if (i32.eq (call $m_peek) (i32.const 92))
      (then
        (local.set $save (global.get $mp))
        (call $m_read_name)
        (local.set $f (call $m_lookup (global.get $cn_a) (global.get $cn_n)))
        (if (i32.and (i32.ne (local.get $f) (i32.const 0)) (i32.eq (call $f_kind (local.get $f)) (i32.const 0x22)))
          (then (call $m_skip_group))
          (else (global.set $mp (local.get $save))))))
    (if (i32.eqz (i32.or (local.get $ld) (local.get $rd))) (then (return (i32.const 0))))
    ;; delimiters, as for \left ... \right
    (local.set $w (global.get $bw))
    (local.set $h (global.get $bh))
    (local.set $d (global.get $bd))
    (local.set $sz (call $st_size (local.get $st)))
    (local.set $axis (f32.mul (local.get $sz) (f32.const 0.25)))
    (local.set $dist (f32.max (f32.sub (local.get $h) (local.get $axis)) (f32.add (local.get $d) (local.get $axis))))
    (local.set $H (f32.max (f32.mul (local.get $dist) (f32.const 1.802))
                           (f32.sub (f32.mul (local.get $dist) (f32.const 2)) (f32.mul (local.get $sz) (f32.const 0.5)))))
    (local.set $l0 (global.get $mi))
    (call $m_delim (local.get $ld) (local.get $H) (local.get $st))
    (local.set $lw (global.get $bw))
    (local.set $h (f32.max (local.get $h) (global.get $bh)))
    (local.set $d (f32.max (local.get $d) (global.get $bd)))
    (call $mi_shift (local.get $b0) (local.get $l0) (local.get $lw) (f32.const 0))
    (local.set $r0 (global.get $mi))
    (call $m_delim (local.get $rd) (local.get $H) (local.get $st))
    (call $mi_shift (local.get $r0) (global.get $mi) (f32.add (local.get $lw) (local.get $w)) (f32.const 0))
    (local.set $w (f32.add (f32.add (local.get $lw) (local.get $w)) (global.get $bw)))
    (local.set $h (f32.max (local.get $h) (global.get $bh)))
    (local.set $d (f32.max (local.get $d) (global.get $bd)))
    (call $box0)
    (global.set $bw (local.get $w))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d))
    (global.set $btype (i32.const 7))
    (i32.const 7))

  ;; Rows of cells split by & and \\, up to the end, \end or $stop. $kind
  ;; is an environment's (m s c C a g r, see the table), S for \substack,
  ;; or T for the whole formula: centred lines, aligned at & if it has any.
  ;; Several rows are centred on the axis.
  (func $m_array (param $st i32) (param $kind i32) (param $stop i32)
    (local $cst i32) (local $base i32) (local $rec i32) (local $row i32) (local $col i32) (local $ncols i32) (local $nrows i32)
    (local $c i32) (local $rows i32) (local $cols i32) (local $a i32) (local $r i32) (local $k i32) (local $i1 i32)
    (local $csz f32) (local $skip f32) (local $strut i32) (local $jot f32) (local $sep f32) (local $x f32) (local $y f32)
    (local $H f32) (local $top f32) (local $axis f32) (local $al i32) (local $dx f32) (local $w f32) (local $wall f32)
    (local $multi i32)
    ;; the cells' style
    (local.set $cst (i32.const 1))
    (if (i32.eq (local.get $kind) (i32.const 115)) (then (local.set $cst (i32.const 2))))
    (if (i32.or (i32.or (i32.eq (local.get $kind) (i32.const 97)) (i32.eq (local.get $kind) (i32.const 103)))
                (i32.or (i32.eq (local.get $kind) (i32.const 67)) (i32.or (i32.eq (local.get $kind) (i32.const 84))
                                                                          (i32.eq (local.get $kind) (i32.const 83)))))
      (then (local.set $cst (i32.and (local.get $st) (i32.const 3)))))
    (if (i32.gt_u (i32.and (local.get $st) (i32.const 3)) (local.get $cst))
      (then (local.set $cst (i32.and (local.get $st) (i32.const 3)))))
    (local.set $base (global.get $msp))
    (global.set $marr (i32.add (global.get $marr) (i32.const 1)))
    ;; cells on MSTK, 32 bytes: first item, row, column, w, h, d
    (block $done
      (loop $cell
        (local.set $rec (global.get $msp))
        (br_if $done (i32.gt_u (i32.add (local.get $rec) (i32.const 32)) (global.get $MSTK_END)))
        (global.set $msp (i32.add (local.get $rec) (i32.const 32)))
        (i32.store (local.get $rec) (global.get $mi))
        (i32.store offset=4 (local.get $rec) (local.get $row))
        (i32.store offset=8 (local.get $rec) (local.get $col))
        (call $m_list (local.get $cst) (local.get $stop)
          (i32.and (i32.and (local.get $col) (i32.const 1))
                   (i32.or (i32.eq (local.get $kind) (i32.const 97)) (i32.eq (local.get $kind) (i32.const 84)))))
        (f32.store offset=12 (local.get $rec) (global.get $bw))
        (f32.store offset=16 (local.get $rec) (global.get $bh))
        (f32.store offset=20 (local.get $rec) (global.get $bd))
        (if (i32.ge_u (local.get $col) (local.get $ncols)) (then (local.set $ncols (i32.add (local.get $col) (i32.const 1)))))
        (call $m_skip)
        (local.set $c (call $m_peek))
        (if (i32.eq (local.get $c) (i32.const 38))
          (then
            (call $m_adv)
            (local.set $col (i32.add (local.get $col) (i32.const 1)))
            (br $cell)))
        (if (call $m_at_rows)
          (then
            (call $m_adv)
            (call $m_adv)
            ;; \\[2pt]: the extra space is not kept
            (call $m_skip)
            (if (i32.eq (call $m_peek) (i32.const 91))
              (then
                (block $bd
                  (loop $bl
                    (local.set $c (call $m_peek))
                    (call $m_adv)
                    (br_if $bd (i32.or (i32.eq (local.get $c) (i32.const -1)) (i32.eq (local.get $c) (i32.const 93))))
                    (br $bl)))))
            (local.set $row (i32.add (local.get $row) (i32.const 1)))
            (local.set $col (i32.const 0))
            (br $cell)))))
    (global.set $marr (i32.sub (global.get $marr) (i32.const 1)))
    (local.set $nrows (i32.add (local.get $row) (i32.const 1)))
    ;; a final \\ leaves an empty row
    (if (i32.and (i32.gt_u (local.get $nrows) (i32.const 1)) (i32.eqz (local.get $col)))
      (then
        (local.set $rec (i32.sub (global.get $msp) (i32.const 32)))
        (if (i32.and (i32.eq (i32.load (local.get $rec)) (global.get $mi)) (f32.eq (f32.load offset=12 (local.get $rec)) (f32.const 0)))
          (then
            (global.set $msp (local.get $rec))
            (local.set $nrows (i32.sub (local.get $nrows) (i32.const 1)))))))
    (if (i32.eq (global.get $msp) (local.get $base))
      (then (call $box0) (return)))
    ;; one cell of a formula is just its list
    (if (i32.and (i32.or (i32.eq (local.get $kind) (i32.const 84)) (i32.eq (local.get $kind) (i32.const 83)))
                 (i32.eq (global.get $msp) (i32.add (local.get $base) (i32.const 32))))
      (then
        (call $box0)
        (global.set $bw (f32.load offset=12 (local.get $base)))
        (global.set $bh (f32.load offset=16 (local.get $base)))
        (global.set $bd (f32.load offset=20 (local.get $base)))
        (global.set $msp (local.get $base))
        (return)))
    ;; row heights and depths, then column widths and positions
    (local.set $rows (global.get $msp))
    (local.set $cols (i32.add (local.get $rows) (i32.shl (local.get $nrows) (i32.const 3))))
    (if (i32.gt_u (i32.add (local.get $cols) (i32.shl (local.get $ncols) (i32.const 3))) (global.get $MSTK_END))
      (then (global.set $msp (local.get $base)) (call $box0) (return)))
    (memory.fill (local.get $rows) (i32.const 0)
      (i32.add (i32.shl (local.get $nrows) (i32.const 3)) (i32.shl (local.get $ncols) (i32.const 3))))
    (local.set $csz (call $st_size (local.get $cst)))
    (local.set $skip (f32.mul (local.get $csz) (f32.const 1.2)))
    (local.set $multi (i32.gt_u (local.get $nrows) (i32.const 1)))
    ;; matrices always get struts; lines of a formula only when several
    (local.set $strut
      (i32.or (i32.eqz (i32.or (i32.or (i32.eq (local.get $kind) (i32.const 97)) (i32.eq (local.get $kind) (i32.const 103)))
                               (i32.or (i32.eq (local.get $kind) (i32.const 84)) (i32.eq (local.get $kind) (i32.const 83)))))
              (i32.and (local.get $multi) (i32.ne (local.get $kind) (i32.const 83)))))
    (local.set $jot
      (if (result f32) (i32.or (i32.or (i32.eq (local.get $kind) (i32.const 97)) (i32.eq (local.get $kind) (i32.const 103)))
                               (i32.eq (local.get $kind) (i32.const 84)))
        (then (f32.mul (local.get $csz) (f32.const 0.3)))
        (else (select (f32.mul (local.get $csz) (f32.const 0.1)) (f32.const 0) (i32.eq (local.get $kind) (i32.const 83))))))
    (local.set $a (local.get $base))
    (block $md
      (loop $ml
        (br_if $md (i32.ge_u (local.get $a) (local.get $rows)))
        (local.set $r (i32.add (local.get $rows) (i32.shl (i32.load offset=4 (local.get $a)) (i32.const 3))))
        (f32.store (local.get $r) (f32.max (f32.load (local.get $r)) (f32.load offset=16 (local.get $a))))
        (f32.store offset=4 (local.get $r) (f32.max (f32.load offset=4 (local.get $r)) (f32.load offset=20 (local.get $a))))
        (local.set $r (i32.add (local.get $cols) (i32.shl (i32.load offset=8 (local.get $a)) (i32.const 3))))
        (f32.store (local.get $r) (f32.max (f32.load (local.get $r)) (f32.load offset=12 (local.get $a))))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $ml)))
    ;; rows: struts, then each row's baseline replaces its height
    (local.set $k (i32.const 0))
    (block $rd
      (loop $rl
        (br_if $rd (i32.ge_u (local.get $k) (local.get $nrows)))
        (local.set $r (i32.add (local.get $rows) (i32.shl (local.get $k) (i32.const 3))))
        (if (local.get $strut)
          (then
            (f32.store (local.get $r) (f32.max (f32.load (local.get $r)) (f32.mul (local.get $skip) (f32.const 0.7))))
            (f32.store offset=4 (local.get $r) (f32.max (f32.load offset=4 (local.get $r)) (f32.mul (local.get $skip) (f32.const 0.3))))))
        (local.set $H (f32.add (local.get $H) (f32.add (f32.load (local.get $r)) (f32.load offset=4 (local.get $r)))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $rl)))
    (local.set $H (f32.add (local.get $H) (f32.mul (local.get $jot) (f32.convert_i32_u (i32.sub (local.get $nrows) (i32.const 1))))))
    (local.set $axis (f32.mul (call $st_size (local.get $st)) (f32.const 0.25)))
    ;; arrays are centred on the axis; a single line of a formula keeps its baseline
    (local.set $top
      (if (result f32) (i32.or (local.get $multi)
                               (i32.eqz (i32.or (i32.or (i32.eq (local.get $kind) (i32.const 97)) (i32.eq (local.get $kind) (i32.const 103)))
                                                (i32.or (i32.eq (local.get $kind) (i32.const 84)) (i32.eq (local.get $kind) (i32.const 83))))))
        (then (f32.neg (f32.add (local.get $axis) (f32.mul (local.get $H) (f32.const 0.5)))))
        (else (f32.neg (f32.load (local.get $rows))))))
    (local.set $y (local.get $top))
    (local.set $k (i32.const 0))
    (block $bd2
      (loop $bl2
        (br_if $bd2 (i32.ge_u (local.get $k) (local.get $nrows)))
        (local.set $r (i32.add (local.get $rows) (i32.shl (local.get $k) (i32.const 3))))
        (local.set $y (f32.add (local.get $y) (f32.load (local.get $r))))
        (f32.store (local.get $r) (local.get $y))
        (local.set $y (f32.add (f32.add (local.get $y) (f32.load offset=4 (local.get $r))) (local.get $jot)))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $bl2)))
    ;; columns: each one's x after its width
    (local.set $k (i32.const 0))
    (block $cd
      (loop $cl
        (br_if $cd (i32.ge_u (local.get $k) (local.get $ncols)))
        (local.set $r (i32.add (local.get $cols) (i32.shl (local.get $k) (i32.const 3))))
        (f32.store offset=4 (local.get $r) (local.get $x))
        (local.set $x (f32.add (local.get $x) (f32.load (local.get $r))))
        (if (i32.lt_u (i32.add (local.get $k) (i32.const 1)) (local.get $ncols))
          (then
            (local.set $sep (local.get $csz))
            (if (i32.or (i32.eq (local.get $kind) (i32.const 97)) (i32.eq (local.get $kind) (i32.const 84)))
              (then (local.set $sep (select (local.get $csz) (f32.const 0) (i32.and (local.get $k) (i32.const 1))))))
            (local.set $x (f32.add (local.get $x) (local.get $sep)))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $cl)))
    (local.set $wall (local.get $x))
    ;; place the cells
    (local.set $a (local.get $base))
    (block $pd
      (loop $pl
        (br_if $pd (i32.ge_u (local.get $a) (local.get $rows)))
        (local.set $k (i32.load offset=8 (local.get $a)))
        (local.set $r (i32.add (local.get $cols) (i32.shl (local.get $k) (i32.const 3))))
        (local.set $w (f32.load offset=12 (local.get $a)))
        ;; alignment: 0 left, 1 centre, 2 right
        (local.set $al (i32.const 1))
        (if (i32.or (i32.eq (local.get $kind) (i32.const 99)) (i32.eq (local.get $kind) (i32.const 67)))
          (then (local.set $al (i32.const 0))))
        (if (i32.or (i32.eq (local.get $kind) (i32.const 97))
                    (i32.and (i32.eq (local.get $kind) (i32.const 84)) (i32.gt_u (local.get $ncols) (i32.const 1))))
          (then (local.set $al (select (i32.const 0) (i32.const 2) (i32.and (local.get $k) (i32.const 1))))))
        (if (i32.and (i32.eq (local.get $kind) (i32.const 114)) (i32.lt_u (local.get $k) (global.get $ncolspec)))
          (then
            (local.set $c (i32.load8_u (i32.add (global.get $COLSPEC) (local.get $k))))
            (local.set $al (select (i32.const 0) (select (i32.const 2) (i32.const 1) (i32.eq (local.get $c) (i32.const 114)))
                                   (i32.eq (local.get $c) (i32.const 108))))))
        (local.set $dx (f32.load offset=4 (local.get $r)))
        (if (i32.eq (local.get $al) (i32.const 1))
          (then (local.set $dx (f32.add (local.get $dx) (f32.mul (f32.sub (f32.load (local.get $r)) (local.get $w)) (f32.const 0.5))))))
        (if (i32.eq (local.get $al) (i32.const 2))
          (then (local.set $dx (f32.add (local.get $dx) (f32.sub (f32.load (local.get $r)) (local.get $w))))))
        (local.set $i1
          (if (result i32) (i32.lt_u (i32.add (local.get $a) (i32.const 32)) (local.get $rows))
            (then (i32.load offset=32 (local.get $a)))
            (else (global.get $mi))))
        (call $mi_shift (i32.load (local.get $a)) (local.get $i1) (local.get $dx)
          (f32.load (i32.add (local.get $rows) (i32.shl (i32.load offset=4 (local.get $a)) (i32.const 3)))))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $pl)))
    (global.set $msp (local.get $base))
    (call $box0)
    (global.set $bw (local.get $wall))
    (global.set $bh (f32.neg (local.get $top)))
    (global.set $bd (f32.add (local.get $top) (local.get $H))))

  ;; ---------------------------------------------------------------------
  ;; Formulas
  ;; ---------------------------------------------------------------------

  ;; Typeset the $n units at MSRC at $size px (text style), in display
  ;; style when $display: items from 0 to $mi, the box in $bw $bh $bd.
  (func $math_layout (param $n i32) (param $size f32) (param $display i32)
    (local $x f32) (local $h f32) (local $d f32) (local $a0 i32) (local $f i32)
    (global.set $mp (global.get $MSRC))
    (global.set $me (i32.add (global.get $MSRC) (i32.shl (local.get $n) (i32.const 1))))
    (global.set $mi (i32.const 0))
    (global.set $msp (global.get $MSTK))
    (global.set $mdep (i32.const 0))
    (global.set $mfont (i32.const 0))
    (global.set $mleft (i32.const 0))
    (global.set $marr (i32.const 0))
    (global.set $merr (i32.const 0))
    (global.set $mbase (local.get $size))
    (block $done
      (loop $more
        (local.set $a0 (global.get $mi))
        (call $m_array (select (i32.const 0) (i32.const 1) (local.get $display)) (i32.const 84) (i32.const 0))
        (call $mi_shift (local.get $a0) (global.get $mi) (local.get $x) (f32.const 0))
        (local.set $x (f32.add (local.get $x) (global.get $bw)))
        (local.set $h (f32.max (local.get $h) (global.get $bh)))
        (local.set $d (f32.max (local.get $d) (global.get $bd)))
        (call $m_skip)
        (br_if $done (i32.eq (call $m_peek) (i32.const -1)))
        ;; a stray \end stopped it: skip that and go on
        (global.set $merr (i32.const 1))
        (if (i32.eq (call $m_peek) (i32.const 92))
          (then
            (call $m_read_name)
            (local.set $f (call $m_lookup (global.get $cn_a) (global.get $cn_n)))
            (if (local.get $f) (then (call $m_skip_group))))
          (else (call $m_adv)))
        (br $more)))
    (call $box0)
    (global.set $bw (local.get $x))
    (global.set $bh (local.get $h))
    (global.set $bd (local.get $d)))

  ;; Copy cells [a, b) into MSRC; returns the number of units.
  (func $math_src (param $a i32) (param $b i32) (result i32)
    (local $n i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $a) (local.get $b)))
        (br_if $d (i32.ge_u (local.get $n) (global.get $MSRC_MAX)))
        (i32.store16 (i32.add (global.get $MSRC) (i32.shl (local.get $n) (i32.const 1)))
          (i32.and (call $get (local.get $a)) (i32.const 0xFFFF)))
        (local.set $n (i32.add (local.get $n) (i32.const 1)))
        (local.set $a (i32.add (local.get $a) (i32.const 1)))
        (br $l)))
    (local.get $n))

  ;; The box of the formula at MSRC, typesetting it only when its source,
  ;; size and style are not in the cache (layout runs over every formula
  ;; after each edit; drawing typesets the visible ones again).
  (global $mc_count (mut i32) (i32.const 0))
  (func $math_measure (param $n i32) (param $size f32) (param $display i32)
    (local $h1 i32) (local $h2 i32) (local $i i32) (local $c i32) (local $slot i32) (local $a i32) (local $probe i32)
    (local.set $h1 (i32.const 0x811c9dc5))
    (local.set $h2 (i32.const 5381))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $i) (local.get $n)))
        (local.set $c (i32.load16_u (i32.add (global.get $MSRC) (i32.shl (local.get $i) (i32.const 1)))))
        (local.set $h1 (i32.mul (i32.xor (local.get $h1) (local.get $c)) (i32.const 0x01000193)))
        (local.set $h2 (i32.add (i32.mul (local.get $h2) (i32.const 33)) (local.get $c)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $l)))
    (local.set $h1 (i32.mul (i32.xor (local.get $h1) (i32.reinterpret_f32 (local.get $size))) (i32.const 0x01000193)))
    (local.set $h1 (i32.mul (i32.xor (local.get $h1) (local.get $display)) (i32.const 0x01000193)))
    (local.set $h2 (i32.add (i32.mul (local.get $h2) (i32.const 33)) (i32.add (local.get $display) (local.get $n))))
    (if (i32.eqz (local.get $h1)) (then (local.set $h1 (i32.const 1))))
    (local.set $slot (i32.and (local.get $h1) (i32.const 4095)))
    (block $miss
      (loop $look
        (local.set $a (i32.add (global.get $MCACHE) (i32.shl (local.get $slot) (i32.const 5))))
        (br_if $miss (i32.eqz (i32.load (local.get $a))))
        (if (i32.and (i32.eq (i32.load (local.get $a)) (local.get $h1)) (i32.eq (i32.load offset=4 (local.get $a)) (local.get $h2)))
          (then
            (call $box0)
            (global.set $bw (f32.load offset=8 (local.get $a)))
            (global.set $bh (f32.load offset=12 (local.get $a)))
            (global.set $bd (f32.load offset=16 (local.get $a)))
            (global.set $merr (i32.load offset=20 (local.get $a)))
            (return)))
        (local.set $slot (i32.and (i32.add (local.get $slot) (i32.const 1)) (i32.const 4095)))
        (local.set $probe (i32.add (local.get $probe) (i32.const 1)))
        (br_if $look (i32.lt_u (local.get $probe) (i32.const 8)))))
    (if (i32.gt_u (global.get $mc_count) (i32.const 3000))
      (then
        (memory.fill (global.get $MCACHE) (i32.const 0) (i32.const 0x20000))
        (global.set $mc_count (i32.const 0))
        (local.set $a (i32.add (global.get $MCACHE) (i32.shl (i32.and (local.get $h1) (i32.const 4095)) (i32.const 5))))))
    (call $math_layout (local.get $n) (local.get $size) (local.get $display))
    (i32.store (local.get $a) (local.get $h1))
    (i32.store offset=4 (local.get $a) (local.get $h2))
    (f32.store offset=8 (local.get $a) (global.get $bw))
    (f32.store offset=12 (local.get $a) (global.get $bh))
    (f32.store offset=16 (local.get $a) (global.get $bd))
    (i32.store offset=20 (local.get $a) (global.get $merr))
    (global.set $mc_count (i32.add (global.get $mc_count) (i32.const 1))))

  ;; Draw the formula last laid out with its origin at (x, y).
  (func $math_draw (param $x f32) (param $y f32) (param $col i32) (param $ecol i32)
    (local $a i32) (local $end i32) (local $k i32) (local $ix f32) (local $iy f32) (local $x0 i32) (local $y0 i32) (local $x1 i32) (local $y1 i32)
    (local.set $a (global.get $MITEMS))
    (local.set $end (i32.add (global.get $MITEMS) (i32.shl (global.get $mi) (i32.const 5))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $a) (local.get $end)))
        (local.set $k (i32.load (local.get $a)))
        (local.set $ix (f32.add (local.get $x) (f32.load offset=4 (local.get $a))))
        (local.set $iy (f32.add (local.get $y) (f32.load offset=8 (local.get $a))))
        (if (i32.eq (local.get $k) (i32.const 1))
          (then
            (call $draw_cp (i32.load offset=12 (local.get $a)) (i32.load offset=16 (local.get $a)) (f32.load offset=20 (local.get $a))
              (i32.and (i32.load offset=24 (local.get $a)) (i32.const 1))
              (i32.trunc_sat_f32_s (f32.nearest (local.get $ix))) (i32.trunc_sat_f32_s (f32.nearest (local.get $iy)))
              (select (local.get $ecol) (local.get $col) (i32.and (i32.load offset=24 (local.get $a)) (i32.const 2))))))
        (if (i32.eq (local.get $k) (i32.const 2))
          (then
            (local.set $x0 (i32.trunc_sat_f32_s (f32.nearest (local.get $ix))))
            (local.set $y0 (i32.trunc_sat_f32_s (f32.nearest (local.get $iy))))
            (local.set $x1 (i32.trunc_sat_f32_s (f32.nearest (f32.add (local.get $ix) (f32.load offset=12 (local.get $a))))))
            (local.set $y1 (i32.trunc_sat_f32_s (f32.nearest (f32.add (local.get $iy) (f32.load offset=16 (local.get $a))))))
            (if (i32.le_s (local.get $x1) (local.get $x0)) (then (local.set $x1 (i32.add (local.get $x0) (i32.const 1)))))
            (if (i32.le_s (local.get $y1) (local.get $y0)) (then (local.set $y1 (i32.add (local.get $y0) (i32.const 1)))))
            (call $fill (local.get $x0) (local.get $y0) (i32.sub (local.get $x1) (local.get $x0)) (i32.sub (local.get $y1) (local.get $y0))
              (local.get $col))))
        (if (i32.eq (local.get $k) (i32.const 3))
          (then
            (call $line (local.get $ix) (local.get $iy)
              (f32.add (local.get $x) (f32.load offset=12 (local.get $a))) (f32.add (local.get $y) (f32.load offset=16 (local.get $a)))
              (f32.max (f32.const 1) (f32.load offset=20 (local.get $a))) (local.get $col))))
        (local.set $a (i32.add (local.get $a) (i32.const 32)))
        (br $l))))

  ;; For tests: typeset the $n units at OUT at $size px and draw it with
  ;; its origin at (x, y) over the current frame. Returns the item count;
  ;; math_box() then holds the width, height and depth.
  (func (export "math_debug") (param $n i32) (param $size f32) (param $display i32) (param $x i32) (param $y i32) (result i32)
    (if (i32.gt_u (local.get $n) (global.get $MSRC_MAX)) (then (local.set $n (global.get $MSRC_MAX))))
    (memory.copy (global.get $MSRC) (global.get $OUT) (i32.shl (local.get $n) (i32.const 1)))
    (call $math_layout (local.get $n) (local.get $size) (local.get $display))
    (call $clip (i32.const 0) (i32.const 0) (global.get $W) (global.get $H))
    (call $math_draw (f32.convert_i32_s (local.get $x)) (f32.convert_i32_s (local.get $y)) (global.get $c_text) (global.get $c_err))
    (global.get $mi))

  (func (export "math_box") (result f32 f32 f32) (global.get $bw) (global.get $bh) (global.get $bd))
