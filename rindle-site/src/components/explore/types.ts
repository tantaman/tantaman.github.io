export type ExploreItemKind = "thought" | "post" | "paste";
export type ExploreExpansionKind = "direct" | "similar" | "curated" | "temporal" | "mixed";

export interface ExploreItem {
  kind: ExploreItemKind;
  id: string;
  title: string;
  preview: string;
  timestamp: number;
  date: string;
  color: string | null;
  meta?: string;
  directCount?: number;
}

export interface ExploreCandidate {
  itemKind: ExploreItemKind;
  itemId: string;
  kind: string;
  label: string | null;
  score: number | null;
  evidence: string | null;
  projectionVersion: string | null;
  direction?: "outbound" | "inbound";
}
