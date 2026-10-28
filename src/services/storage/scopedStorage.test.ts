import { LocalStorageAdapter, MemoryStorageAdapter, STORAGE_KEYS, STORAGE_PERSISTENCE_KEY } from './StorageAdapter';
import {
  ScopedStorageAdapter,
  SIGNED_OUT_SCOPE_ID,
  clearScope,
  rootStorage,
  scopedKey,
  scopedStorage,
  storageScopeId,
} from './scopedStorage';

describe('scopedKey', () => {
  it('prefixes a profile key and leaves the device-wide keys alone', () => {
    expect(scopedKey('user_a', STORAGE_KEYS.history)).toBe('u.user_a.history');
    expect(scopedKey('user_a', STORAGE_KEYS.profilePreferences)).toBe('u.user_a.prefs.profile');
    expect(scopedKey('user_a', STORAGE_KEYS.preferences)).toBe(STORAGE_KEYS.preferences);
    expect(scopedKey('user_a', STORAGE_KEYS.device)).toBe(STORAGE_KEYS.device);
    expect(scopedKey('user_a', STORAGE_KEYS.authAccounts)).toBe(STORAGE_KEYS.authAccounts);
    expect(scopedKey('user_a', STORAGE_KEYS.authSession)).toBe(STORAGE_KEYS.authSession);
  });

  it('escapes a dot in an id, so no two ids can share a prefix', () => {
    expect(scopedKey('a.b', 'history')).toBe('u.a%2Eb.history');
    expect(scopedKey('a', 'b.history')).toBe('u.a.b.history');
    expect(scopedKey('a.b', 'history')).not.toBe(scopedKey('a', 'b.history'));
    expect(scopedKey('a%2Eb', 'history')).not.toBe(scopedKey('a.b', 'history'));
  });
});

describe('scopedStorage', () => {
  it('keeps two profiles’ business data apart while sharing the device-wide keys', () => {
    const root = new MemoryStorageAdapter();
    const a = scopedStorage(root, 'user_a');
    const b = scopedStorage(root, 'user_b');

    a.set(STORAGE_KEYS.history, ['a event']);
    a.set(STORAGE_KEYS.preferences, { theme: 'dark' });
    b.set(STORAGE_KEYS.history, ['b event']);

    expect(a.get(STORAGE_KEYS.history)).toEqual(['a event']);
    expect(b.get(STORAGE_KEYS.history)).toEqual(['b event']);
    expect(b.has(STORAGE_KEYS.history)).toBe(true);
    // The device-wide appearance key is one record, shared.
    expect(b.get(STORAGE_KEYS.preferences)).toEqual({ theme: 'dark' });
    expect(root.keys().sort()).toEqual(['prefs', 'u.user_a.history', 'u.user_b.history']);
  });

  it('reads nothing of a profile that has not written, and nothing left unscoped', () => {
    const root = new MemoryStorageAdapter();
    root.set(STORAGE_KEYS.history, ['from a build before profiles existed']);
    const a = scopedStorage(root, 'user_a');
    expect(a.get(STORAGE_KEYS.history)).toBeNull();
    expect(a.has(STORAGE_KEYS.history)).toBe(false);
    expect(a.keys()).toEqual([]);
  });

  it('lists and clears only its own keys and the device-wide ones', () => {
    const root = new MemoryStorageAdapter();
    const a = scopedStorage(root, 'user_a');
    const b = scopedStorage(root, 'user_b');
    a.set(STORAGE_KEYS.history, [1]);
    a.set(STORAGE_KEYS.training, { version: 1 });
    b.set(STORAGE_KEYS.calibration, { id: 'cal_b' });
    root.set(STORAGE_KEYS.authAccounts, [{ id: 'user_a' }]);
    root.set(STORAGE_KEYS.history, ['legacy']);

    expect(a.keys().sort()).toEqual(['auth.accounts', 'history', 'training']);

    a.clear();
    expect(a.keys()).toEqual([]);
    expect(b.get(STORAGE_KEYS.calibration)).toEqual({ id: 'cal_b' });
    // Clearing one profile's view never reaches another profile's keys.
    expect(root.keys().sort()).toEqual(['history', 'u.user_b.calibration']);
  });

  it('removes a key only from its own scope', () => {
    const root = new MemoryStorageAdapter();
    const a = scopedStorage(root, 'user_a');
    const b = scopedStorage(root, 'user_b');
    a.set(STORAGE_KEYS.commandMapping, { shortcuts: 'a' });
    b.set(STORAGE_KEYS.commandMapping, { shortcuts: 'b' });
    a.remove(STORAGE_KEYS.commandMapping);
    expect(a.get(STORAGE_KEYS.commandMapping)).toBeNull();
    expect(b.get(STORAGE_KEYS.commandMapping)).toEqual({ shortcuts: 'b' });
  });

  it('reports its own changes and the device-wide ones, not another profile’s', () => {
    const root = new MemoryStorageAdapter();
    const a = scopedStorage(root, 'user_a');
    const b = scopedStorage(root, 'user_b');
    const seen: string[] = [];
    const unsubscribe = a.subscribe((key) => seen.push(key));

    a.set(STORAGE_KEYS.history, [1]);
    b.set(STORAGE_KEYS.history, [2]);
    root.set(STORAGE_KEYS.device, { version: 1 });
    expect(seen).toEqual([STORAGE_KEYS.history, STORAGE_KEYS.device]);

    unsubscribe();
    a.set(STORAGE_KEYS.history, [3]);
    expect(seen).toHaveLength(2);
  });

  it('passes the persistence flag through, so the shell still hears about refused writes', () => {
    const root = new LocalStorageAdapter();
    const scoped = scopedStorage(root, 'user_a');
    const seen: string[] = [];
    scoped.subscribe((key) => seen.push(key));
    expect(scoped.canPersist).toBe(true);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    expect(scoped.set(STORAGE_KEYS.history, [1])).toBe(false);
    expect(scoped.canPersist).toBe(false);
    expect(seen).toEqual([STORAGE_PERSISTENCE_KEY]);
  });

  it('writes a profile key under the tactiq namespace in localStorage', () => {
    const scoped = scopedStorage(new LocalStorageAdapter(), 'user_a');
    scoped.set(STORAGE_KEYS.history, [1]);
    scoped.set(STORAGE_KEYS.preferences, { theme: 'dark' });
    expect(window.localStorage.getItem('tactiq.u.user_a.history')).toBe('[1]');
    expect(window.localStorage.getItem('tactiq.prefs')).toBe('{"theme":"dark"}');
  });

  it('rebases instead of nesting, and hands back the same view for the same scope', () => {
    const root = new MemoryStorageAdapter();
    const a = scopedStorage(root, 'user_a');
    expect(scopedStorage(a, 'user_a')).toBe(a);

    const b = scopedStorage(a, 'user_b');
    b.set(STORAGE_KEYS.history, [1]);
    expect(root.keys()).toEqual(['u.user_b.history']);
    expect(storageScopeId(b)).toBe('user_b');
    expect(rootStorage(b)).toBe(root);
    expect(rootStorage(root)).toBe(root);
    expect(storageScopeId(root)).toBeNull();
  });

  it('gives a signed-out session its own scope, so no profile’s records are readable', () => {
    const root = new MemoryStorageAdapter();
    scopedStorage(root, 'user_a').set(STORAGE_KEYS.history, ['a event']);
    const signedOut = scopedStorage(root, SIGNED_OUT_SCOPE_ID);
    expect(signedOut.get(STORAGE_KEYS.history)).toBeNull();
    expect(signedOut.keys()).toEqual([]);
    expect(signedOut).toBeInstanceOf(ScopedStorageAdapter);
  });

  it('returns false and does not throw when the underlying store refuses a write', () => {
    const root = new MemoryStorageAdapter();
    vi.spyOn(root, 'set').mockReturnValue(false);
    const scoped = scopedStorage(root, 'user_a');
    expect(scoped.set(STORAGE_KEYS.history, [1])).toBe(false);
    expect(() => scoped.remove(STORAGE_KEYS.history)).not.toThrow();
  });
});

describe('clearScope', () => {
  it('removes one profile’s keys and leaves the device-wide and other profiles’ keys', () => {
    const root = new MemoryStorageAdapter();
    const a = scopedStorage(root, 'user_a');
    const b = scopedStorage(root, 'user_b');
    a.set(STORAGE_KEYS.history, [1]);
    a.set(STORAGE_KEYS.profilePreferences, { hand: 'left' });
    b.set(STORAGE_KEYS.history, [2]);
    root.set(STORAGE_KEYS.preferences, { theme: 'dark' });
    root.set(STORAGE_KEYS.authAccounts, [{ id: 'user_b' }]);

    clearScope(root, 'user_a');

    expect(a.get(STORAGE_KEYS.history)).toBeNull();
    expect(a.get(STORAGE_KEYS.profilePreferences)).toBeNull();
    expect(b.get(STORAGE_KEYS.history)).toEqual([2]);
    expect(root.get(STORAGE_KEYS.preferences)).toEqual({ theme: 'dark' });
    expect(root.get(STORAGE_KEYS.authAccounts)).toEqual([{ id: 'user_b' }]);
  });

  it('accepts a scoped view and is safe when the profile saved nothing', () => {
    const root = new MemoryStorageAdapter();
    const a = scopedStorage(root, 'user_a');
    a.set(STORAGE_KEYS.history, [1]);
    clearScope(a, 'user_a');
    expect(root.keys()).toEqual([]);
    expect(() => clearScope(root, 'user_never')).not.toThrow();
  });
});
