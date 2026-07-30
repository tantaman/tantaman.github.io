import type { ReactNode } from "react";
import { Rindle, useRindleStore } from "@rindle/react";

// Typeahead queries are one-way: once the term changes, that exact view is not useful again. Keep
// Rindle's normal warm-view window everywhere else, but release search views as soon as their last
// reader unmounts.
export function SearchQueryBoundary({ children }: { children: ReactNode }) {
  const store = useRindleStore();
  return <Rindle store={store} releaseDelayMs={0}>{children}</Rindle>;
}
