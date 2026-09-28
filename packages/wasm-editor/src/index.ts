import { Engine, type WasmSource } from './engine.ts';
import { RichTextEditor, type EditorOptions } from './editor.ts';

export { BlockType, CHECKED, Engine, Mark } from './engine.ts';
export type { EngineStats, RenderedBlock, WasmSource } from './engine.ts';
export { RichTextEditor, normalizeUrl } from './editor.ts';
export type { EditorOptions, EditorState } from './editor.ts';
export { htmlToCells } from './html-import.ts';

let compiled: Promise<WebAssembly.Module> | null = null;

/** The bundled editor.wasm, compiled once and shared by every editor. */
export function wasmModule(): Promise<WebAssembly.Module> {
  compiled ??= (async () => {
    const response = await fetch(new URL('./editor.wasm', import.meta.url));
    if (!response.ok) throw new Error(`editor.wasm: HTTP ${response.status}`);
    try {
      return await WebAssembly.compileStreaming(response.clone());
    } catch {
      return WebAssembly.compile(await response.arrayBuffer());
    }
  })();
  return compiled;
}

/**
 * Turn `root` into a rich text editor. Each editor gets its own WASM
 * instance (and so its own memory).
 */
export async function createEditor(
  root: HTMLElement,
  options: EditorOptions & { wasm?: WasmSource } = {},
): Promise<RichTextEditor> {
  const engine = await Engine.load(options.wasm ?? (await wasmModule()));
  return new RichTextEditor(root, engine, options);
}
