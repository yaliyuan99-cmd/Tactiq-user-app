import { LocalStorageAdapter, MemoryStorageAdapter, STORAGE_KEYS, STORAGE_NAMESPACE } from './StorageAdapter';

describe('MemoryStorageAdapter', () => {
  it('stores JSON values, lists keys, removes and clears', () => {
    const storage = new MemoryStorageAdapter();
    expect(storage.get('missing')).toBeNull();
    expect(storage.set('prefs', { theme: 'dark' })).toBe(true);
    expect(storage.set('count', 3)).toBe(true);
    expect(storage.get('prefs')).toEqual({ theme: 'dark' });
    expect(storage.keys().sort()).toEqual(['count', 'prefs']);
    storage.remove('count');
    expect(storage.get('count')).toBeNull();
    storage.clear();
    expect(storage.keys()).toEqual([]);
  });

  it('stores a copy, not a live reference', () => {
    const storage = new MemoryStorageAdapter();
    const value = { list: [1] };
    storage.set('k', value);
    value.list.push(2);
    expect(storage.get('k')).toEqual({ list: [1] });
  });

  it('notifies subscribers of writes, removals and clears until they unsubscribe', () => {
    const storage = new MemoryStorageAdapter();
    const listener = vi.fn();
    const unsubscribe = storage.subscribe(listener);
    storage.set('a', 1);
    storage.remove('a');
    storage.set('b', 1);
    storage.clear();
    expect(listener.mock.calls.map(([key]) => key)).toEqual(['a', 'a', 'b', 'b']);
    unsubscribe();
    storage.set('c', 1);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('keeps notifying when one listener throws', () => {
    const storage = new MemoryStorageAdapter();
    const good = vi.fn();
    storage.subscribe(() => {
      throw new Error('listener failed');
    });
    storage.subscribe(good);
    expect(() => storage.set('a', 1)).not.toThrow();
    expect(good).toHaveBeenCalledWith('a');
  });
});

describe('LocalStorageAdapter', () => {
  it('uses the tactiq namespace by default', () => {
    const storage = new LocalStorageAdapter();
    expect(STORAGE_NAMESPACE).toBe('tactiq.');
    expect(storage.isAvailable).toBe(true);
    storage.set(STORAGE_KEYS.preferences, { theme: 'light' });
    expect(window.localStorage.getItem('tactiq.prefs')).toBe('{"theme":"light"}');
    expect(storage.get(STORAGE_KEYS.preferences)).toEqual({ theme: 'light' });
  });

  it('isolates namespaces for get, keys and clear', () => {
    const a = new LocalStorageAdapter('app-a.');
    const b = new LocalStorageAdapter('app-b.');
    window.localStorage.setItem('unrelated', 'keep me');
    a.set('shared', 'from a');
    b.set('shared', 'from b');
    b.set('only-b', true);
    expect(a.get('shared')).toBe('from a');
    expect(b.get('shared')).toBe('from b');
    expect(a.keys()).toEqual(['shared']);
    expect(b.keys().sort()).toEqual(['only-b', 'shared']);
    a.clear();
    expect(a.keys()).toEqual([]);
    expect(b.get('shared')).toBe('from b');
    expect(window.localStorage.getItem('unrelated')).toBe('keep me');
  });

  it('returns null for unreadable JSON', () => {
    const storage = new LocalStorageAdapter();
    window.localStorage.setItem('tactiq.broken', '{not json');
    expect(storage.get('broken')).toBeNull();
  });

  it('notifies on its own writes and removals', () => {
    const storage = new LocalStorageAdapter();
    const listener = vi.fn();
    const unsubscribe = storage.subscribe(listener);
    storage.set('a', 1);
    storage.remove('a');
    expect(listener.mock.calls).toEqual([['a'], ['a']]);
    unsubscribe();
    storage.set('a', 2);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('relays cross-tab changes in its namespace only, without the prefix', () => {
    const storage = new LocalStorageAdapter();
    const listener = vi.fn();
    storage.subscribe(listener);
    window.dispatchEvent(new StorageEvent('storage', { key: 'tactiq.history' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'someone-else.history' }));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(listener.mock.calls).toEqual([['history']]);
  });

  it('returns false and does not notify when a write fails (for example, storage is full)', () => {
    const storage = new LocalStorageAdapter();
    const listener = vi.fn();
    storage.subscribe(listener);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    expect(storage.set('history', [1, 2, 3])).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(storage.get('history')).toBeNull();
  });

  it('degrades quietly when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Access denied.', 'SecurityError');
    });
    expect(LocalStorageAdapter.probe()).toBe(false);
    const storage = new LocalStorageAdapter();
    expect(storage.isAvailable).toBe(false);
    expect(storage.set('prefs', {})).toBe(false);
    expect(storage.get('prefs')).toBeNull();
    expect(storage.keys()).toEqual([]);
    expect(() => {
      storage.remove('prefs');
      storage.clear();
    }).not.toThrow();
  });
});
