export function extractThoughtLinks(body: string): number[] {
  const ids = new Set<number>();
  for (const m of body.matchAll(/\[\[(\d+)\]\]/g)) {
    ids.add(parseInt(m[1], 10));
  }
  return [...ids];
}
