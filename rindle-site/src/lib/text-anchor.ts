// Text-quote anchors for inline comments. A comment remembers the words it was left on (plus some
// context either side and the offset they were found at), not a DOM path, so it survives anything
// that re-renders the same text differently. The string half is pure; the DOM half maps between a
// container's visible text and live Ranges.

export interface TextAnchor {
  quote: string;
  prefix: string;
  suffix: string;
  start: number;
}

export const ANCHOR_CONTEXT = 32;

/** Describe `text[start, end)` as an anchor. */
export function makeAnchor(text: string, start: number, end: number): TextAnchor {
  return {
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - ANCHOR_CONTEXT), start),
    suffix: text.slice(end, end + ANCHOR_CONTEXT),
    start,
  };
}

function commonSuffixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function commonPrefixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/** Find where an anchor's quote sits in `text`. Among repeated occurrences, the one whose context
 *  matches best wins, then the one nearest the recorded offset. Null when the quote is gone. */
export function locateAnchor(text: string, anchor: TextAnchor): { start: number; end: number } | null {
  const { quote, prefix, suffix, start } = anchor;
  if (!quote) return null;
  let best: { start: number; score: number; distance: number } | null = null;
  for (let at = text.indexOf(quote); at !== -1; at = text.indexOf(quote, at + 1)) {
    const score =
      commonSuffixLength(text.slice(Math.max(0, at - prefix.length), at), prefix) +
      commonPrefixLength(text.slice(at + quote.length, at + quote.length + suffix.length), suffix);
    const distance = Math.abs(at - start);
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { start: at, score, distance };
    }
  }
  return best ? { start: best.start, end: best.start + quote.length } : null;
}

// ---- DOM ----

/** Rendered-but-not-textual regions: a Mermaid block shows its source until the diagram replaces
 *  it, so its text is unstable and cannot be anchored to. */
const EXCLUDED = ".mermaid, code.language-mermaid, svg";

export interface TextMap {
  text: string;
  nodes: Text[];
  /** starts[i] is the offset of nodes[i] within `text`. */
  starts: number[];
}

export function collectText(root: Node): TextMap {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(EXCLUDED) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  const starts: number[] = [];
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
    starts.push(text.length);
    text += (node as Text).data;
  }
  return { text, nodes, starts };
}

/** The global offset of a DOM boundary point, or null when it is outside the anchorable text. */
export function offsetOf(map: TextMap, container: Node, offset: number): number | null {
  if (container.nodeType === Node.TEXT_NODE) {
    const index = map.nodes.indexOf(container as Text);
    return index === -1 ? null : map.starts[index] + offset;
  }
  // An element boundary: the offset is a child index. Resolve it to the first text node at or after
  // that point (or the end of the text before it).
  const probe = document.createRange();
  probe.setStart(container, offset);
  for (let i = 0; i < map.nodes.length; i++) {
    if (probe.comparePoint(map.nodes[i], 0) >= 0) return map.starts[i];
  }
  return map.text.length;
}

function boundary(map: TextMap, offset: number, preferNext: boolean): [Text, number] | null {
  if (map.nodes.length === 0) return null;
  // Last node whose start is <= offset (or < offset when a range end should stay in the prior node).
  let lo = 0;
  let hi = map.nodes.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const start = map.starts[mid];
    if (preferNext ? start <= offset : start < offset) lo = mid;
    else hi = mid - 1;
  }
  const node = map.nodes[lo];
  return [node, Math.min(Math.max(0, offset - map.starts[lo]), node.data.length)];
}

export function rangeFromOffsets(map: TextMap, start: number, end: number): Range | null {
  const from = boundary(map, start, true);
  const to = boundary(map, end, false);
  if (!from || !to) return null;
  const range = document.createRange();
  range.setStart(from[0], from[1]);
  range.setEnd(to[0], to[1]);
  return range;
}

/** The text offset under a viewport point, via whichever caret API the browser has. */
export function offsetAtPoint(map: TextMap, x: number, y: number): number | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    return position ? offsetOf(map, position.offsetNode, position.offset) : null;
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  return range ? offsetOf(map, range.startContainer, range.startOffset) : null;
}
