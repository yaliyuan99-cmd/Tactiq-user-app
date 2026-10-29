import { DEFAULT_PREFERENCES } from '@/domain/models';
import { profilePreferences } from '@/services/preferences/storedPreferences';
import {
  readCalibrationProfile,
  readGestureEvent,
  readLessonProgress,
  readPreferences,
  readShortcuts,
  writeCalibration,
  writeGestureEvent,
  writeLessonProgress,
  writePreferences,
  writeShortcuts,
  type GestureEventRow,
} from './rows';

const USER = '11111111-2222-3333-4444-555555555555';

function eventRow(patch: Partial<GestureEventRow> = {}): Partial<GestureEventRow> {
  return {
    user_id: USER,
    id: 'evt_1',
    at: '2026-10-30T09:00:00.000Z',
    source: 'simulator',
    mode: 'guided',
    kind: 'command',
    target_contact: 'index_tip',
    detected_contact: 'index_tip',
    target_token: 'confirm',
    token: 'confirm',
    duration_ms: 120,
    outcome: 'recognised',
    evidence: 'simulated',
    seeded: false,
    lesson_id: null,
    ...patch,
  };
}

describe('gesture events', () => {
  it('survives a round trip unchanged', () => {
    const event = readGestureEvent(eventRow());
    expect(event).not.toBeNull();
    expect(writeGestureEvent(USER, event!)).toEqual(eventRow());
  });

  it.each([
    ['no id', { id: undefined }],
    ['no time', { at: null as unknown as string }],
    ['an unparseable time', { at: 'last Tuesday' }],
    ['an outcome this build does not know', { outcome: 'recognised_probably' }],
    ['no evidence label', { evidence: undefined }],
    ['an evidence label this build does not know', { evidence: 'validated' }],
    ['a source this build does not know', { source: 'wristband' }],
  ])('drops a row with %s rather than guessing', (_name, patch) => {
    expect(readGestureEvent(eventRow(patch as Partial<GestureEventRow>))).toBeNull();
  });

  it('drops an unknown contact or command to null instead of dropping the whole record', () => {
    // A record whose outcome and timing are intact is still true about when
    // something happened and whether it worked, so it is worth keeping.
    const event = readGestureEvent(eventRow({ detected_contact: 'thumb_tip', token: 'launch_rocket' }));
    expect(event).toMatchObject({ detectedContact: null, token: null, outcome: 'recognised' });
  });

  it('reads a record written before the kind field existed as a command', () => {
    const event = readGestureEvent(eventRow({ kind: undefined }));
    expect(event?.kind).toBe('command');
  });

  it('never reads a seeded sample as something the user did', () => {
    expect(readGestureEvent(eventRow({ seeded: undefined }))?.seeded).toBe(false);
    expect(readGestureEvent(eventRow({ seeded: true }))?.seeded).toBe(true);
  });

  it('omits the optional fields rather than writing them as undefined', () => {
    const event = readGestureEvent(eventRow({ target_token: null, lesson_id: null }));
    expect(event).not.toHaveProperty('targetToken');
    expect(event).not.toHaveProperty('lessonId');
  });
});

describe('preferences', () => {
  it('survives a round trip', () => {
    const record = profilePreferences({ ...DEFAULT_PREFERENCES, hand: 'left', onboardingCompleted: true, onboardingStep: 3 });
    const row = writePreferences(USER, record);
    expect(readPreferences(row)).toEqual(record);
  });

  it('refuses a row with no usable hand, because every screen is drawn around it', () => {
    expect(readPreferences({ user_id: USER, hand: 'either' })).toBeNull();
  });

  it('puts an out-of-range setup step back to the start rather than past the end', () => {
    expect(readPreferences({ user_id: USER, hand: 'right', onboarding_step: 97 })?.onboardingStep).toBe(0);
    expect(readPreferences({ user_id: USER, hand: 'right', onboarding_step: -1 })?.onboardingStep).toBe(0);
  });

  it('defaults the two confirmations that are on, and the two that are off', () => {
    const read = readPreferences({ user_id: USER, hand: 'right' });
    expect(read).toMatchObject({
      visualConfirmation: true,
      hapticFeedback: true,
      audioAnnouncements: false,
      longerInteractionTime: false,
    });
  });
});

describe('calibration', () => {
  const profile = {
    id: 'cal_1',
    hand: 'right' as const,
    status: 'complete' as const,
    startedAt: '2026-10-30T09:00:00.000Z',
    completedAt: '2026-10-30T09:05:00.000Z',
    samplesRequiredPerContact: 3,
    evidence: 'simulated' as const,
    deviceId: null,
    samples: [
      { contact: 'index_tip' as const, recordedAt: '2026-10-30T09:01:00.000Z', durationMs: 110, detectedContact: 'index_tip' as const, accepted: true },
      { contact: 'index_tip' as const, recordedAt: '2026-10-30T09:02:00.000Z', durationMs: 900, detectedContact: null, accepted: false, reason: 'too_long' as const },
    ],
  };

  it('survives a round trip, samples and all', () => {
    const { profile: row, samples } = writeCalibration(USER, profile);
    expect(readCalibrationProfile(row, samples)).toEqual(profile);
  });

  it('puts the samples back in the order they were taken, whatever order they arrive in', () => {
    const { profile: row, samples } = writeCalibration(USER, profile);
    const read = readCalibrationProfile(row, [...samples].reverse());
    expect(read?.samples.map((s) => s.recordedAt)).toEqual(profile.samples.map((s) => s.recordedAt));
  });

  it('keeps the readable samples when one of them is not', () => {
    const { profile: row, samples } = writeCalibration(USER, profile);
    const read = readCalibrationProfile(row, [...samples, { user_id: USER, ordinal: 9, contact: 'elbow' }]);
    expect(read?.samples).toHaveLength(2);
  });

  it('refuses a profile with no start time', () => {
    const { profile: row, samples } = writeCalibration(USER, profile);
    expect(readCalibrationProfile({ ...row, started_at: '' }, samples)).toBeNull();
  });
});

describe('lesson progress', () => {
  const progress = {
    lessonId: 'confirm_and_back' as const,
    status: 'complete' as const,
    attempts: 10,
    correct: 9,
    bestAccuracy: 0.9,
    lastAccuracy: 0.9,
    lastAttemptAt: '2026-10-30T09:00:00.000Z',
    completedAt: '2026-10-30T09:04:00.000Z',
    runs: 2,
    runAttempts: 5,
    runCorrect: 5,
  };

  it('survives a round trip', () => {
    expect(readLessonProgress(writeLessonProgress(USER, progress))).toEqual(progress);
  });

  it('will not report more correct attempts than attempts', () => {
    const row = { ...writeLessonProgress(USER, progress), correct: 40 };
    expect(readLessonProgress(row)?.correct).toBe(10);
  });

  it('drops an accuracy outside 0–1 instead of showing it', () => {
    const row = { ...writeLessonProgress(USER, progress), best_accuracy: 1.4 };
    expect(readLessonProgress(row)?.bestAccuracy).toBeNull();
  });

  it('refuses a row for a lesson this build does not have', () => {
    expect(readLessonProgress({ ...writeLessonProgress(USER, progress), lesson_id: 'advanced_telekinesis' })).toBeNull();
  });
});

describe('shortcuts', () => {
  it('survives a round trip', () => {
    const shortcuts = { quick_action_1: 'read_notifications' as const, quick_action_2: 'toggle_flashlight' as const };
    expect(readShortcuts(writeShortcuts(USER, shortcuts))).toEqual(shortcuts);
  });

  it('reads an action this build does not have as nothing assigned', () => {
    // The tap is still recognised and still does nothing, which is a state
    // the product already explains. Guessing a different action would run
    // something on the user's phone that they never chose.
    expect(readShortcuts({ user_id: USER, shortcut_1: 'summon_taxi', shortcut_2: 'play_pause' })).toEqual({
      quick_action_1: 'unassigned',
      quick_action_2: 'play_pause',
    });
  });

  it('will not accept a command token where an action belongs', () => {
    expect(readShortcuts({ user_id: USER, shortcut_1: 'emergency', shortcut_2: 'confirm' })).toEqual({
      quick_action_1: 'unassigned',
      quick_action_2: 'unassigned',
    });
  });

  it('returns nothing when the row holds no shortcut at all', () => {
    expect(readShortcuts({ user_id: USER })).toBeNull();
  });
});
