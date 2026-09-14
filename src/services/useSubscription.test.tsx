import { act, render, screen } from '@testing-library/react';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';
import { ChangeNotifier, useServiceSnapshot, useSubscription, type SubscribeFn } from './useSubscription';

function createStore() {
  const listeners = new Set<() => void>();
  let value = 0;
  const subscribe: SubscribeFn = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    subscribe,
    read: () => value,
    set(next: number) {
      value = next;
      listeners.forEach((l) => l());
    },
    size: () => listeners.size,
  };
}

describe('useSubscription', () => {
  it('increments a version on every notification and unsubscribes on unmount', () => {
    const store = createStore();
    function Probe() {
      const version = useSubscription(store.subscribe);
      return <p>Version {version}</p>;
    }
    const { unmount } = render(<Probe />);
    expect(screen.getByText('Version 0')).toBeInTheDocument();
    expect(store.size()).toBe(1);
    act(() => store.set(1));
    act(() => store.set(1));
    expect(screen.getByText('Version 2')).toBeInTheDocument();
    unmount();
    expect(store.size()).toBe(0);
  });
});

describe('useServiceSnapshot', () => {
  it('re-reads the value after each notification', () => {
    const store = createStore();
    function Probe() {
      const value = useServiceSnapshot(store.subscribe, store.read);
      return <p>Value {value}</p>;
    }
    render(<Probe />);
    expect(screen.getByText('Value 0')).toBeInTheDocument();
    act(() => store.set(7));
    expect(screen.getByText('Value 7')).toBeInTheDocument();
  });
});

describe('ChangeNotifier', () => {
  it('relays outside changes to its keys only, and ignores its own quiet writes', () => {
    const storage = new MemoryStorageAdapter();
    const onExternal = vi.fn();
    const notifier = new ChangeNotifier(storage, ['mine'], onExternal);
    const listener = vi.fn();
    notifier.subscribe(listener);

    storage.set('other', 1);
    expect(listener).not.toHaveBeenCalled();

    expect(notifier.quietly(() => storage.set('mine', 1))).toBe(true);
    expect(listener).not.toHaveBeenCalled();

    storage.set('mine', 2);
    expect(onExternal).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps notifying other listeners when one throws, and stops after dispose', () => {
    const storage = new MemoryStorageAdapter();
    const notifier = new ChangeNotifier(storage, ['mine']);
    const good = vi.fn();
    notifier.subscribe(() => {
      throw new Error('listener failed');
    });
    notifier.subscribe(good);
    notifier.emit();
    expect(good).toHaveBeenCalledTimes(1);
    notifier.dispose();
    storage.set('mine', 1);
    notifier.emit();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('restores quiet mode even when the write throws', () => {
    const storage = new MemoryStorageAdapter();
    const notifier = new ChangeNotifier(storage, ['mine']);
    const listener = vi.fn();
    notifier.subscribe(listener);
    expect(() =>
      notifier.quietly(() => {
        throw new Error('write failed');
      }),
    ).toThrow('write failed');
    storage.set('mine', 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
