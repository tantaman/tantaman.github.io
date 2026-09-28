#!/usr/bin/env node
// Assembles src/editor.wat into src/editor.wasm.
//
// This is an assembler, not a compiler: wabt's wat2wasm maps each hand-written
// text instruction to its binary opcode one-for-one. No optimization passes run.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initWabt from 'wabt';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src/editor.wat');
const out = path.join(root, 'src/editor.wasm');

const wabt = await initWabt();
let mod;
try {
  mod = wabt.parseWat('editor.wat', readFileSync(src, 'utf8'), {
    bulk_memory: true,
    multi_value: true,
  });
  mod.validate();
} catch (err) {
  console.error(String(err.message ?? err));
  process.exit(1);
}
const { buffer } = mod.toBinary({ write_debug_names: true });
mod.destroy();
writeFileSync(out, buffer);
console.log(`editor.wasm: ${buffer.length} bytes`);
