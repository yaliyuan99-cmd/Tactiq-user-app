/**
 * Subscription plumbing shared by the local services and the screens that
 * read them. `ChangeNotifier` is the service half: it keeps a listener set
 * and relays changes made to the service's storage keys from elsewhere (for
 * example another tab). `useSubscription` is the React half: it re-renders a
 * component whenever a service notifies.
 */
import { useEffect, useReducer } from 'react';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';

export type Unsubscribe = () => void;
export type SubscribeFn = (listener: () => void) => Unsubscribe;

export class ChangeNotifier {
  private readonly listeners = new Set<() => void>();
  private quietDepth = 0;
  private readonly detachStorage: Unsubscribe;

  /**
   * @param storage The adapter the service writes through.
   * @param keys Storage keys the service owns.
   * @param onExternalChange Called before listeners when one of `keys` changes outside `quietly` (drop caches here).
   */
  constructor(storage: StorageAdapter, keys: readonly string[], onExternalChange?: () => void) {
    this.detachStorage = storage.subscribe((key) => {
      if (this.quietDepth > 0 || !keys.includes(key)) return;
      onExternalChange?.();
      this.emit();
    });
  }

  /** Runs the service's own storage write without treating it as an external change. */
  quietly<T>(write: () => T): T {
    this.quietDepth += 1;
    try {
      return write();
    } finally {
      this.quietDepth -= 1;
    }
  }

  readonly subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch {}
    }
  }

  /** Stops listening to storage and drops every listener. */
  dispose(): void {
    this.detachStorage();
    this.listeners.clear();
  }
}

/**
 * Returns a version number that increases every time `subscribe`'s listener
 * fires, re-rendering the caller. Pass a stable function (wrap it in
 * `useCallback`) to avoid resubscribing on every render.
 */
export function useSubscription(subscribe: SubscribeFn): number {
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribe(bump), [subscribe]);
  return version;
}

/**
 * Re-reads `read()` on every render and re-renders whenever `subscribe`
 * notifies. The value is not memoised, so `read` should be cheap.
 */
export function useServiceSnapshot<T>(subscribe: SubscribeFn, read: () => T): T {
  useSubscription(subscribe);
  return read();
}
