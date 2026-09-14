/**
 * Storage abstraction. Every service persists through one of these, so the
 * whole app can run on localStorage (Demo Mode), in memory (tests) or, later,
 * a backend-backed adapter without touching screens.
 */

export const STORAGE_NAMESPACE = 'tactiq.';

export type StorageListener = (key: string) => void;

export interface StorageAdapter {
  /** Parsed JSON value or null when missing or unreadable. */
  get<T>(key: string): T | null;
  /** Returns false when the write failed (quota, private mode, unavailable). */
  set<T>(key: string, value: T): boolean;
  remove(key: string): void;
  /** Keys in this namespace, without the prefix. */
  keys(): string[];
  /** Clears only this namespace. */
  clear(): void;
  /** Notified after any write through this adapter, and on cross-tab changes where supported. */
  subscribe(listener: StorageListener): () => void;
}

abstract class BaseStorage implements StorageAdapter {
  private readonly listeners = new Set<StorageListener>();

  abstract get<T>(key: string): T | null;
  abstract set<T>(key: string, value: T): boolean;
  abstract remove(key: string): void;
  abstract keys(): string[];
  abstract clear(): void;

  subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected notify(key: string): void {
    for (const listener of this.listeners) {
      try {
        listener(key);
      } catch {}
    }
  }
}

export class MemoryStorageAdapter extends BaseStorage {
  private readonly map = new Map<string, string>();

  get<T>(key: string): T | null {
    const raw = this.map.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  set<T>(key: string, value: T): boolean {
    this.map.set(key, JSON.stringify(value));
    this.notify(key);
    return true;
  }
  remove(key: string): void {
    this.map.delete(key);
    this.notify(key);
  }
  keys(): string[] {
    return [...this.map.keys()];
  }
  clear(): void {
    const keys = this.keys();
    this.map.clear();
    keys.forEach((k) => this.notify(k));
  }
}

export class LocalStorageAdapter extends BaseStorage {
  private readonly available: boolean;

  constructor(private readonly namespace: string = STORAGE_NAMESPACE) {
    super();
    this.available = LocalStorageAdapter.probe();
    if (this.available && typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith(this.namespace)) {
          this.notify(event.key.slice(this.namespace.length));
        }
      });
    }
  }

  static probe(): boolean {
    try {
      const probe = `${STORAGE_NAMESPACE}__probe__`;
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  get isAvailable(): boolean {
    return this.available;
  }

  private full(key: string): string {
    return `${this.namespace}${key}`;
  }

  get<T>(key: string): T | null {
    if (!this.available) return null;
    try {
      const raw = window.localStorage.getItem(this.full(key));
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }
  set<T>(key: string, value: T): boolean {
    if (!this.available) return false;
    try {
      window.localStorage.setItem(this.full(key), JSON.stringify(value));
      this.notify(key);
      return true;
    } catch {
      return false;
    }
  }
  remove(key: string): void {
    if (!this.available) return;
    try {
      window.localStorage.removeItem(this.full(key));
    } catch {}
    this.notify(key);
  }
  keys(): string[] {
    if (!this.available) return [];
    const out: string[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(this.namespace)) out.push(k.slice(this.namespace.length));
      }
    } catch {}
    return out;
  }
  clear(): void {
    const keys = this.keys();
    keys.forEach((k) => this.remove(k));
  }
}

/** Well-known keys, so services never collide. */
export const STORAGE_KEYS = {
  preferences: 'prefs',
  authSession: 'auth.session',
  authAccounts: 'auth.accounts',
  device: 'device',
  commandMapping: 'commands',
  calibration: 'calibration',
  training: 'training',
  history: 'history',
  historySeeded: 'history.seeded',
} as const;
