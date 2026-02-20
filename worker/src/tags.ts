export function extractTags(body: string): string[] {
  const matches = body.matchAll(/(^|[\s])#([a-zA-Z][a-zA-Z0-9_-]*)/g);
  const tags = new Set<string>();
  for (const m of matches) tags.add(m[2].toLowerCase());
  return [...tags];
}
