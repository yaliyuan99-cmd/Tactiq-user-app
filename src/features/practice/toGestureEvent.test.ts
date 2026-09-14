import type { RejectReason } from '@/services/device/types';
import { isGestureEvent } from '@/services/history/events';
import type { RingResult } from './ringResults';
import { evidenceForDevice, squeezeGestureEvent, toGestureEvent, type GestureEventContext } from './toGestureEvent';

const AT = Date.UTC(2026, 8, 15, 11, 0);
const ISO = new Date(AT).toISOString();

const free: GestureEventContext = { source: 'simulator', mode: 'free', evidence: 'simulated' };
const guided = (targetContact: GestureEventContext['targetContact']): GestureEventContext => ({
  source: 'simulator',
  mode: 'guided',
  targetContact,
  evidence: 'simulated',
});

const confirmTap: RingResult = { id: 'r', at: AT, kind: 'command', token: 'confirm', contact: 'index_tip', durationMs: 150 };
const rejected = (reason: RejectReason, durationMs: number | null): RingResult => ({
  id: 'r',
  at: AT,
  kind: 'rejected',
  reason,
  contact: 'ring_base',
  durationMs,
});

/** A complete record, as the history service would store it, must pass the stored-data validator. */
function asStored(event: ReturnType<typeof toGestureEvent>) {
  return { id: 'evt_1', seeded: false, ...event };
}

describe('toGestureEvent', () => {
  it('records a free-practice command as recognised with no target', () => {
    const event = toGestureEvent(confirmTap, free);
    expect(event).toEqual({
      at: ISO,
      source: 'simulator',
      mode: 'free',
      targetContact: null,
      detectedContact: 'index_tip',
      token: 'confirm',
      durationMs: 150,
      outcome: 'recognised',
      evidence: 'simulated',
    });
    expect(isGestureEvent(asStored(event))).toBe(true);
  });

  it('records a command on the target as recognised', () => {
    expect(toGestureEvent(confirmTap, guided('index_tip')).outcome).toBe('recognised');
  });

  it('treats an explicit null target like free practice', () => {
    expect(toGestureEvent(confirmTap, guided(null)).outcome).toBe('recognised');
  });

  it('records a command on another point as a mismatch, keeping what was detected', () => {
    const event = toGestureEvent(confirmTap, { source: 'training', mode: 'lesson', targetContact: 'index_base', lessonId: 'confirm_and_back', evidence: 'simulated' });
    expect(event).toMatchObject({
      source: 'training',
      mode: 'lesson',
      targetContact: 'index_base',
      detectedContact: 'index_tip',
      token: 'confirm',
      outcome: 'mismatch',
      lessonId: 'confirm_and_back',
    });
    expect(isGestureEvent(asStored(event))).toBe(true);
  });

  it('records a calibration tap with the measured evidence it was given', () => {
    const event = toGestureEvent(confirmTap, { source: 'calibration', mode: 'calibration', targetContact: 'index_tip', evidence: 'measured' });
    expect(event).toMatchObject({ outcome: 'recognised', evidence: 'measured' });
    expect(event).not.toHaveProperty('lessonId');
  });

  it('records a press on a closed window as window_closed with no token', () => {
    const event = toGestureEvent(rejected('not_armed', null), guided('ring_base'));
    expect(event).toMatchObject({ outcome: 'window_closed', token: null, detectedContact: 'ring_base', durationMs: null });
    expect(isGestureEvent(asStored(event))).toBe(true);
  });

  it('records a window timeout reject as window_closed', () => {
    expect(toGestureEvent(rejected('window_closed', null), free).outcome).toBe('window_closed');
  });

  it('records a too-long press as rejected_duration with its duration', () => {
    expect(toGestureEvent(rejected('indeterminate_duration', 1300), free)).toMatchObject({
      outcome: 'rejected_duration',
      token: null,
      durationMs: 1300,
    });
  });

  it('records a rejected hold_released_early as a cancelled hold', () => {
    expect(toGestureEvent(rejected('hold_released_early', 800), free)).toMatchObject({ outcome: 'emergency_cancelled', token: null });
  });

  it('records a completed emergency hold', () => {
    const event = toGestureEvent(
      { id: 'e', at: AT, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 },
      { source: 'training', mode: 'lesson', targetContact: 'pinky_tip', lessonId: 'emergency_hold', evidence: 'simulated' },
    );
    expect(event).toMatchObject({ outcome: 'emergency', token: 'emergency', detectedContact: 'pinky_tip', durationMs: 5000 });
    expect(isGestureEvent(asStored(event))).toBe(true);
  });

  it('records a cancelled emergency hold with its elapsed time and no token', () => {
    const event = toGestureEvent({ id: 'e', at: AT, kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 1800 }, free);
    expect(event).toMatchObject({ outcome: 'emergency_cancelled', token: null, detectedContact: 'pinky_tip', durationMs: 1800 });
  });
});

describe('squeezeGestureEvent', () => {
  it('records a squeeze as recognised with no contact, token or duration', () => {
    const event = squeezeGestureEvent(
      { source: 'training', mode: 'lesson', lessonId: 'squeeze_to_activate', evidence: 'simulated' },
      AT,
    );
    expect(event).toEqual({
      at: ISO,
      source: 'training',
      mode: 'lesson',
      targetContact: null,
      detectedContact: null,
      token: null,
      durationMs: null,
      outcome: 'recognised',
      evidence: 'simulated',
      lessonId: 'squeeze_to_activate',
    });
    expect(isGestureEvent(asStored(event))).toBe(true);
  });

  it('defaults to the current time and omits an absent lesson', () => {
    const event = squeezeGestureEvent({ source: 'simulator', mode: 'free', evidence: 'simulated' });
    expect(Number.isFinite(Date.parse(event.at ?? ''))).toBe(true);
    expect(event).not.toHaveProperty('lessonId');
  });
});

describe('evidenceForDevice', () => {
  it('is measured only for a connected hardware ring', () => {
    expect(evidenceForDevice({ mode: 'hardware', status: 'connected' })).toBe('measured');
    expect(evidenceForDevice({ mode: 'hardware', status: 'disconnected' })).toBe('simulated');
    expect(evidenceForDevice({ mode: 'demo', status: 'ready' })).toBe('simulated');
  });
});
