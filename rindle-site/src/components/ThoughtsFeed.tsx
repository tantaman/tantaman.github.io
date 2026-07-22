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
  THOUGHT_FEED_REPLIES_MAX_LIMIT,
  THOUGHT_FEED_REPLIES_PAGE_SIZE,
  THOUGHTS_MAX_LIMIT,
  THOUGHTS_PAGE_SIZE,
  thoughtAdminFeedQuery,
  thoughtAdminRepliesQuery,
  thoughtRepliesQuery,
  thoughtsQuery,
} from "./ThoughtCard.queries.ts";
import type { ThoughtCardData } from "./ThoughtCard.tsx";

interface ThoughtsFeedValue {
  thoughts: readonly ThoughtCardData[];
  replies: readonly ThoughtCardData[];
  status: ResultType;
  replyStatus: ResultType;
  isAdmin: boolean;
  hasMore: boolean;
  hasMoreReplies: boolean;
  loadMore: () => void;
  loadMoreReplies: () => void;
  revealNewestReplies: () => void;
}

const ThoughtsFeedContext = createContext<ThoughtsFeedValue | null>(null);

export function PublicThoughtsFeedProvider({ children }: { children: ReactNode }) {
  const [limit, setLimit] = useState(THOUGHTS_PAGE_SIZE);
  const [replyLimit, setReplyLimit] = useState(THOUGHT_FEED_REPLIES_PAGE_SIZE);
  const [rows, { status }] = useRoot(thoughtsQuery, { limit });
  const [replyRows, { status: replyStatus }] = useRoot(thoughtRepliesQuery, { limit: replyLimit });
  return (
    <ThoughtsFeedLease
      rows={rows}
      replyRows={replyRows}
      status={status}
      replyStatus={replyStatus}
      limit={limit}
      replyLimit={replyLimit}
      setLimit={setLimit}
      setReplyLimit={setReplyLimit}
      isAdmin={false}
    >
      {children}
    </ThoughtsFeedLease>
  );
}

export function AdminThoughtsFeedProvider({ children }: { children: ReactNode }) {
  const [limit, setLimit] = useState(THOUGHTS_PAGE_SIZE);
  const [replyLimit, setReplyLimit] = useState(THOUGHT_FEED_REPLIES_PAGE_SIZE);
  const [rows, { status }] = useRoot(thoughtAdminFeedQuery, { limit });
  const [replyRows, { status: replyStatus }] = useRoot(thoughtAdminRepliesQuery, { limit: replyLimit });
  return (
    <ThoughtsFeedLease
      rows={rows}
      replyRows={replyRows}
      status={status}
      replyStatus={replyStatus}
      limit={limit}
      replyLimit={replyLimit}
      setLimit={setLimit}
      setReplyLimit={setReplyLimit}
      isAdmin
    >
      {children}
    </ThoughtsFeedLease>
  );
}

function ThoughtsFeedLease({
  rows,
  replyRows,
  status,
  replyStatus,
  limit,
  replyLimit,
  setLimit,
  setReplyLimit,
  isAdmin,
  children,
}: {
  rows: readonly ThoughtCardData[];
  replyRows: readonly ThoughtCardData[];
  status: ResultType;
  replyStatus: ResultType;
  limit: number;
  replyLimit: number;
  setLimit: Dispatch<SetStateAction<number>>;
  setReplyLimit: Dispatch<SetStateAction<number>>;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const nextRows = rows.slice(0, limit);
  const nextReplyRows = replyRows.slice(0, replyLimit);
  const renderedRowsRef = useRef(nextRows);
  const renderedReplyRowsRef = useRef(nextReplyRows);

  // A raised limit opens a new remote view. Preserve the old exact window during its one-render
  // warmup, then accept the completed result—including deletions and privacy moves.
  if (status === "complete" || nextRows.length > renderedRowsRef.current.length) {
    renderedRowsRef.current = nextRows;
  }
  if (replyStatus === "complete" || nextReplyRows.length > renderedReplyRowsRef.current.length) {
    renderedReplyRowsRef.current = nextReplyRows;
  }

  const loadMore = useCallback(() => {
    setLimit((current) => Math.min(current + THOUGHTS_PAGE_SIZE, THOUGHTS_MAX_LIMIT));
  }, [setLimit]);
  const loadMoreReplies = useCallback(() => {
    setReplyLimit((current) =>
      Math.min(current + THOUGHT_FEED_REPLIES_PAGE_SIZE, THOUGHT_FEED_REPLIES_MAX_LIMIT),
    );
  }, [setReplyLimit]);
  const revealNewestReplies = useCallback(() => {
    setReplyLimit(THOUGHT_FEED_REPLIES_MAX_LIMIT);
  }, [setReplyLimit]);
  const value = useMemo<ThoughtsFeedValue>(() => ({
    thoughts: renderedRowsRef.current,
    replies: renderedReplyRowsRef.current,
    status,
    replyStatus,
    isAdmin,
    hasMore: limit < THOUGHTS_MAX_LIMIT && rows.length > limit,
    hasMoreReplies:
      replyLimit < THOUGHT_FEED_REPLIES_MAX_LIMIT && replyRows.length > replyLimit,
    loadMore,
    loadMoreReplies,
    revealNewestReplies,
  }), [
    isAdmin,
    limit,
    loadMore,
    loadMoreReplies,
    replyLimit,
    replyRows,
    replyStatus,
    revealNewestReplies,
    rows,
    status,
  ]);

  return <ThoughtsFeedContext.Provider value={value}>{children}</ThoughtsFeedContext.Provider>;
}

export function useThoughtsFeed(): ThoughtsFeedValue {
  const value = useContext(ThoughtsFeedContext);
  if (!value) throw new Error("useThoughtsFeed() must be used inside the thoughts layout route.");
  return value;
}
