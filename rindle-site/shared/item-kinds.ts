// The one ITEM SPACE every curation surface shares. A framing node — and any future board row —
// stores a polymorphic `(itemType, itemId)` pair that is deliberately not a foreign key, so resolving
// a heterogeneous target is an application concern. This registry is where that concern lives: adding
// a kind is one entry here, one `framingNode…` relationship in app-def.ts, and one branch in the
// resolver fragment (src/components/ItemCard.queries.ts).
//
// The module stays free of React, zod, and the generated schema, because the browser, the API
// authority, the SSR loader, and the replay-safe mutator bodies all import it.

/** Every kind a curation surface can hold, in picker order. */
export const ITEM_KINDS = [
  "thought",
  "post",
  "framing",
  "project",
  "task",
  "question",
  "event",
  "location",
  "book",
  "movie",
  "album",
  "bookmark",
] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

/** How a reader's visibility of a placed target is decided.
 *
 *  - `own` — the row carries its own `private` column. Tasks and projects persist capture-time
 *    visibility (migration 0009) precisely so detaching provenance cannot publish them.
 *  - `thought` — derived from the single source thought that produced the capture, the same
 *    `exists(… , publicThought)` gate the structured lanes apply.
 *  - `entity` — a deduplicated or already-public row that holds no private content of its own.
 *    Movies, albums, and bookmarks are corpus-wide entities whose privacy is otherwise inferred from
 *    their mentions; a curation surface renders only the entity's own fields (title, artwork, year),
 *    never a mention note or a source-thought link, so placing one publishes exactly the title and
 *    artwork the author dragged and nothing behind it. Placing IS publishing for these kinds.
 */
export type ItemPrivacyModel = "own" | "thought" | "entity";

export interface ItemKindProfile {
  readonly kind: ItemKind;
  /** The table a node's `itemId` resolves against. */
  readonly table: ItemKind;
  readonly label: string;
  readonly plural: string;
  /** The structured capture tag that mints this kind, where one does. */
  readonly code: string | null;
  readonly privacy: ItemPrivacyModel;
}

/** `as const satisfies` keeps each `table` a string literal, so a mutator can hand it straight to
 *  `tx.row(...)` without widening to `string`. */
export const ITEM_KIND_PROFILES = {
  thought: { kind: "thought", table: "thought", label: "Thought", plural: "Thoughts", code: null, privacy: "own" },
  post: { kind: "post", table: "post", label: "Post", plural: "Posts", code: null, privacy: "entity" },
  framing: { kind: "framing", table: "framing", label: "Framing", plural: "Framings", code: "#f", privacy: "own" },
  project: { kind: "project", table: "project", label: "Project", plural: "Projects", code: "#p", privacy: "own" },
  task: { kind: "task", table: "task", label: "Task", plural: "Tasks", code: "#t", privacy: "own" },
  question: { kind: "question", table: "question", label: "Question", plural: "Questions", code: "#q", privacy: "thought" },
  event: { kind: "event", table: "event", label: "Event", plural: "Events", code: "#e", privacy: "thought" },
  location: { kind: "location", table: "location", label: "Location", plural: "Locations", code: "#l", privacy: "thought" },
  book: { kind: "book", table: "book", label: "Book", plural: "Books", code: "#b", privacy: "thought" },
  movie: { kind: "movie", table: "movie", label: "Movie", plural: "Movies", code: "#m", privacy: "entity" },
  album: { kind: "album", table: "album", label: "Album", plural: "Music", code: "#a", privacy: "entity" },
  bookmark: { kind: "bookmark", table: "bookmark", label: "Bookmark", plural: "Bookmarks", code: null, privacy: "entity" },
} as const satisfies Record<ItemKind, ItemKindProfile>;

/** The kinds the canvas renders through the shared `<ItemCard>` rather than a bespoke node. Thoughts,
 *  posts, and framings keep their own canvas nodes: they carry surface-specific behavior (reply and
 *  link expansion, permalinks, double-click to enter) that a card has no business owning. */
export const ENRICHMENT_ITEM_KINDS = [
  "project",
  "task",
  "question",
  "event",
  "location",
  "book",
  "movie",
  "album",
  "bookmark",
] as const;

export type EnrichmentItemKind = (typeof ENRICHMENT_ITEM_KINDS)[number];

export function isItemKind(value: string): value is ItemKind {
  return (ITEM_KINDS as readonly string[]).includes(value);
}

export function isEnrichmentItemKind(value: string): value is EnrichmentItemKind {
  return (ENRICHMENT_ITEM_KINDS as readonly string[]).includes(value);
}

/** The key a surface uses to test whether an item is already placed. One spelling, so the picker's
 *  "placed" dimming and the node rows can never drift apart. */
export function itemKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}
