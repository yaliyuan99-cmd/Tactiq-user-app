/** Builders for history tests. Not used by the running app. */
import type { GestureEvent } from '@/domain/models';

let counter = 0;

/** A recognised, simulated Confirm tap in guided practice, with any field overridden. */
export function makeGestureEvent(overrides: Partial<GestureEvent> = {}): GestureEvent {
  counter += 1;
  return {
    id: `test_${counter}`,
    at: '2026-09-15T04:00:00.000Z',
    source: 'simulator',
    mode: 'guided',
    targetContact: 'index_tip',
    detectedContact: 'index_tip',
    token: 'confirm',
    durationMs: 200,
    outcome: 'recognised',
    evidence: 'simulated',
    seeded: false,
    ...overrides,
  };
}
