import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {}
});

// jsdom lacks matchMedia; components read it for theme and reduced motion.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom lacks PointerEvent; without it pointer events arrive as plain Events with no pointerId or button.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    readonly width: number;
    readonly height: number;
    readonly pressure: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
      this.isPrimary = init.isPrimary ?? true;
      this.width = init.width ?? 1;
      this.height = init.height ?? 1;
      this.pressure = init.pressure ?? 0;
    }
  }
  Object.defineProperty(window, 'PointerEvent', { writable: true, configurable: true, value: PointerEventPolyfill });
}

/*
 * Why every file using fake timers passes `shouldAdvanceTime: true`
 *
 * Testing Library only advances the clock itself when its
 * `jestFakeTimersAreEnabled()` says fake timers are running, and that check
 * starts `typeof jest !== 'undefined'`. Vitest has no global `jest`, so the
 * answer is always no: `waitFor` polls on real timers. Under `vi.useFakeTimers()`
 * those never fire, so `waitFor` would hang — `shouldAdvanceTime: true` is what
 * keeps it moving. It is load-bearing, not a leftover.
 *
 * The cost is that it advances the fake clock by however much REAL time has
 * passed, so a loaded machine can expire the three-second command window
 * between opening it and the tap meant to land inside. Two tests
 * (CalibratePage.session "24 accepted taps", SimulatorPage "from the list
 * view") fail under parallel load and pass alone for exactly this reason.
 *
 * The obvious fix does not work, and was tried on 1 November 2026: define a
 * global `jest` shim with the one method Testing Library calls
 * (`advanceTimersByTime`, wait-for.js:71 — the only one, checked). Detection
 * then passes, because Vitest's fake `setTimeout` does carry the `clock`
 * property it looks for. But `waitFor` advancing the clock during its own
 * polling changes what a wait means mid-sequence: four tests that wait while a
 * hold or a tap is in flight saw the clock jump past the state they were
 * waiting for. Removing `shouldAdvanceTime` everywhere at the same time did
 * not rescue them. Both experiments were reverted.
 *
 * A real fix needs per-test control over which waits may advance the clock,
 * which is more machinery than two occasionally-flaky tests justify. Anyone
 * picking this up: the mechanism above is established, so start from it rather
 * than from the symptom.
 */
