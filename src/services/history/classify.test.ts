import {
  ACTIVATION_LABEL,
  classifyEvent,
  eventKind,
  hasKnownTarget,
  intendedToken,
  isAccuracyAttempt,
  isAccuracySuccess,
  isActivation,
  isContactPrompt,
  isDropped,
} from './classify';
import {
  makeActivationEvent,
  makeCalibrationEvent,
  makeEmergencyEvent,
  makeFreePracticeEvent,
  makeGestureEvent as ev,
  makeLegacyActivationEvent,
} from './testing';

describe('eventKind', () => {
  it('reads the stored kind when there is one', () => {
    expect(eventKind(makeActivationEvent())).toBe('activation');
    expect(eventKind(ev({ kind: 'command' }))).toBe('command');
  });

  it('reads a record saved before the field existed as a command record', () => {
    const legacy = ev();
    expect('kind' in legacy).toBe(false);
    expect(eventKind(legacy)).toBe('command');
    expect(eventKind(ev({ outcome: 'mismatch', detectedContact: 'index_base', token: 'back' }))).toBe('command');
  });

  it('infers the old squeeze records, which had no contact, command or duration', () => {
    const legacy = makeLegacyActivationEvent();
    expect('kind' in legacy).toBe(false);
    expect(eventKind(legacy)).toBe('activation');
    expect(isActivation(legacy)).toBe(true);
  });

  it('does not mistake a dropped press for a squeeze', () => {
    const dropped = ev({ targetContact: null, detectedContact: 'ring_base', token: null, durationMs: null, outcome: 'window_closed' });
    expect(eventKind(dropped)).toBe('command');
  });

  it('names activations for the screens, so no page has to invent a label', () => {
    expect(ACTIVATION_LABEL).toBe('Ring activated');
  });
});

describe('intendedToken', () => {
  it('uses the tap command on the target contact when one was set', () => {
    expect(intendedToken(ev({ targetContact: 'index_tip', detectedContact: 'index_base', token: 'back', outcome: 'mismatch' }))).toBe('confirm');
    expect(intendedToken(ev({ targetContact: 'pinky_tip', token: 'quick_action_1' }))).toBe('quick_action_1');
  });

  it('treats a rejected press on a target as an attempt at that target', () => {
    expect(intendedToken(ev({ targetContact: 'ring_base', token: null, outcome: 'rejected_duration' }))).toBe('previous');
  });

  it('returns emergency for emergency holds, even on the pinky fingertip target', () => {
    expect(intendedToken(ev({ targetContact: 'pinky_tip', token: 'emergency', outcome: 'emergency' }))).toBe('emergency');
    expect(intendedToken(ev({ targetContact: 'pinky_tip', token: null, outcome: 'emergency_cancelled' }))).toBe('emergency');
    expect(
      intendedToken(ev({ targetContact: 'pinky_tip', token: null, outcome: 'rejected_duration', lessonId: 'emergency_hold' })),
    ).toBe('emergency');
  });

  it('prefers the stored target command over every other rule', () => {
    // A guided Emergency hold answered with a brief tap (Shortcut 1 on the same point).
    expect(
      intendedToken(ev({ targetContact: 'pinky_tip', targetToken: 'emergency', token: 'quick_action_1', outcome: 'mismatch' })),
    ).toBe('emergency');
    // Asked for Shortcut 1, but the hold ran on: still an attempt at Shortcut 1.
    expect(
      intendedToken(ev({ targetContact: 'pinky_tip', targetToken: 'quick_action_1', token: null, outcome: 'emergency_cancelled' })),
    ).toBe('quick_action_1');
    expect(intendedToken(ev({ targetContact: null, detectedContact: 'index_tip', targetToken: 'next', token: 'confirm' }))).toBe('next');
  });

  it('keeps the contact rule for records without a target command', () => {
    const legacy = ev({ targetContact: 'pinky_tip', token: 'quick_action_1' });
    expect('targetToken' in legacy).toBe(false);
    expect(intendedToken(legacy)).toBe('quick_action_1');
  });

  it('falls back to the recognised token without a target, or null', () => {
    expect(intendedToken(makeFreePracticeEvent())).toBe('next');
    expect(intendedToken(ev({ targetContact: null, detectedContact: null, token: null, outcome: 'window_closed' }))).toBeNull();
  });

  it('attributes a calibration record to no command, because calibration prompts a point', () => {
    const calibration = makeCalibrationEvent();
    expect(isContactPrompt(calibration)).toBe(true);
    expect(intendedToken(calibration)).toBeNull();
    // Even on the pinky fingertip, where a tap would otherwise read as Shortcut 1.
    expect(intendedToken(makeCalibrationEvent({ targetContact: 'pinky_tip', detectedContact: 'pinky_tip', token: 'quick_action_1' }))).toBeNull();
    // Both the source and the mode are enough on their own.
    expect(intendedToken({ ...calibration, mode: 'guided' })).toBeNull();
    expect(intendedToken({ ...calibration, source: 'device' })).toBeNull();
  });

  it('reads a record that carries no mode at all, as a row renderer may pass', () => {
    const { mode: _mode, ...withoutMode } = ev({ targetContact: 'middle_base', token: 'next' });
    expect(intendedToken(withoutMode)).toBe('next');
  });

  it('still names the command for an activation as none', () => {
    expect(intendedToken(makeActivationEvent())).toBeNull();
  });
});

describe('classifyEvent', () => {
  it('puts a guided or lesson tap at a known target in the accuracy denominator', () => {
    expect(classifyEvent(ev())).toBe('attempt');
    expect(classifyEvent(ev({ source: 'training', mode: 'lesson', lessonId: 'confirm_and_back', targetToken: 'confirm' }))).toBe('attempt');
    expect(classifyEvent(makeCalibrationEvent())).toBe('attempt');
    expect(isAccuracyAttempt(ev())).toBe(true);
  });

  it('keeps a dropped press at a known target in the denominator: it is a failure, not an absence', () => {
    const dropped = ev({ targetContact: 'ring_base', token: null, durationMs: 900, outcome: 'rejected_duration' });
    expect(classifyEvent(dropped)).toBe('attempt');
    expect(isDropped(dropped)).toBe(true);
    expect(isAccuracySuccess(dropped)).toBe(false);
    expect(classifyEvent(ev({ targetContact: 'ring_base', token: null, durationMs: null, outcome: 'window_closed' }))).toBe('attempt');
  });

  it('leaves activations out, stored kind or inferred', () => {
    expect(classifyEvent(makeActivationEvent())).toBe('activation');
    expect(classifyEvent(makeLegacyActivationEvent())).toBe('activation');
    expect(isAccuracyAttempt(makeActivationEvent())).toBe(false);
    expect(hasKnownTarget(makeActivationEvent())).toBe(false);
  });

  it('leaves free practice out, because no question was asked', () => {
    const free = makeFreePracticeEvent();
    expect(free.outcome).toBe('recognised');
    expect(classifyEvent(free)).toBe('untargeted');
    expect(isAccuracyAttempt(free)).toBe(false);
    expect(isAccuracySuccess(free)).toBe(false);
    // A dropped press in free practice is recorded and still not scored.
    expect(classifyEvent(makeFreePracticeEvent({ token: null, outcome: 'rejected_duration', durationMs: 900 }))).toBe('untargeted');
  });

  it('counts emergency holds on their own terms, never as taps', () => {
    expect(classifyEvent(makeEmergencyEvent())).toBe('emergency');
    expect(classifyEvent(makeEmergencyEvent({ token: null, outcome: 'emergency_cancelled', durationMs: 2100 }))).toBe('emergency');
    // A brief tap answering an Emergency prompt is an emergency record, not a Shortcut 1 attempt.
    expect(
      classifyEvent(ev({ targetContact: 'pinky_tip', targetToken: 'emergency', detectedContact: 'pinky_tip', token: 'quick_action_1', outcome: 'mismatch' })),
    ).toBe('emergency');
    // An emergency hold in free practice is an emergency record too.
    expect(classifyEvent(makeFreePracticeEvent({ detectedContact: 'pinky_tip', token: 'emergency', outcome: 'emergency' }))).toBe('emergency');
  });

  it('scores an attempt at Shortcut 1 on the shared point as a tap attempt', () => {
    const shortcut = ev({ targetContact: 'pinky_tip', targetToken: 'quick_action_1', detectedContact: 'pinky_tip', token: 'quick_action_1' });
    expect(classifyEvent(shortcut)).toBe('attempt');
    expect(isAccuracySuccess(shortcut)).toBe(true);
  });
});
