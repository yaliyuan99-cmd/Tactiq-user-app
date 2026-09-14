/**
 * Injectable clock and timers, so the ring state machine can run on real
 * time in the app and on fake time in tests.
 */

/** Opaque timer handle — whatever the underlying scheduler returns. */
export type TimerHandle = unknown;

export interface Scheduler {
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
  setInterval(callback: () => void, ms: number): TimerHandle;
  clearInterval(handle: TimerHandle): void;
}

export type Clock = () => number;

type NativeTimeout = Parameters<typeof globalThis.clearTimeout>[0];
type NativeInterval = Parameters<typeof globalThis.clearInterval>[0];

/**
 * Looks the global timer functions up at call time (not at import time), so
 * `vi.useFakeTimers()` installed after this module loads still takes effect.
 */
export const globalScheduler: Scheduler = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as NativeTimeout),
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) => globalThis.clearInterval(handle as NativeInterval),
};

export const systemClock: Clock = () => Date.now();
