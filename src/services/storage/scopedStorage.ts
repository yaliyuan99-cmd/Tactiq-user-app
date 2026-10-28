/**
 * Per-identity views of one storage adapter.
 *
 * Every service is built on a `StorageAdapter` and asks for keys like
 * 'history' or 'calibration'. `scopedStorage(storage, scopeId)` returns an
 * adapter with the same interface that rewrites those keys to
 * 'u.<scopeId>.history', so two profiles signed in to the same browser can
 * never read each other's records, and no service needs to know whose data it
 * is holding. Keys listed in `DEVICE_WIDE_KEYS` describe the browser rather
 * than a person and pass straight through.
 *
 * A scope id is an opaque account id from the auth service. Dots separate the
 * prefix from the key, so a dot in an id is escaped (see `scopePrefix`); the
 * escape is reversible, so two different ids can never share a prefix.
 */
import { DEVICE_WIDE_KEYS, type StorageAdapter, type StorageListener } from './StorageAdapter';

/** Marks the per-profile part of the key space: 'u.<scopeId>.<key>'. */
export const USER_SCOPE_PREFIX = 'u.';

/**
 * The scope used while nobody is signed in. It exists so that a signed-out
 * session reads no profile's records at all, rather than falling back to the
 * unscoped keys a pre-profiles build wrote.
 */
export const SIGNED_OUT_SCOPE_ID = 'signed-out';

/** 'u.<escaped scope id>.' — the prefix every per-profile key of this scope carries. */
export function scopePrefix(scopeId: string): string {
  const escaped = scopeId.replace(/%/g, '%25').replace(/\./g, '%2E');
  return `${USER_SCOPE_PREFIX}${escaped}.`;
}

/** Where `key` is stored for `scopeId`: unchanged when device-wide, prefixed otherwise. */
export function scopedKey(scopeId: string, key: string): string {
  return DEVICE_WIDE_KEYS.has(key) ? key : `${scopePrefix(scopeId)}${key}`;
}

/**
 * One profile's view of another adapter. Reads, writes, listings and clears
 * cover this profile's own keys plus the device-wide ones, and nothing else:
 * another profile's keys are not readable, not listed and not cleared.
 */
export class ScopedStorageAdapter implements StorageAdapter {
  private readonly prefix: string;

  constructor(
    /** The adapter this view is built on, holding every profile's keys. */
    readonly root: StorageAdapter,
    readonly scopeId: string,
  ) {
    this.prefix = scopePrefix(scopeId);
  }

  get<T>(key: string): T | null {
    return this.root.get<T>(this.full(key));
  }
  has(key: string): boolean {
    return this.root.has(this.full(key));
  }
  set<T>(key: string, value: T): boolean {
    return this.root.set<T>(this.full(key), value);
  }
  remove(key: string): void {
    this.root.remove(this.full(key));
  }

  /** This profile's keys (without the prefix) and the device-wide keys that are stored. */
  keys(): string[] {
    const out: string[] = [];
    for (const key of this.root.keys()) {
      if (key.startsWith(this.prefix)) out.push(key.slice(this.prefix.length));
      else if (!key.startsWith(USER_SCOPE_PREFIX) && DEVICE_WIDE_KEYS.has(key)) out.push(key);
    }
    return out;
  }

  /** Clears what this view can see. Other profiles' keys are left alone. */
  clear(): void {
    this.keys().forEach((key) => this.remove(key));
  }

  /**
   * Relays changes this view can see. Another profile's keys are not reported;
   * a key outside the per-profile space (a device-wide key, the persistence
   * flag, or a key left by a pre-profiles build) is reported as it is.
   */
  subscribe(listener: StorageListener): () => void {
    return this.root.subscribe((key) => {
      if (key.startsWith(this.prefix)) listener(key.slice(this.prefix.length));
      else if (!key.startsWith(USER_SCOPE_PREFIX)) listener(key);
    });
  }

  get canPersist(): boolean {
    return this.root.canPersist;
  }

  private full(key: string): string {
    return DEVICE_WIDE_KEYS.has(key) ? key : `${this.prefix}${key}`;
  }
}

/**
 * `storage` seen as `scopeId`'s own store. Re-scoping an existing view rebases
 * it on the same underlying store instead of nesting, and asking for the scope
 * a view already has returns that view, so this is safe to call on whatever
 * adapter is to hand.
 */
export function scopedStorage(storage: StorageAdapter, scopeId: string): StorageAdapter {
  if (storage instanceof ScopedStorageAdapter) {
    return storage.scopeId === scopeId ? storage : new ScopedStorageAdapter(storage.root, scopeId);
  }
  return new ScopedStorageAdapter(storage, scopeId);
}

/**
 * Removes every key stored for `scopeId` — what that profile saved, and
 * nothing else. The device-wide keys and the other profiles' keys are left
 * exactly as they are. Used when a profile is deleted, so its records do not
 * stay behind unreachable.
 */
export function clearScope(storage: StorageAdapter, scopeId: string): void {
  const root = rootStorage(storage);
  const prefix = scopePrefix(scopeId);
  for (const key of root.keys()) {
    if (key.startsWith(prefix)) root.remove(key);
  }
}

/** The store underneath any number of scoped views: every profile's keys and the device-wide ones. */
export function rootStorage(storage: StorageAdapter): StorageAdapter {
  return storage instanceof ScopedStorageAdapter ? storage.root : storage;
}

/** Whose view this is, or null for an unscoped store. */
export function storageScopeId(storage: StorageAdapter): string | null {
  return storage instanceof ScopedStorageAdapter ? storage.scopeId : null;
}
