import type { RejectReason } from '@/services/device/types';
import { classifyEvent, eventKind, isAccuracyAttempt } from '@/services/history/classify';
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
  it('records a free-practice command as recognised with no target, and never as a scored answer', () => {
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
    // Nothing was asked for, so the record carries neither target.
    expect(event).not.toHaveProperty('targetToken');
    expect(classifyEvent(asStored(event))).toBe('untargeted');
    expect(isAccuracyAttempt(asStored(event))).toBe(false);
  });

  it('records a command record without a kind, which reads back as a command', () => {
    const event = toGestureEvent(confirmTap, guided('index_tip'));
    expect(event).not.toHaveProperty('kind');
    expect(eventKind(asStored(event))).toBe('command');
    expect(isAccuracyAttempt(asStored(event))).toBe(true);
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

  it('records a tap that beat the window open as window_closed too: history has one outcome for a shut window', () => {
    expect(toGestureEvent(rejected('window_opening', null), guided('ring_base')).outcome).toBe('window_closed');
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

  describe('with a target command', () => {
    const briefPinkyTap: RingResult = { id: 'p', at: AT, kind: 'command', token: 'quick_action_1', contact: 'pinky_tip', durationMs: 140 };
    const emergencyTarget: GestureEventContext = {
      source: 'simulator',
      mode: 'guided',
      targetContact: 'pinky_tip',
      targetToken: 'emergency',
      evidence: 'simulated',
    };

    it('records a brief pinky tap as a mismatch when the target was the emergency hold, keeping both tokens', () => {
      const event = toGestureEvent(briefPinkyTap, emergencyTarget);
      expect(event).toMatchObject({
        targetContact: 'pinky_tip',
        targetToken: 'emergency',
        detectedContact: 'pinky_tip',
        token: 'quick_action_1',
        outcome: 'mismatch',
      });
      expect(isGestureEvent(asStored(event))).toBe(true);
    });

    it('records a completed hold on the emergency target as emergency', () => {
      const event = toGestureEvent({ id: 'e', at: AT, kind: 'emergency', contact: 'pinky_tip', durationMs: 5000 }, emergencyTarget);
      expect(event).toMatchObject({ outcome: 'emergency', token: 'emergency', targetToken: 'emergency' });
    });

    it('records the target command on the target contact as recognised', () => {
      const event = toGestureEvent(briefPinkyTap, { ...emergencyTarget, targetToken: 'quick_action_1' });
      expect(event).toMatchObject({ outcome: 'recognised', targetToken: 'quick_action_1' });
    });

    it('needs the command to match even without a target contact', () => {
      expect(toGestureEvent(confirmTap, { ...free, targetToken: 'confirm' }).outcome).toBe('recognised');
      expect(toGestureEvent(confirmTap, { ...free, targetToken: 'back' })).toMatchObject({ outcome: 'mismatch', targetToken: 'back' });
    });

    it('needs the contact to match too when both are given', () => {
      const event = toGestureEvent(confirmTap, { ...guided('index_base'), targetToken: 'confirm' });
      expect(event.outcome).toBe('mismatch');
    });

    it('keeps the target command on a dropped press', () => {
      expect(toGestureEvent(rejected('indeterminate_duration', 1300), { ...guided('ring_base'), targetToken: 'previous' })).toMatchObject({
        outcome: 'rejected_duration',
        token: null,
        targetToken: 'previous',
      });
    });

    it('omits the field when there is no target command', () => {
      expect(toGestureEvent(confirmTap, free)).not.toHaveProperty('targetToken');
      expect(toGestureEvent(confirmTap, { ...guided('index_tip'), targetToken: null })).not.toHaveProperty('targetToken');
    });
  });

  it('records a cancelled emergency hold with its elapsed time and no token', () => {
    const event = toGestureEvent({ id: 'e', at: AT, kind: 'emergency_cancelled', contact: 'pinky_tip', elapsedMs: 1800 }, free);
    expect(event).toMatchObject({ outcome: 'emergency_cancelled', token: null, detectedContact: 'pinky_tip', durationMs: 1800 });
  });
});

describe('squeezeGestureEvent', () => {
  it('records a squeeze as an activation with no contact, token or duration', () => {
    const event = squeezeGestureEvent(
      { source: 'training', mode: 'lesson', lessonId: 'squeeze_to_activate', evidence: 'simulated' },
      AT,
    );
    expect(event).toEqual({
      at: ISO,
      kind: 'activation',
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

  it('is never a command attempt, and never a success', () => {
    const stored = asStored(squeezeGestureEvent({ source: 'training', mode: 'lesson', evidence: 'simulated' }, AT));
    expect(eventKind(stored)).toBe('activation');
    expect(classifyEvent(stored)).toBe('activation');
    expect(isAccuracyAttempt(stored)).toBe(false);
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
