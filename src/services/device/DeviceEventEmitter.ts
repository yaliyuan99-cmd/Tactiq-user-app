import type { DeviceEvent, DeviceEventListener } from './types';

/** A listener set that isolates failures: one broken listener never stops the others. */
export class DeviceEventEmitter {
  private readonly listeners = new Set<DeviceEventListener>();

  subscribe(listener: DeviceEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: DeviceEvent): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {}
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  get size(): number {
    return this.listeners.size;
  }
}
