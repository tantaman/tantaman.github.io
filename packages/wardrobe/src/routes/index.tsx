import { createFileRoute } from '@tanstack/react-router';
import { Gallery } from '../components/Gallery';
import type { ItemStatus } from '../types';

export type GallerySearch = {
  status?: ItemStatus | 'all';
  facets?: Record<string, string>;
  showCut?: boolean;
};

const ALLOWED_STATUSES: Array<ItemStatus | 'all'> = ['all', 'candidate', 'shortlist', 'keep', 'own', 'cut'];

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): GallerySearch => {
    const out: GallerySearch = {};
    if (typeof search.status === 'string' && (ALLOWED_STATUSES as string[]).includes(search.status)) {
      out.status = search.status as ItemStatus | 'all';
    }
    if (search.facets && typeof search.facets === 'object' && !Array.isArray(search.facets)) {
      const facets: Record<string, string> = {};
      for (const [k, v] of Object.entries(search.facets as Record<string, unknown>)) {
        if (typeof v === 'string' && v && /^[a-zA-Z0-9_\-]+$/.test(k)) {
          facets[k] = v;
        }
      }
      if (Object.keys(facets).length > 0) out.facets = facets;
    }
    if (search.showCut === true || search.showCut === 'true') out.showCut = true;
    return out;
  },
  component: Gallery,
});
