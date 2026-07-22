# Search architecture

The port does not need the legacy generated `docs/search.json`. That file is currently about 2.3 MB,
while the source post markdown alone is about 3.36 MB. Subscribing every browser to every full body
would replace one large initial transfer with a larger one.

## Text retrieval: live Rindle candidate windows

`src/components/Search.queries.ts` defines one public named query per content table. A debounced search
opens three bounded views:

- posts: title, description, body, tags, and concerns;
- public thoughts: body;
- shared, current pastes: body, excerpt, and language.

Every input term must occur in at least one searchable field. Rindle evaluates the incrementally
maintained `ilike` filters and syncs only matching rows. The browser merges those rows and applies
field-weighted ranking. Each query returns one lookahead row, and “Search deeper” ratchets its limit
up. A post edit, new public thought, sharing change, or paste fork changes an open result view without
re-fetching a static index.

This deliberately separates candidate retrieval from ranking: Rindle answers “which live rows can
match?” and cheap local code answers “which of these matches is most useful?”

## Semantic retrieval: vector candidates, Rindle hydration

Semantic search should be a second candidate source rather than embeddings synchronized into every
browser. The existing discovery migration already sets the intended boundary: embeddings live in a
vector service; small renderable projections live in Rindle.

The next slice should:

1. Chunk and embed public post, thought, and shared-paste text after authoritative writes/imports.
   Vector metadata carries `itemKind`, `itemId`, chunk position, projection version, visibility, and
   the source content revision.
2. Add an authenticated `/api/search/semantic` endpoint. It embeds the query and returns a bounded
   list of IDs, snippets, revisions, and vector ranks. The browser never receives database or vector
   service credentials.
3. Hydrate those IDs through bounded named Rindle queries (`inList` is supported), selecting the
   current title/preview/revision for each kind. Drop a stale vector hit when its indexed revision no
   longer matches the Rindle row.
4. Fuse lexical and semantic ranks with reciprocal-rank fusion. Raw lexical and cosine scores are not
   directly comparable; rank fusion also lets exact-title matches remain strong.
5. Keep the current text path as the authoritative live baseline. Semantic results can merge in after
   the vector round trip without blanking already-visible matches.

This produces one search UI with two retrieval paths and one live source of display truth. The vector
index may be eventually consistent; the Rindle row shown to the user is current.
