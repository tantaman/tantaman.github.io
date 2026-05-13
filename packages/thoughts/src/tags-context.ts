import { createContext } from 'react';

export const TagsContext = createContext<{
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedFraming: number | null;
  selectFraming: (id: number | null) => void;
}>({
  selectedTags: [],
  toggleTag: () => {},
  selectedFraming: null,
  selectFraming: () => {},
});
