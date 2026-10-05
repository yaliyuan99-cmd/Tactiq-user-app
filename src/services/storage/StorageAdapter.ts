/**
 * Storage abstraction. Every service persists through one of these, so the
 * whole app can run on localStorage (Demo Mode), in memory (tests) or, later,
 * a backend-backed adapter without touching screens.
 */

export const STORAGE_NAMESPACE = 'tactiq.';

/**
 * Reported to subscribers (in place of a key) when the browser's willingness
 * to save changes flips, so the shell can show or hide one banner. No service
 * owns this key, so `ChangeNotifier` ignores it.
 */
export const STORAGE_PERSISTENCE_KEY = '__persistence__';

/** Shown once when writes are being refused. The session still works; nothing survives the tab. */
export const WRITES_BLOCKED_NOTE =
  'This browser will not let Tactiq save changes. Anything you do now is lost when you close the tab.';

export type StorageListener = (key: string) => void;

export interface StorageAdapter {
  /** Parsed JSON value or null when missing or unreadable. */
  get<T>(key: string): T | null;
  /** True when something is stored under this key, even if it cannot be parsed. */
  has(key: string): boolean;
  /** Returns false when the write failed (quota, private mode, unavailable). */
  set<T>(key: string, value: T): boolean;
  remove(key: string): void;
  /** Keys in this namespace, without the prefix. */
  keys(): string[];
  /** Clears only this namespace. */
  clear(): void;
  /** Notified after any write through this adapter, and on cross-tab changes where supported. */
  subscribe(listener: StorageListener): () => void;
  /**
   * False once the browser has refused a write (full quota, blocked site data,
   * private mode). Reading is a separate capability and keeps working, so a
   * session in this state is degraded, not empty.
   */
  readonly canPersist: boolean;
}

abstract class BaseStorage implements StorageAdapter {
  private readonly listeners = new Set<StorageListener>();

  abstract get<T>(key: string): T | null;
  abstract has(key: string): boolean;
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

  /** Overridden by adapters that can be refused a write. */
  get canPersist(): boolean {
    return true;
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
  has(key: string): boolean {
    return this.map.has(key);
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
  /** Whether window.localStorage can be reached at all. Decides reads. */
  private readonly reachable: boolean;
  /** Whether the browser accepts writes. Reads keep working when this is false. */
  private writable: boolean;

  constructor(private readonly namespace: string = STORAGE_NAMESPACE) {
    super();
    this.reachable = LocalStorageAdapter.isReachable();
    this.writable = this.reachable && LocalStorageAdapter.probe();
    if (this.reachable && typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith(this.namespace)) {
          this.notify(event.key.slice(this.namespace.length));
        }
      });
    }
  }

  /** Can the store be read? Touching `window.localStorage` itself can throw when site data is blocked. */
  static isReachable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Does the browser accept a write? A full quota, storage partitioning or a
   * site-level "block data" setting makes writes throw while everything
   * already stored stays readable, so this never gates a read.
   */
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

  /** True when stored values can be read. */
  get isAvailable(): boolean {
    return this.reachable;
  }

  /** False when the browser has refused a write; reads are unaffected. */
  get canPersist(): boolean {
    return this.writable;
  }

  private full(key: string): string {
    return `${this.namespace}${key}`;
  }

  /** Records whether writes are working and tells subscribers when that changes. */
  private setWritable(writable: boolean): void {
    if (this.writable === writable) return;
    this.writable = writable;
    this.notify(STORAGE_PERSISTENCE_KEY);
  }

  get<T>(key: string): T | null {
    if (!this.reachable) return null;
    try {
      const raw = window.localStorage.getItem(this.full(key));
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }
  has(key: string): boolean {
    if (!this.reachable) return false;
    try {
      return window.localStorage.getItem(this.full(key)) !== null;
    } catch {
      return false;
    }
  }
  set<T>(key: string, value: T): boolean {
    if (!this.reachable) return false;
    try {
      window.localStorage.setItem(this.full(key), JSON.stringify(value));
      this.setWritable(true);
      this.notify(key);
      return true;
    } catch {
      this.setWritable(false);
      return false;
    }
  }
  remove(key: string): void {
    if (!this.reachable) return;
    try {
      window.localStorage.removeItem(this.full(key));
    } catch {
      this.setWritable(false);
    }
    this.notify(key);
  }
  keys(): string[] {
    if (!this.reachable) return [];
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
