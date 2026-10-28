/** Builders for history tests. Not used by the running app. */
import type { GestureEvent } from '@/domain/models';

let counter = 0;

function nextId(): string {
  counter += 1;
  return `test_${counter}`;
}

/** A recognised, simulated Confirm tap in guided practice, with any field overridden. */
export function makeGestureEvent(overrides: Partial<GestureEvent> = {}): GestureEvent {
  return {
    id: nextId(),
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

/** Free practice: a recognised command with nothing asked for, so it is never scored. */
export function makeFreePracticeEvent(overrides: Partial<GestureEvent> = {}): GestureEvent {
  return makeGestureEvent({
    mode: 'free',
    targetContact: null,
    detectedContact: 'middle_base',
    token: 'next',
    ...overrides,
  });
}

/** The squeeze that opens the command window, as it is recorded now. */
export function makeActivationEvent(overrides: Partial<GestureEvent> = {}): GestureEvent {
  return makeGestureEvent({
    kind: 'activation',
    source: 'training',
    mode: 'lesson',
    lessonId: 'squeeze_to_activate',
    targetContact: null,
    detectedContact: null,
    token: null,
    durationMs: null,
    outcome: 'recognised',
    ...overrides,
  });
}

/** A squeeze record as it was stored before `kind` existed: no kind at all. */
export function makeLegacyActivationEvent(overrides: Partial<GestureEvent> = {}): GestureEvent {
  const { kind: _kind, ...legacy } = makeActivationEvent(overrides);
  return legacy;
}

/** A calibration prompt: a contact point was asked for, no command. */
export function makeCalibrationEvent(overrides: Partial<GestureEvent> = {}): GestureEvent {
  return makeGestureEvent({
    source: 'calibration',
    mode: 'calibration',
    targetContact: 'ring_tip',
    detectedContact: 'ring_tip',
    token: 'read',
    ...overrides,
  });
}

/** A completed five-second hold on the pinky fingertip. Simulation only. */
export function makeEmergencyEvent(overrides: Partial<GestureEvent> = {}): GestureEvent {
  return makeGestureEvent({
    targetContact: 'pinky_tip',
    targetToken: 'emergency',
    detectedContact: 'pinky_tip',
    token: 'emergency',
    durationMs: 5000,
    outcome: 'emergency',
    ...overrides,
  });
}
