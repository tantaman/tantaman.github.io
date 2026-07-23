// A small app-level prototype of route-aware Rindle prefetching. It deliberately retains only the
// named query's sync coverage: normalized rows enter the browser engine, but no broad React-facing
// result view is kept alive. When the destination mounts, `useRoot` materializes its narrow local
// view synchronously from those rows and takes a second retain on the same remote subscription.

import { stableKey } from "@rindle/client";
import type { AnyQuery, SyncQueryLease } from "@rindle/client";

import { bootClient } from "../rindle-client.ts";

const PREFETCH_TTL_MS = 30_000;
const MAX_RETAINED_PREFETCHES = 8;

type ReleaseTimer = ReturnType<typeof setTimeout>;

interface PrefetchEntry {
  key: string;
  lease?: SyncQueryLease;
  ready: Promise<void>;
  lastUsedAt: number;
  releaseTimer?: ReleaseTimer;
}

const entries = new Map<string, PrefetchEntry>();

/**
 * Retain a named query until it is server-authoritative. Concurrent intent preloads/navigation for
 * the same `(name,args,AST)` share one promise and one remote retain.
 */
export function ensureRindleQuery(query: AnyQuery): Promise<void> {
  const key = prefetchKey(query);
  const existing = entries.get(key);
  if (existing) {
    existing.lastUsedAt = Date.now();
    if (existing.releaseTimer !== undefined) {
      clearTimeout(existing.releaseTimer);
      existing.releaseTimer = undefined;
    }
    return existing.ready.then(() => scheduleRelease(existing));
  }

  const entry: PrefetchEntry = {
    key,
    ready: Promise.resolve(),
    lastUsedAt: Date.now(),
  };
  entries.set(key, entry);

  entry.ready = bootClient()
    .then((client) => {
      const lease = client.store.retainSyncQuery(query);
      entry.lease = lease;
      return waitUntilComplete(lease);
    })
    .then(() => {
      scheduleRelease(entry);
      trimRetainedPrefetches(entry.key);
    })
    .catch((error: unknown) => {
      disposeEntry(entry);
      throw error;
    });

  return entry.ready;
}

/**
 * Release the loader's retain after the destination has mounted. `useRoot` subscribes during the
 * commit before this component effect runs, so the two leases overlap and normalized rows never GC
 * between preload and render. No-op for SSR/direct visits and expired intent preloads.
 */
export function handoffRindleQuery(query: AnyQuery): void {
  const entry = entries.get(prefetchKey(query));
  if (entry) disposeEntry(entry);
}

function prefetchKey(query: AnyQuery): string {
  if (typeof query.name !== "string") {
    throw new Error("ensureRindleQuery: route prefetching requires a named query.");
  }
  return stableKey({ ast: query.ast(), remote: { name: query.name, args: query.args } });
}

function waitUntilComplete(lease: SyncQueryLease): Promise<void> {
  if (lease.resultType === "complete") return Promise.resolve();
  if (lease.resultType === "error") {
    return Promise.reject(new Error("ensureRindleQuery: query entered the error result state."));
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;
    const inspect = () => {
      if (lease.resultType !== "complete" && lease.resultType !== "error") return;
      settled = true;
      unsubscribe?.();
      if (lease.resultType === "error") {
        reject(new Error("ensureRindleQuery: query entered the error result state."));
      } else {
        resolve();
      }
    };
    unsubscribe = lease.subscribe(inspect);
    // `SyncQueryLease.subscribe` immediately invokes the listener. Detach here if that synchronous
    // first inspection settled before the unsubscribe function had been assigned.
    if (settled) unsubscribe();
  });
}

function scheduleRelease(entry: PrefetchEntry): void {
  if (entries.get(entry.key) !== entry) return;
  if (entry.releaseTimer !== undefined) clearTimeout(entry.releaseTimer);
  entry.releaseTimer = setTimeout(() => disposeEntry(entry), PREFETCH_TTL_MS);
  (entry.releaseTimer as { unref?: () => void }).unref?.();
}

function trimRetainedPrefetches(exceptKey: string): void {
  const retained = [...entries.values()]
    .filter((entry) => entry.lease !== undefined && entry.key !== exceptKey)
    .sort((left, right) => left.lastUsedAt - right.lastUsedAt);

  while (entries.size > MAX_RETAINED_PREFETCHES && retained.length > 0) {
    disposeEntry(retained.shift()!);
  }
}

function disposeEntry(entry: PrefetchEntry): void {
  if (entries.get(entry.key) !== entry) return;
  entries.delete(entry.key);
  if (entry.releaseTimer !== undefined) clearTimeout(entry.releaseTimer);
  entry.lease?.release();
}
