import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRoot } from "@rindle/react";
import type { ResultType } from "@rindle/react";

import {
  THOUGHTS_MAX_LIMIT,
  THOUGHTS_PAGE_SIZE,
  thoughtAdminFeedQuery,
  thoughtsQuery,
} from "./ThoughtCard.queries.ts";
import type { ThoughtCardData } from "./ThoughtCard.tsx";

interface ThoughtsFeedValue {
  thoughts: readonly ThoughtCardData[];
  status: ResultType;
  isAdmin: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

const ThoughtsFeedContext = createContext<ThoughtsFeedValue | null>(null);

export function PublicThoughtsFeedProvider({ children }: { children: ReactNode }) {
  const [limit, setLimit] = useState(THOUGHTS_PAGE_SIZE);
  const [rows, { status }] = useRoot(thoughtsQuery, { limit });
  return (
    <ThoughtsFeedLease rows={rows} status={status} limit={limit} setLimit={setLimit} isAdmin={false}>
      {children}
    </ThoughtsFeedLease>
  );
}

export function AdminThoughtsFeedProvider({ children }: { children: ReactNode }) {
  const [limit, setLimit] = useState(THOUGHTS_PAGE_SIZE);
  const [rows, { status }] = useRoot(thoughtAdminFeedQuery, { limit });
  return (
    <ThoughtsFeedLease rows={rows} status={status} limit={limit} setLimit={setLimit} isAdmin>
      {children}
    </ThoughtsFeedLease>
  );
}

function ThoughtsFeedLease({
  rows,
  status,
  limit,
  setLimit,
  isAdmin,
  children,
}: {
  rows: readonly ThoughtCardData[];
  status: ResultType;
  limit: number;
  setLimit: Dispatch<SetStateAction<number>>;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const nextRows = rows.slice(0, limit);
  const renderedRowsRef = useRef(nextRows);

  // A raised limit opens a new remote view. Preserve the old exact window during its one-render
  // warmup, then accept the completed result—including deletions and privacy moves.
  if (status === "complete" || nextRows.length > renderedRowsRef.current.length) {
    renderedRowsRef.current = nextRows;
  }

  const loadMore = useCallback(() => {
    setLimit((current) => Math.min(current + THOUGHTS_PAGE_SIZE, THOUGHTS_MAX_LIMIT));
  }, [setLimit]);
  const value = useMemo<ThoughtsFeedValue>(() => ({
    thoughts: renderedRowsRef.current,
    status,
    isAdmin,
    hasMore: limit < THOUGHTS_MAX_LIMIT && rows.length > limit,
    loadMore,
  }), [isAdmin, limit, loadMore, rows, status]);

  return <ThoughtsFeedContext.Provider value={value}>{children}</ThoughtsFeedContext.Provider>;
}

export function useThoughtsFeed(): ThoughtsFeedValue {
  const value = useContext(ThoughtsFeedContext);
  if (!value) throw new Error("useThoughtsFeed() must be used inside the thoughts layout route.");
  return value;
}
