;; ui-code.wat -- syntax highlighting for code blocks with a language
;; ("```ts"). One tokenizer serves every language; a language is a few
;; lines of text in the table below:
;;   L aliases        the names a fence may use
;;   F flags          hex, see below
;;   C a b            line comment starts
;;   B open close     block comment delimiters
;;   K / V / T words  keywords, constants, and built-in types
;; Flags:
;;   1 "strings"  2 'strings'  4 `strings` that may span lines
;;   8 """triple""" and '''triple''' strings
;;   10 keywords ignore case          20 Lisp: symbol characters, and the
;;                                       word after "(" is a call
;;   40 $variables                     80 @decorators
;;   100 #directives at a line start   200 Capitalized words are types
;;   400 a word before "(" is a call   800 :atoms are constants
;;   1000 markup: <tags attr="">, <!-- -->, &entities;
;;   2000 block comments nest         4000 a line's first word or string
;;                                       before ":" or "=" is a key
;;   8000 diff: lines by their first character
;;   10000 "-" inside words            20000 'a is a lifetime unless it closes
;;   40000 \commands are keywords      80000 "." inside words
;;   100000 "$" inside words
;; A block comment or a string still open at a line's end carries on in the
;; next line: the tokenizer's state at each code line's start is kept in
;; its line record (see ui-layout.wat). States: 0 none, 1 block comment
;; (+ depth << 3), 2 `string`, 3 """string""", 4 '''string''', 5 <!--
;; comment, 6 inside a <tag>.
;;
;; Token classes, coloured by the palette at HLPAL: 0 text, 1 keyword,
;; 2 string, 3 number or constant, 4 comment, 5 type, 6 function, 7 key,
;; attribute or directive, 8 tag, 9 variable, 10 diff added, 11 removed.

  (data (i32.const 0x1973000)
    "L js javascript jsx mjs cjs node\n"
    "F 100687\nC //\nB /* */\n"
    "K break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static switch throw try typeof var void while with yield async await get set as\n"
    "V true false null undefined NaN Infinity this super\n"
    "T console window document globalThis\n"
    "L ts typescript tsx mts cts\n"
    "F 100687\nC //\nB /* */\n"
    "K break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static switch throw try typeof var void while with yield async await get set as interface type enum implements namespace declare abstract readonly private protected public keyof infer is asserts satisfies module override unique\n"
    "V true false null undefined NaN Infinity this super\n"
    "T string number boolean any unknown never void object symbol bigint console window document globalThis\n"
    "L json jsonc json5 geojson webmanifest\n"
    "F 4001\nC //\nB /* */\n"
    "V true false null\n"
    "L py python python3 gyp pyi\n"
    "F 68b\nC #\n"
    "K and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case\n"
    "V True False None self cls\n"
    "T int float str bool list dict set tuple bytes object type range len print isinstance super Exception\n"
    "L rs rust\n"
    "F 22603\nC //\nB /* */\n"
    "K as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while macro_rules\n"
    "V true false None Some Ok Err\n"
    "T i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box Rc Arc HashMap HashSet\n"
    "L go golang\n"
    "F 407\nC //\nB /* */\n"
    "K break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var\n"
    "V true false nil iota\n"
    "T bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr any comparable make len cap append new panic recover copy delete print println close\n"
    "L c h cpp c++ cc cxx hpp hh hxx objc objective-c ino cu cuda\n"
    "F 703\nC //\nB /* */\n"
    "K auto break case catch class const constexpr continue default delete do else enum explicit extern for friend goto if inline mutable namespace new noexcept operator private protected public register return sizeof static static_cast dynamic_cast reinterpret_cast const_cast struct switch template this throw try typedef typename union using virtual volatile while override final\n"
    "V true false NULL nullptr\n"
    "T int char float double void long short signed unsigned bool size_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t std string vector map\n"
    "L java\n"
    "F 683\nC //\nB /* */\n"
    "K abstract assert break case catch class continue default do else enum extends final finally for if implements import instanceof interface native new package private protected public return static super switch synchronized this throw throws transient try volatile while var record\n"
    "V true false null\n"
    "T boolean byte char double float int long short void String Object\n"
    "L kt kotlin kts\n"
    "F 68b\nC //\nB /* */\n"
    "K as break class continue do else for fun if in interface is object package return super this throw try typealias val var when while by companion data enum sealed override open private public internal lateinit suspend\n"
    "V true false null\n"
    "L swift\n"
    "F 68b\nC //\nB /* */\n"
    "K class struct enum protocol extension func var let if else guard switch case default for while repeat return break continue import in init deinit self Self super throws throw try catch do as is static private public internal fileprivate open mutating inout where associatedtype some any async await\n"
    "V true false nil\n"
    "L cs csharp c#\n"
    "F 783\nC //\nB /* */\n"
    "K abstract as base break case catch checked class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe using var virtual volatile while async await get set record\n"
    "V true false null\n"
    "T bool byte char decimal double float int long object sbyte short string uint ulong ushort void\n"
    "L scala sc sbt\n"
    "F 68b\nC //\nB /* */\n"
    "K abstract case catch class def do else extends final finally for forSome if implicit import lazy match new object override package private protected return sealed super this throw trait try type val var while with yield given using enum then export\n"
    "V true false null\n"
    "L dart\n"
    "F 68b\nC //\nB /* */\n"
    "K abstract as assert async await break case catch class const continue default do else enum export extends extension external factory final finally for get if implements import in is late library mixin new on operator part required rethrow return set static super switch sync this throw try typedef var void while with yield\n"
    "V true false null\n"
    "L zig\n"
    "F 603\nC //\n"
    "K const var fn pub if else while for switch return break continue struct enum union error try catch defer errdefer comptime inline export extern test and or orelse unreachable usingnamespace async await\n"
    "V true false null undefined\n"
    "T u8 i32 u32 i64 u64 usize isize f32 f64 bool void type anytype\n"
    "L glsl wgsl hlsl frag vert comp shader metal\n"
    "F 703\nC //\nB /* */\n"
    "K fn let var const struct return if else for while loop break continue discard uniform in out inout layout precision switch case default\n"
    "V true false\n"
    "T void bool int uint float double vec2 vec3 vec4 ivec2 ivec3 ivec4 mat2 mat3 mat4 f32 f16 i32 u32 vec2f vec3f vec4f mat4x4f sampler2D texture2D\n"
    "L php\n"
    "F 643\nC // #\nB /* */\n"
    "K abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty extends final finally fn for foreach function global goto if implements include instanceof interface isset list match namespace new or print private protected public readonly require return static switch throw trait try unset use var while yield\n"
    "V true false null TRUE FALSE NULL\n"
    "L rb ruby rake gemspec\n"
    "F a83\nC #\n"
    "K alias and begin break case class def defined do else elsif end ensure for if in module next not or redo rescue retry return self super then undef unless until when while yield require attr_accessor\n"
    "V true false nil\n"
    "L sh bash shell zsh console shellsession fish ksh\n"
    "F 43\nC #\n"
    "K if then else elif fi case esac for while until do done in function return exit break continue local export readonly declare set unset shift source alias echo cd\n"
    "L ps1 powershell pwsh\n"
    "F 53\nC #\nB <# #>\n"
    "K if else elseif switch foreach for while do until function param return break continue try catch finally throw begin process end\n"
    "V true false null\n"
    "L sql mysql postgres postgresql psql sqlite plsql tsql\n"
    "F 13\nC --\nB /* */\n"
    "K select from where and or not insert into values update set delete create table drop alter add column index primary key foreign references join left right inner outer full on as group by order having limit offset union all distinct case when then else end is like in between exists with returning view default unique constraint check begin commit rollback transaction asc desc\n"
    "V true false null\n"
    "T int integer bigint smallint text varchar char boolean date timestamp numeric real serial float double\n"
    "L clj clojure cljs cljc edn lisp scheme scm racket rkt el elisp emacs-lisp fennel hy\n"
    "F 821\nC ;\n"
    "K def defn defn- defmacro defprotocol defrecord deftype defmulti defmethod fn let letfn if if-let when when-let when-not cond condp case do loop recur ns require import try catch finally throw quote var and or not doseq dotimes for let* lambda define set! begin progn setq defun defvar\n"
    "V true false nil\n"
    "L wat wast wasm\n"
    "F 82061\nC ;;\nB (; ;)\n"
    "K module func param result local global memory data table elem type import export start mut offset align funcref externref\n"
    "T i32 i64 f32 f64 v128\n"
    "L html xml svg xhtml htm plist xsl vue svelte astro mathml rss atom\n"
    "F 1000\n"
    "L css scss less sass\n"
    "F 14083\nC //\nB /* */\n"
    "K important\n"
    "L yaml yml\n"
    "F 4003\nC #\n"
    "V true false null yes no on off\n"
    "L toml ini cfg conf properties env dotenv editorconfig gitconfig\n"
    "F 4003\nC # ;\n"
    "V true false\n"
    "L dockerfile docker containerfile\n"
    "F 53\nC #\n"
    "K from run cmd label expose env add copy entrypoint volume user workdir arg onbuild stopsignal healthcheck shell as\n"
    "L make makefile mk mak\n"
    "F 43\nC #\n"
    "K ifeq ifneq ifdef ifndef else endif include define endef export override\n"
    "L lua\n"
    "F 403\nC --\nB --[[ ]]\n"
    "K and break do else elseif end for function goto if in local not or repeat return then until while\n"
    "V true false nil\n"
    "L hs haskell elm purescript\n"
    "F 2201\nC --\nB {- -}\n"
    "K case class data default deriving do else if import in infix infixl infixr instance let module newtype of then type where forall qualified as hiding\n"
    "L ml ocaml mli fs fsharp fsx\n"
    "F 2201\nC //\nB (* *)\n"
    "K let rec in fun function match with if then else type of module open struct sig end begin val mutable and or not\n"
    "V true false\n"
    "L r\n"
    "F 403\nC #\n"
    "K if else repeat while function for in next break return library\n"
    "V TRUE FALSE NULL NA Inf NaN\n"
    "L pl perl pm\n"
    "F 443\nC #\n"
    "K my our local sub if elsif else unless while until for foreach last next redo return use require package do eval print\n"
    "L ex exs elixir\n"
    "F a83\nC #\n"
    "K def defp defmodule defstruct defmacro defprotocol defimpl do end if else unless case cond fn when with for receive try catch rescue after raise import alias require use quote unquote in and or not\n"
    "V true false nil\n"
    "L jl julia\n"
    "F 403\nC #\n"
    "K function end if else elseif for while return module using import export struct mutable abstract type begin let do try catch finally const global local macro quote\n"
    "V true false nothing\n"
    "L graphql gql\n"
    "F 241\nC #\n"
    "K query mutation subscription fragment on type interface union enum input scalar schema extend directive implements\n"
    "V true false null\n"
    "L proto protobuf\n"
    "F 203\nC //\nB /* */\n"
    "K syntax package import option message enum service rpc returns repeated optional required oneof map reserved extend\n"
    "T double float int32 int64 uint32 uint64 bool string bytes\n"
    "L nix\n"
    "F 3\nC #\nB /* */\n"
    "K let in with rec inherit if then else assert import\n"
    "V true false null\n"
    "L matlab octave\n"
    "F 403\nC %\n"
    "K function end if else elseif for while switch case otherwise return break continue\n"
    "L asm nasm x86asm s\n"
    "F 3\nC ; #\n"
    "K mov add sub mul div jmp call ret push pop cmp je jne jz jnz lea and or xor not shl shr inc dec\n"
    "L tex latex bibtex sty cls\n"
    "F 40000\nC %\n"
    "L diff patch\n"
    "F 8000\n"
    "\00")

  (global $HLPAL i32 (i32.const 0x1972f80))

  ;; The palette for token classes, in the theme's colours.
  (func $hl_theme
    (local $a i32)
    (local.set $a (global.get $HLPAL))
    (i32.store (local.get $a) (global.get $c_text))
    (if (global.get $dark)
      (then
        (i32.store offset=4 (local.get $a) (call $rgb (i32.const 0xFF7B72)))
        (i32.store offset=8 (local.get $a) (call $rgb (i32.const 0xA5D6FF)))
        (i32.store offset=12 (local.get $a) (call $rgb (i32.const 0x79C0FF)))
        (i32.store offset=16 (local.get $a) (call $rgb (i32.const 0x8B949E)))
        (i32.store offset=20 (local.get $a) (call $rgb (i32.const 0xFFA657)))
        (i32.store offset=24 (local.get $a) (call $rgb (i32.const 0xD2A8FF)))
        (i32.store offset=28 (local.get $a) (call $rgb (i32.const 0x79C0FF)))
        (i32.store offset=32 (local.get $a) (call $rgb (i32.const 0x7EE787)))
        (i32.store offset=36 (local.get $a) (call $rgb (i32.const 0xFFA657)))
        (i32.store offset=40 (local.get $a) (call $rgb (i32.const 0x7EE787)))
        (i32.store offset=44 (local.get $a) (call $rgb (i32.const 0xFFA198))))
      (else
        (i32.store offset=4 (local.get $a) (call $rgb (i32.const 0xCF222E)))
        (i32.store offset=8 (local.get $a) (call $rgb (i32.const 0x0A3069)))
        (i32.store offset=12 (local.get $a) (call $rgb (i32.const 0x0550AE)))
        (i32.store offset=16 (local.get $a) (call $rgb (i32.const 0x6E7781)))
        (i32.store offset=20 (local.get $a) (call $rgb (i32.const 0x953800)))
        (i32.store offset=24 (local.get $a) (call $rgb (i32.const 0x8250DF)))
        (i32.store offset=28 (local.get $a) (call $rgb (i32.const 0x0550AE)))
        (i32.store offset=32 (local.get $a) (call $rgb (i32.const 0x116329)))
        (i32.store offset=36 (local.get $a) (call $rgb (i32.const 0x953800)))
        (i32.store offset=40 (local.get $a) (call $rgb (i32.const 0x116329)))
        (i32.store offset=44 (local.get $a) (call $rgb (i32.const 0x82071E))))))

  (func $hl_color (param $cls i32) (result i32)
    (i32.load (i32.add (global.get $HLPAL) (i32.shl (local.get $cls) (i32.const 2)))))

  ;; ---------------------------------------------------------------------
  ;; Languages
  ;; ---------------------------------------------------------------------

  ;; the language being tokenized
  (global $hl_flags (mut i32) (i32.const 0))
  (global $hl_c1 (mut i32) (i32.const 0))   ;; line comment starts: address, length
  (global $hl_c1n (mut i32) (i32.const 0))
  (global $hl_c2 (mut i32) (i32.const 0))
  (global $hl_c2n (mut i32) (i32.const 0))
  (global $hl_bo (mut i32) (i32.const 0))   ;; block comments
  (global $hl_bon (mut i32) (i32.const 0))
  (global $hl_bc (mut i32) (i32.const 0))
  (global $hl_bcn (mut i32) (i32.const 0))
  (global $hl_kw (mut i32) (i32.const 0))   ;; word lists, 0 if none
  (global $hl_cv (mut i32) (i32.const 0))
  (global $hl_ty (mut i32) (i32.const 0))

  (func $lower (param $c i32) (result i32)
    (select (i32.or (local.get $c) (i32.const 32)) (local.get $c)
            (i32.lt_u (i32.sub (local.get $c) (i32.const 65)) (i32.const 26))))

  ;; The language named by link-table entry $id (a fence's info string):
  ;; loads it and returns 1, or 0 if there is none by that name. The last
  ;; answer is kept until the next layout ($hl_lid -1 forgets it).
  (global $hl_lid (mut i32) (i32.const -1))
  (global $hl_lok (mut i32) (i32.const 0))
  (func $lang_load (param $id i32) (result i32)
    (if (i32.ne (local.get $id) (global.get $hl_lid))
      (then
        (global.set $hl_lid (local.get $id))
        (global.set $hl_lok (call $lang_find (local.get $id)))))
    (global.get $hl_lok))

  (func $lang_find (param $id i32) (result i32)
    (local $name i32) (local $n i32) (local $p i32) (local $w i32) (local $k i32) (local $c i32)
    (if (i32.eqz (local.get $id)) (then (return (i32.const 0))))
    (local.set $name (call $link_ptr (local.get $id)))
    (local.set $n (call $link_len (local.get $id)))
    (local.set $p (i32.add (global.get $MTAB) (i32.const 0x3000)))
    (block $miss
      (loop $line
        (local.set $c (i32.load8_u (local.get $p)))
        (br_if $miss (i32.eqz (local.get $c)))
        (if (i32.eq (local.get $c) (i32.const 76))
          (then
            ;; each alias on "L a b c"
            (local.set $w (i32.add (local.get $p) (i32.const 2)))
            (block $ld
              (loop $alias
                (local.set $k (i32.const 0))
                (block $no
                  (loop $cmp
                    (local.set $c (i32.load8_u (i32.add (local.get $w) (local.get $k))))
                    (if (i32.ge_u (local.get $k) (local.get $n))
                      (then
                        (if (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 10)))
                          (then (call $lang_fields (local.get $p)) (return (i32.const 1))))
                        (br $no)))
                    (br_if $no (i32.ne (local.get $c)
                      (call $lower (i32.load16_u (i32.add (local.get $name) (i32.shl (local.get $k) (i32.const 1)))))))
                    (local.set $k (i32.add (local.get $k) (i32.const 1)))
                    (br $cmp)))
                ;; next alias
                (block $sd
                  (loop $skip
                    (local.set $c (i32.load8_u (local.get $w)))
                    (br_if $ld (i32.eq (local.get $c) (i32.const 10)))
                    (local.set $w (i32.add (local.get $w) (i32.const 1)))
                    (br_if $sd (i32.eq (local.get $c) (i32.const 32)))
                    (br $skip)))
                (br $alias)))))
        (local.set $p (call $hl_eol (local.get $p)))
        (br $line)))
    (i32.const 0))

  ;; The start of the next line of the table.
  (func $hl_eol (param $p i32) (result i32)
    (block $d
      (loop $l
        (br_if $d (i32.eq (i32.load8_u (local.get $p)) (i32.const 10)))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (i32.add (local.get $p) (i32.const 1)))

  ;; The end of the word at $p (space or newline).
  (func $hl_wend (param $p i32) (result i32)
    (local $c i32)
    (block $d
      (loop $l
        (local.set $c (i32.load8_u (local.get $p)))
        (br_if $d (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 10))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $p))

  ;; Read the lines after a language's "L" line at $p.
  (func $lang_fields (param $p i32)
    (local $c i32) (local $e i32)
    (global.set $hl_flags (i32.const 0))
    (global.set $hl_c1n (i32.const 0))
    (global.set $hl_c2n (i32.const 0))
    (global.set $hl_bon (i32.const 0))
    (global.set $hl_bcn (i32.const 0))
    (global.set $hl_kw (i32.const 0))
    (global.set $hl_cv (i32.const 0))
    (global.set $hl_ty (i32.const 0))
    (block $done
      (loop $line
        (local.set $p (call $hl_eol (local.get $p)))
        (local.set $c (i32.load8_u (local.get $p)))
        (br_if $done (i32.or (i32.eqz (local.get $c)) (i32.eq (local.get $c) (i32.const 76))))
        (if (i32.eq (local.get $c) (i32.const 70))
          (then
            (local.set $e (call $hl_wend (i32.add (local.get $p) (i32.const 2))))
            (global.set $hl_flags (call $hexn (i32.add (local.get $p) (i32.const 2))
                                              (i32.sub (local.get $e) (i32.add (local.get $p) (i32.const 2)))))))
        (if (i32.eq (local.get $c) (i32.const 67))
          (then
            (global.set $hl_c1 (i32.add (local.get $p) (i32.const 2)))
            (local.set $e (call $hl_wend (global.get $hl_c1)))
            (global.set $hl_c1n (i32.sub (local.get $e) (global.get $hl_c1)))
            (if (i32.eq (i32.load8_u (local.get $e)) (i32.const 32))
              (then
                (global.set $hl_c2 (i32.add (local.get $e) (i32.const 1)))
                (global.set $hl_c2n (i32.sub (call $hl_wend (global.get $hl_c2)) (global.get $hl_c2)))))))
        (if (i32.eq (local.get $c) (i32.const 66))
          (then
            (global.set $hl_bo (i32.add (local.get $p) (i32.const 2)))
            (local.set $e (call $hl_wend (global.get $hl_bo)))
            (global.set $hl_bon (i32.sub (local.get $e) (global.get $hl_bo)))
            (global.set $hl_bc (i32.add (local.get $e) (i32.const 1)))
            (global.set $hl_bcn (i32.sub (call $hl_wend (global.get $hl_bc)) (global.get $hl_bc)))))
        (if (i32.eq (local.get $c) (i32.const 75)) (then (global.set $hl_kw (i32.add (local.get $p) (i32.const 2)))))
        (if (i32.eq (local.get $c) (i32.const 86)) (then (global.set $hl_cv (i32.add (local.get $p) (i32.const 2)))))
        (if (i32.eq (local.get $c) (i32.const 84)) (then (global.set $hl_ty (i32.add (local.get $p) (i32.const 2)))))
        (br $line))))

  ;; ---------------------------------------------------------------------
  ;; Tokenizer
  ;; ---------------------------------------------------------------------

  (global $hl_out (mut i32) (i32.const 0))   ;; write classes here (0: only track state)
  (global $hl_from (mut i32) (i32.const 0))  ;; for cells [from, to)
  (global $hl_to (mut i32) (i32.const 0))
  (global $hl_depth (mut i32) (i32.const 0))

  (func $hl_ch (param $p i32) (param $q i32) (result i32)
    (if (result i32) (i32.lt_u (local.get $p) (local.get $q))
      (then (i32.and (call $get (local.get $p)) (i32.const 0xFFFF)))
      (else (i32.const 0))))

  ;; Class $cls for cells [a, b).
  (func $hl_mark (param $a i32) (param $b i32) (param $cls i32)
    (if (i32.eqz (global.get $hl_out)) (then (return)))
    (if (i32.lt_u (local.get $a) (global.get $hl_from)) (then (local.set $a (global.get $hl_from))))
    (if (i32.gt_u (local.get $b) (global.get $hl_to)) (then (local.set $b (global.get $hl_to))))
    (if (i32.lt_u (local.get $a) (local.get $b))
      (then (memory.fill (i32.add (global.get $hl_out) (i32.sub (local.get $a) (global.get $hl_from)))
                         (local.get $cls) (i32.sub (local.get $b) (local.get $a))))))

  ;; Do the cells at $p match the $n ASCII bytes at $s (before $q)?
  (func $hl_at (param $p i32) (param $q i32) (param $s i32) (param $n i32) (result i32)
    (local $k i32)
    (if (i32.or (i32.eqz (local.get $n)) (i32.gt_u (i32.add (local.get $p) (local.get $n)) (local.get $q)))
      (then (return (i32.const 0))))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $k) (local.get $n)))
        (if (i32.ne (call $hl_ch (i32.add (local.get $p) (local.get $k)) (local.get $q))
                    (i32.load8_u (i32.add (local.get $s) (local.get $k))))
          (then (return (i32.const 0))))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $l)))
    (i32.const 1))

  (func $hl_letter (param $c i32) (result i32)
    (i32.or (call $is_letter (local.get $c))
            (i32.or (i32.eq (local.get $c) (i32.const 95)) (i32.ge_u (local.get $c) (i32.const 128)))))

  ;; Can $c continue a word?
  (func $hl_wc (param $c i32) (result i32)
    (local $f i32)
    (local.set $f (global.get $hl_flags))
    (if (i32.or (call $hl_letter (local.get $c)) (call $is_digit (local.get $c))) (then (return (i32.const 1))))
    (if (i32.and (local.get $f) (i32.const 0x20))
      (then
        ;; a Lisp symbol runs to whitespace or one of ()[]{}";,`~@^\'
        (return (i32.and (i32.gt_u (local.get $c) (i32.const 32))
          (i32.eqz (i32.or (i32.or (i32.or (i32.eq (local.get $c) (i32.const 40)) (i32.eq (local.get $c) (i32.const 41)))
                                   (i32.or (i32.eq (local.get $c) (i32.const 91)) (i32.eq (local.get $c) (i32.const 93))))
                           (i32.or (i32.or (i32.or (i32.eq (local.get $c) (i32.const 123)) (i32.eq (local.get $c) (i32.const 125)))
                                           (i32.or (i32.eq (local.get $c) (i32.const 34)) (i32.eq (local.get $c) (i32.const 59))))
                                   (i32.or (i32.or (i32.eq (local.get $c) (i32.const 44)) (i32.eq (local.get $c) (i32.const 96)))
                                           (i32.or (i32.or (i32.eq (local.get $c) (i32.const 126)) (i32.eq (local.get $c) (i32.const 64)))
                                                   (i32.or (i32.eq (local.get $c) (i32.const 94))
                                                           (i32.or (i32.eq (local.get $c) (i32.const 92)) (i32.eq (local.get $c) (i32.const 39)))))))))))))
    (if (i32.and (i32.eq (local.get $c) (i32.const 36)) (i32.ne (i32.and (local.get $f) (i32.const 0x100000)) (i32.const 0)))
      (then (return (i32.const 1))))
    (if (i32.and (i32.eq (local.get $c) (i32.const 45)) (i32.ne (i32.and (local.get $f) (i32.const 0x10000)) (i32.const 0)))
      (then (return (i32.const 1))))
    (i32.and (i32.eq (local.get $c) (i32.const 46)) (i32.ne (i32.and (local.get $f) (i32.const 0x80000)) (i32.const 0))))

  ;; The end of the word starting at $p.
  (func $hl_word (param $p i32) (param $q i32) (result i32)
    (local.set $p (i32.add (local.get $p) (i32.const 1)))
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $q)))
        (br_if $d (i32.eqz (call $hl_wc (call $hl_ch (local.get $p) (local.get $q)))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $p))

  ;; The first non-blank character at or after $p, or 0.
  (func $hl_next (param $p i32) (param $q i32) (result i32)
    (local $c i32)
    (block $d
      (loop $l
        (local.set $c (call $hl_ch (local.get $p) (local.get $q)))
        (br_if $d (i32.eqz (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 9)))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $c))

  ;; Is the word [a, b) in the space-separated $list (ending at a newline)?
  (func $hl_in (param $list i32) (param $a i32) (param $b i32) (param $q i32) (result i32)
    (local $w i32) (local $e i32) (local $k i32) (local $n i32) (local $ci i32) (local $c i32)
    (if (i32.eqz (local.get $list)) (then (return (i32.const 0))))
    (local.set $ci (i32.ne (i32.and (global.get $hl_flags) (i32.const 0x10)) (i32.const 0)))
    (local.set $n (i32.sub (local.get $b) (local.get $a)))
    (local.set $w (local.get $list))
    (block $miss
      (loop $each
        (local.set $e (call $hl_wend (local.get $w)))
        (if (i32.eq (i32.sub (local.get $e) (local.get $w)) (local.get $n))
          (then
            (local.set $k (i32.const 0))
            (block $no
              (loop $cmp
                (if (i32.ge_u (local.get $k) (local.get $n)) (then (return (i32.const 1))))
                (local.set $c (call $hl_ch (i32.add (local.get $a) (local.get $k)) (local.get $q)))
                (if (local.get $ci) (then (local.set $c (call $lower (local.get $c)))))
                (br_if $no (i32.ne (local.get $c) (i32.load8_u (i32.add (local.get $w) (local.get $k)))))
                (local.set $k (i32.add (local.get $k) (i32.const 1)))
                (br $cmp)))))
        (br_if $miss (i32.eq (i32.load8_u (local.get $e)) (i32.const 10)))
        (local.set $w (i32.add (local.get $e) (i32.const 1)))
        (br $each)))
    (i32.const 0))

  ;; The end of a block comment whose body starts at $p, $d deep: after
  ;; its close, or $q with $hl_depth left open.
  (func $hl_comment (param $p i32) (param $q i32) (param $d i32) (result i32)
    (block $done
      (loop $l
        (br_if $done (i32.ge_u (local.get $p) (local.get $q)))
        (if (call $hl_at (local.get $p) (local.get $q) (global.get $hl_bc) (global.get $hl_bcn))
          (then
            (local.set $p (i32.add (local.get $p) (global.get $hl_bcn)))
            (local.set $d (i32.sub (local.get $d) (i32.const 1)))
            (br_if $done (i32.eqz (local.get $d)))
            (br $l)))
        (if (i32.and (i32.ne (i32.and (global.get $hl_flags) (i32.const 0x2000)) (i32.const 0))
                     (call $hl_at (local.get $p) (local.get $q) (global.get $hl_bo) (global.get $hl_bon)))
          (then
            (local.set $p (i32.add (local.get $p) (global.get $hl_bon)))
            (if (i32.lt_u (local.get $d) (i32.const 3)) (then (local.set $d (i32.add (local.get $d) (i32.const 1)))))
            (br $l)))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (global.set $hl_depth (local.get $d))
    (local.get $p))

  ;; The end of a string whose body starts at $p: after the closing quote
  ;; ($n of character $c), or $q, with $hl_depth 1 if it is still open.
  (func $hl_string (param $p i32) (param $q i32) (param $c i32) (param $n i32) (result i32)
    (local $x i32)
    (global.set $hl_depth (i32.const 1))
    (block $done
      (loop $l
        (br_if $done (i32.ge_u (local.get $p) (local.get $q)))
        (local.set $x (call $hl_ch (local.get $p) (local.get $q)))
        (if (i32.eq (local.get $x) (i32.const 92))
          (then (local.set $p (i32.add (local.get $p) (i32.const 2))) (br $l)))
        (if (i32.eq (local.get $x) (local.get $c))
          (then
            (if (i32.or (i32.eq (local.get $n) (i32.const 1))
                        (i32.and (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)) (local.get $c))
                                 (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 2)) (local.get $q)) (local.get $c))))
              (then
                (global.set $hl_depth (i32.const 0))
                (return (i32.add (local.get $p) (local.get $n)))))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (select (local.get $q) (local.get $p) (i32.gt_u (local.get $p) (local.get $q))))

  ;; Tokenize the code line [p, q) starting in $state, marking classes
  ;; (when $hl_out is set). Returns the state at its end.
  (func $hl_scan (param $p i32) (param $q i32) (param $state i32) (result i32)
    (local $f i32) (local $c i32) (local $j i32) (local $cls i32) (local $first i32) (local $head i32) (local $k i32)
    (local $bs i32) (local $n i32)
    (local.set $f (global.get $hl_flags))
    (local.set $bs (local.get $p))
    (if (i32.and (local.get $f) (i32.const 0x8000))
      (then
        (local.set $c (call $hl_ch (local.get $p) (local.get $q)))
        (call $hl_mark (local.get $p) (local.get $q)
          (select (i32.const 10)
            (select (i32.const 11) (select (i32.const 7) (i32.const 0) (i32.eq (local.get $c) (i32.const 64)))
                    (i32.eq (local.get $c) (i32.const 45)))
            (i32.eq (local.get $c) (i32.const 43))))
        (return (i32.const 0))))
    (if (i32.and (local.get $f) (i32.const 0x1000))
      (then (return (call $hl_markup (local.get $p) (local.get $q) (local.get $state)))))
    ;; what the line before left open
    (local.set $k (i32.and (local.get $state) (i32.const 7)))
    (if (i32.eq (local.get $k) (i32.const 1))
      (then
        (local.set $j (call $hl_comment (local.get $p) (local.get $q) (i32.shr_u (local.get $state) (i32.const 3))))
        (call $hl_mark (local.get $p) (local.get $j) (i32.const 4))
        (if (global.get $hl_depth)
          (then (return (i32.or (i32.const 1) (i32.shl (global.get $hl_depth) (i32.const 3))))))
        (local.set $p (local.get $j))))
    (if (i32.and (i32.ge_u (local.get $k) (i32.const 2)) (i32.le_u (local.get $k) (i32.const 4)))
      (then
        (local.set $j (call $hl_string (local.get $p) (local.get $q)
          (select (i32.const 96) (select (i32.const 34) (i32.const 39) (i32.eq (local.get $k) (i32.const 3)))
                  (i32.eq (local.get $k) (i32.const 2)))
          (select (i32.const 1) (i32.const 3) (i32.eq (local.get $k) (i32.const 2)))))
        (call $hl_mark (local.get $p) (local.get $j) (i32.const 2))
        (if (global.get $hl_depth) (then (return (local.get $k))))
        (local.set $p (local.get $j))))
    (local.set $first (i32.const 1))
    (block $end
      (loop $tok
        (br_if $end (i32.ge_u (local.get $p) (local.get $q)))
        (local.set $c (call $hl_ch (local.get $p) (local.get $q)))
        (if (i32.or (i32.eq (local.get $c) (i32.const 32)) (i32.eq (local.get $c) (i32.const 9)))
          (then (local.set $p (i32.add (local.get $p) (i32.const 1))) (br $tok)))
        ;; comments
        (if (call $hl_at (local.get $p) (local.get $q) (global.get $hl_bo) (global.get $hl_bon))
          (then
            (local.set $j (call $hl_comment (i32.add (local.get $p) (global.get $hl_bon)) (local.get $q) (i32.const 1)))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 4))
            (if (global.get $hl_depth)
              (then (return (i32.or (i32.const 1) (i32.shl (global.get $hl_depth) (i32.const 3))))))
            (local.set $p (local.get $j))
            (br $tok)))
        (if (i32.or (call $hl_at (local.get $p) (local.get $q) (global.get $hl_c1) (global.get $hl_c1n))
                    (call $hl_at (local.get $p) (local.get $q) (global.get $hl_c2) (global.get $hl_c2n)))
          (then (call $hl_mark (local.get $p) (local.get $q) (i32.const 4)) (return (i32.const 0))))
        ;; #directives
        (if (i32.and (i32.and (i32.ne (i32.and (local.get $f) (i32.const 0x100)) (i32.const 0)) (local.get $first))
                     (i32.eq (local.get $c) (i32.const 35)))
          (then (call $hl_mark (local.get $p) (local.get $q) (i32.const 7)) (return (i32.const 0))))
        ;; strings
        (if (i32.or (i32.or (i32.and (i32.eq (local.get $c) (i32.const 34)) (i32.ne (i32.and (local.get $f) (i32.const 1)) (i32.const 0)))
                            (i32.and (i32.eq (local.get $c) (i32.const 96)) (i32.ne (i32.and (local.get $f) (i32.const 4)) (i32.const 0))))
                    (i32.and (i32.and (i32.eq (local.get $c) (i32.const 39)) (i32.ne (i32.and (local.get $f) (i32.const 2)) (i32.const 0)))
                             (i32.or (i32.eqz (i32.and (local.get $f) (i32.const 0x20000))) (call $hl_charlit (local.get $p) (local.get $q)))))
          (then
            (local.set $n (i32.const 1))
            (if (i32.and (i32.ne (i32.and (local.get $f) (i32.const 8)) (i32.const 0))
                         (i32.and (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)) (local.get $c))
                                  (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 2)) (local.get $q)) (local.get $c))))
              (then (local.set $n (i32.const 3))))
            (local.set $j (call $hl_string (i32.add (local.get $p) (local.get $n)) (local.get $q) (local.get $c) (local.get $n)))
            (local.set $cls (i32.const 2))
            (if (i32.and (i32.and (i32.ne (i32.and (local.get $f) (i32.const 0x4000)) (i32.const 0)) (local.get $first))
                         (i32.eq (call $hl_next (local.get $j) (local.get $q)) (i32.const 58)))
              (then (local.set $cls (i32.const 7))))
            (call $hl_mark (local.get $p) (local.get $j) (local.get $cls))
            ;; still open at the line's end: backticks and triple quotes go on
            (if (global.get $hl_depth)
              (then
                (if (i32.eq (local.get $c) (i32.const 96)) (then (return (i32.const 2))))
                (if (i32.eq (local.get $n) (i32.const 3))
                  (then (return (select (i32.const 3) (i32.const 4) (i32.eq (local.get $c) (i32.const 34))))))))
            (local.set $p (local.get $j))
            (local.set $first (i32.const 0))
            (local.set $head (i32.const 0))
            (br $tok)))
        ;; Rust lifetimes
        (if (i32.and (i32.eq (local.get $c) (i32.const 39)) (i32.ne (i32.and (local.get $f) (i32.const 0x20000)) (i32.const 0)))
          (then
            (local.set $j (call $hl_word (local.get $p) (local.get $q)))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 5))
            (local.set $p (local.get $j))
            (br $tok)))
        ;; numbers
        (if (i32.or (call $is_digit (local.get $c))
                    (i32.and (i32.eq (local.get $c) (i32.const 46)) (call $is_digit (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)))))
          (then
            (local.set $j (i32.add (local.get $p) (i32.const 1)))
            (block $nd
              (loop $nl
                (local.set $c (call $hl_ch (local.get $j) (local.get $q)))
                (br_if $nd (i32.eqz (i32.or (i32.or (call $is_letter (local.get $c)) (call $is_digit (local.get $c)))
                  (i32.or (i32.eq (local.get $c) (i32.const 95))
                          (i32.and (i32.eq (local.get $c) (i32.const 46))
                                   (call $is_digit (call $hl_ch (i32.add (local.get $j) (i32.const 1)) (local.get $q))))))))
                (local.set $j (i32.add (local.get $j) (i32.const 1)))
                (br $nl)))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 3))
            (local.set $p (local.get $j))
            (local.set $first (i32.const 0))
            (local.set $head (i32.const 0))
            (br $tok)))
        ;; $variables
        (if (i32.and (i32.eq (local.get $c) (i32.const 36)) (i32.ne (i32.and (local.get $f) (i32.const 0x40)) (i32.const 0)))
          (then
            (local.set $j (i32.add (local.get $p) (i32.const 1)))
            (local.set $c (call $hl_ch (local.get $j) (local.get $q)))
            (if (i32.eq (local.get $c) (i32.const 123))
              (then
                (block $vd
                  (loop $vl
                    (br_if $vd (i32.ge_u (local.get $j) (local.get $q)))
                    (local.set $c (call $hl_ch (local.get $j) (local.get $q)))
                    (local.set $j (i32.add (local.get $j) (i32.const 1)))
                    (br_if $vd (i32.eq (local.get $c) (i32.const 125)))
                    (br $vl))))
              (else
                (if (call $hl_wc (local.get $c))
                  (then (local.set $j (call $hl_word (local.get $j) (local.get $q))))
                  (else
                    (if (i32.gt_u (local.get $c) (i32.const 32)) (then (local.set $j (i32.add (local.get $j) (i32.const 1)))))))))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 9))
            (local.set $p (local.get $j))
            (local.set $first (i32.const 0))
            (local.set $head (i32.const 0))
            (br $tok)))
        ;; @decorators, :atoms, \commands
        (if (i32.and (i32.and (i32.eq (local.get $c) (i32.const 64)) (i32.ne (i32.and (local.get $f) (i32.const 0x80)) (i32.const 0)))
                     (call $hl_letter (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q))))
          (then
            (local.set $j (call $hl_word (i32.add (local.get $p) (i32.const 1)) (local.get $q)))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 7))
            (local.set $p (local.get $j))
            (local.set $first (i32.const 0))
            (br $tok)))
        (if (i32.and (i32.and (i32.eq (local.get $c) (i32.const 58)) (i32.ne (i32.and (local.get $f) (i32.const 0x800)) (i32.const 0)))
                     (i32.and (call $hl_letter (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)))
                              (i32.or (i32.eq (local.get $p) (local.get $bs))
                                      (i32.eqz (i32.or (call $hl_wc (call $hl_ch (i32.sub (local.get $p) (i32.const 1)) (local.get $q)))
                                                       (i32.eq (call $hl_ch (i32.sub (local.get $p) (i32.const 1)) (local.get $q)) (i32.const 58)))))))
          (then
            (local.set $j (call $hl_word (i32.add (local.get $p) (i32.const 1)) (local.get $q)))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 3))
            (local.set $p (local.get $j))
            (local.set $first (i32.const 0))
            (local.set $head (i32.const 0))
            (br $tok)))
        (if (i32.and (i32.eq (local.get $c) (i32.const 92)) (i32.ne (i32.and (local.get $f) (i32.const 0x40000)) (i32.const 0)))
          (then
            (local.set $j (i32.add (local.get $p) (i32.const 2)))
            (if (call $is_letter (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)))
              (then
                (local.set $j (i32.add (local.get $p) (i32.const 1)))
                (block $td
                  (loop $tl
                    (br_if $td (i32.eqz (call $is_letter (call $hl_ch (local.get $j) (local.get $q)))))
                    (local.set $j (i32.add (local.get $j) (i32.const 1)))
                    (br $tl)))))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 1))
            (local.set $p (local.get $j))
            (br $tok)))
        ;; words
        (if (i32.or (call $hl_letter (local.get $c))
                    (i32.or (i32.and (i32.eq (local.get $c) (i32.const 36)) (i32.ne (i32.and (local.get $f) (i32.const 0x100000)) (i32.const 0)))
                            (i32.and (i32.ne (i32.and (local.get $f) (i32.const 0x20)) (i32.const 0)) (call $hl_wc (local.get $c)))))
          (then
            (local.set $j (call $hl_word (local.get $p) (local.get $q)))
            ;; (only drawing needs to know what the word is)
            (if (global.get $hl_out)
              (then (call $hl_mark (local.get $p) (local.get $j)
                      (call $hl_classify (local.get $p) (local.get $j) (local.get $q) (local.get $first) (local.get $head)))))
            (local.set $p (local.get $j))
            (local.set $first (i32.const 0))
            (local.set $head (i32.const 0))
            (br $tok)))
        ;; anything else is punctuation; "(" makes the next Lisp word a call
        (local.set $head (i32.eq (local.get $c) (i32.const 40)))
        ;; "- key: value" in YAML is still a line's first word
        (local.set $first (i32.and (local.get $first) (i32.eq (local.get $c) (i32.const 45))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $tok)))
    (i32.const 0))

  ;; For Rust: is the "'" at $p a character literal ('a', '\n') rather
  ;; than a lifetime ('a)?
  (func $hl_charlit (param $p i32) (param $q i32) (result i32)
    (if (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)) (i32.const 92)) (then (return (i32.const 1))))
    (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 2)) (local.get $q)) (i32.const 39)))

  ;; The class of the word [a, b).
  (func $hl_classify (param $a i32) (param $b i32) (param $q i32) (param $first i32) (param $head i32) (result i32)
    (local $f i32) (local $n i32)
    (local.set $f (global.get $hl_flags))
    (if (call $hl_in (global.get $hl_kw) (local.get $a) (local.get $b) (local.get $q)) (then (return (i32.const 1))))
    (if (call $hl_in (global.get $hl_cv) (local.get $a) (local.get $b) (local.get $q)) (then (return (i32.const 3))))
    (if (call $hl_in (global.get $hl_ty) (local.get $a) (local.get $b) (local.get $q)) (then (return (i32.const 5))))
    (if (i32.and (i32.ne (i32.and (local.get $f) (i32.const 0x20)) (i32.const 0)) (local.get $head))
      (then (return (i32.const 6))))
    (local.set $n (call $hl_next (local.get $b) (local.get $q)))
    (if (i32.and (i32.and (i32.ne (i32.and (local.get $f) (i32.const 0x4000)) (i32.const 0)) (local.get $first))
                 (i32.or (i32.eq (local.get $n) (i32.const 58)) (i32.eq (local.get $n) (i32.const 61))))
      (then (return (i32.const 7))))
    (if (i32.and (i32.ne (i32.and (local.get $f) (i32.const 0x400)) (i32.const 0))
                 (i32.or (i32.eq (local.get $n) (i32.const 40))
                         (i32.and (i32.eq (local.get $n) (i32.const 33)) (i32.ne (i32.and (local.get $f) (i32.const 0x20000)) (i32.const 0)))))
      (then (return (i32.const 6))))
    (if (i32.and (i32.ne (i32.and (local.get $f) (i32.const 0x200)) (i32.const 0))
                 (call $is_upper (call $hl_ch (local.get $a) (local.get $q))))
      (then (return (i32.const 5))))
    (i32.const 0))

  ;; Markup (HTML, XML): <tag attr="value">, <!-- comments -->, &entities;
  (func $hl_markup (param $p i32) (param $q i32) (param $state i32) (result i32)
    (local $c i32) (local $j i32) (local $intag i32)
    (local.set $intag (i32.eq (local.get $state) (i32.const 6)))
    (if (i32.eq (local.get $state) (i32.const 5))
      (then
        (local.set $j (call $hl_find (local.get $p) (local.get $q) (i32.const 3)))
        (call $hl_mark (local.get $p) (local.get $j) (i32.const 4))
        (if (i32.ge_u (local.get $j) (local.get $q)) (then (return (i32.const 5))))
        (local.set $p (local.get $j))))
    (block $end
      (loop $tok
        (br_if $end (i32.ge_u (local.get $p) (local.get $q)))
        (local.set $c (call $hl_ch (local.get $p) (local.get $q)))
        (if (local.get $intag)
          (then
            (if (i32.eq (local.get $c) (i32.const 62))
              (then (local.set $intag (i32.const 0)) (local.set $p (i32.add (local.get $p) (i32.const 1))) (br $tok)))
            (if (i32.or (i32.eq (local.get $c) (i32.const 34)) (i32.eq (local.get $c) (i32.const 39)))
              (then
                (local.set $j (call $hl_string (i32.add (local.get $p) (i32.const 1)) (local.get $q) (local.get $c) (i32.const 1)))
                (call $hl_mark (local.get $p) (local.get $j) (i32.const 2))
                (local.set $p (local.get $j))
                (br $tok)))
            (if (i32.or (call $hl_letter (local.get $c)) (i32.or (call $is_digit (local.get $c)) (i32.eq (local.get $c) (i32.const 45))))
              (then
                (local.set $j (call $hl_name (local.get $p) (local.get $q)))
                (call $hl_mark (local.get $p) (local.get $j) (i32.const 7))
                (local.set $p (local.get $j))
                (br $tok)))
            (local.set $p (i32.add (local.get $p) (i32.const 1)))
            (br $tok)))
        (if (i32.and (i32.eq (local.get $c) (i32.const 60))
                     (i32.and (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)) (i32.const 33))
                              (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 2)) (local.get $q)) (i32.const 45))))
          (then
            (local.set $j (call $hl_find (i32.add (local.get $p) (i32.const 4)) (local.get $q) (i32.const 3)))
            (call $hl_mark (local.get $p) (local.get $j) (i32.const 4))
            (if (i32.ge_u (local.get $j) (local.get $q)) (then (return (i32.const 5))))
            (local.set $p (local.get $j))
            (br $tok)))
        (if (i32.eq (local.get $c) (i32.const 60))
          (then
            (local.set $j (i32.add (local.get $p) (i32.const 1)))
            (local.set $c (call $hl_ch (local.get $j) (local.get $q)))
            (if (i32.or (i32.or (i32.eq (local.get $c) (i32.const 47)) (i32.eq (local.get $c) (i32.const 33))) (i32.eq (local.get $c) (i32.const 63)))
              (then (local.set $j (i32.add (local.get $j) (i32.const 1)))))
            (if (call $hl_letter (call $hl_ch (local.get $j) (local.get $q)))
              (then
                (local.set $p (call $hl_name (local.get $j) (local.get $q)))
                (call $hl_mark (local.get $j) (local.get $p) (i32.const 8))
                (local.set $intag (i32.const 1))
                (br $tok)))
            (local.set $p (local.get $j))
            (br $tok)))
        (if (i32.eq (local.get $c) (i32.const 38))
          (then
            (local.set $j (i32.add (local.get $p) (i32.const 1)))
            (block $ed
              (loop $el
                (local.set $c (call $hl_ch (local.get $j) (local.get $q)))
                (br_if $ed (i32.eqz (i32.or (call $hl_letter (local.get $c))
                                            (i32.or (call $is_digit (local.get $c)) (i32.eq (local.get $c) (i32.const 35))))))
                (local.set $j (i32.add (local.get $j) (i32.const 1)))
                (br $el)))
            (if (i32.eq (call $hl_ch (local.get $j) (local.get $q)) (i32.const 59))
              (then (call $hl_mark (local.get $p) (i32.add (local.get $j) (i32.const 1)) (i32.const 3))))
            (local.set $p (i32.add (local.get $p) (i32.const 1)))
            (br $tok)))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $tok)))
    (select (i32.const 6) (i32.const 0) (local.get $intag)))

  ;; The end of a tag or attribute name at $p.
  (func $hl_name (param $p i32) (param $q i32) (result i32)
    (local $c i32)
    (block $d
      (loop $l
        (local.set $c (call $hl_ch (local.get $p) (local.get $q)))
        (br_if $d (i32.eqz (i32.or (i32.or (call $hl_letter (local.get $c)) (call $is_digit (local.get $c)))
                                   (i32.or (i32.eq (local.get $c) (i32.const 45))
                                           (i32.or (i32.eq (local.get $c) (i32.const 58)) (i32.eq (local.get $c) (i32.const 46)))))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $p))

  ;; After the first "-->" at or after $p ($n = 3), or $q.
  (func $hl_find (param $p i32) (param $q i32) (param $n i32) (result i32)
    (block $d
      (loop $l
        (br_if $d (i32.ge_u (local.get $p) (local.get $q)))
        (if (i32.and (i32.eq (call $hl_ch (local.get $p) (local.get $q)) (i32.const 45))
                     (i32.and (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 1)) (local.get $q)) (i32.const 45))
                              (i32.eq (call $hl_ch (i32.add (local.get $p) (i32.const 2)) (local.get $q)) (i32.const 62))))
          (then (return (i32.add (local.get $p) (local.get $n)))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (br $l)))
    (local.get $q))

  ;; The classes of the cells [from, to) of the code line [bs, q) that
  ;; starts in $state, in the language with link id $lang, into HLBUF.
  ;; Returns 0 when there is no such language (plain code).
  (func $hl_line (param $lang i32) (param $bs i32) (param $q i32) (param $state i32) (param $from i32) (param $to i32) (result i32)
    (if (i32.gt_u (i32.sub (local.get $to) (local.get $from)) (global.get $HL_MAX))
      (then (local.set $to (i32.add (local.get $from) (global.get $HL_MAX)))))
    (if (i32.eqz (call $lang_load (local.get $lang))) (then (return (i32.const 0))))
    (memory.fill (global.get $HLBUF) (i32.const 0) (i32.sub (local.get $to) (local.get $from)))
    (global.set $hl_out (global.get $HLBUF))
    (global.set $hl_from (local.get $from))
    (global.set $hl_to (local.get $to))
    (drop (call $hl_scan (local.get $bs) (local.get $q) (local.get $state)))
    (global.set $hl_out (i32.const 0))
    (i32.const 1))
