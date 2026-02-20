import { VFile } from 'vfile';
import { h } from 'hastscript';

export default async function bareLayout(tree: ReturnType<typeof h>, file: VFile) {
  // No-op: don't wrap body in any layout elements.
  // The page content controls all its own styling and structure.
}
