export type ItemStatus = 'candidate' | 'shortlist' | 'keep' | 'own' | 'cut';

export interface Photo {
  key: string;
  type: string;
  name: string;
}

export interface ItemLink {
  url: string;
  title?: string;
  image?: string;
  price_cents?: number;
}

export interface Item {
  id: number;
  name: string | null;
  brand: string | null;
  photos: Photo[];
  links: ItemLink[];
  price_cents: number | null;
  notes: string;
  facets: Record<string, string>;
  status: ItemStatus;
  rating: number | null;
  created_at: number;
  updated_at: number;
}

export interface FacetOption {
  value: string;
  label: string;
}

export interface FacetDef {
  key: string;
  label: string;
  options: FacetOption[];
}

export interface Target {
  category: string;
  min: number;
  max: number;
}

export interface ItemsResponse {
  items: Item[];
  meta: { hasMore: boolean };
}

export interface OutfitSummary {
  id: number;
  name: string;
  occasion: string | null;
  notes: string;
  cover_attachment_key: string | null;
  prefer_mosaic_cover: number;
  created_at: number;
  updated_at: number;
  item_ids: number[];
  thumbnails: { item_id: number; photo_key: string | null }[];
}

export interface OutfitDetail {
  id: number;
  name: string;
  occasion: string | null;
  notes: string;
  cover_attachment_key: string | null;
  prefer_mosaic_cover: number;
  created_at: number;
  updated_at: number;
  items: Item[];
}
