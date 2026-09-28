#!/usr/bin/env node
// Assembles the hand-written WAT modules:
//   src/editor.wat -> src/editor.wasm   the engine alone (DOM editor)
//   src/canvas.wat -> src/canvas.wasm   engine + graphical front end
//
// This is an assembler, not a compiler: wabt's wat2wasm maps each hand-written
// text instruction to its binary opcode one-for-one. No optimization passes run.
// Two text directives are expanded first:
//   ;; @include path   splices another .wat file in place
//   ;; @font           the font atlas data segment (scripts/font-atlas.mjs)

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initWabt from 'wabt';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['editor', 'canvas'];

/** Expand directives; `map[i]` is the [file, line] that output line i came from. */
async function expand(file, out, map) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const include = /^\s*;; @include (\S+)\s*$/.exec(lines[i]);
    if (include) {
      await expand(path.join(path.dirname(file), include[1]), out, map);
      continue;
    }
    if (/^\s*;; @font\s*$/.test(lines[i])) {
      const { fontDataSegment } = await import('./font-atlas.mjs');
      for (const generated of (await fontDataSegment()).split('\n')) {
        out.push(generated);
        map.push(['<font atlas>', 0]);
      }
      continue;
    }
    out.push(lines[i]);
    map.push([path.relative(root, file), i + 1]);
  }
}

const wabt = await initWabt();
const requested = process.argv.slice(2);
for (const name of requested.length ? requested : MODULES) {
  const out = [];
  const map = [];
  await expand(path.join(root, `src/${name}.wat`), out, map);
  let mod;
  try {
    mod = wabt.parseWat(`${name}.wat`, out.join('\n'), { bulk_memory: true, multi_value: true, sat_float_to_int: true, sign_extension: true, mutable_globals: true });
    mod.validate();
  } catch (err) {
    // point errors at the original file and line
    const message = String(err.message ?? err).replace(/[\w.-]+\.wat:(\d+):(\d+)/g, (_, line, col) => {
      const [file, orig] = map[Number(line) - 1] ?? ['?', line];
      return `${file}:${orig}:${col}`;
    });
    console.error(message);
    process.exit(1);
  }
  const { buffer } = mod.toBinary({ write_debug_names: true });
  mod.destroy();
  writeFileSync(path.join(root, `src/${name}.wasm`), buffer);
  console.log(`${name}.wasm: ${buffer.length} bytes`);
}
