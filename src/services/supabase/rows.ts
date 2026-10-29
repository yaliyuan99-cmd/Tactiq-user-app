/**
 * Translating between the domain model and the database rows.
 *
 * Kept as pure functions, separate from anything that talks to the network, so
 * the part most likely to be wrong is also the part that is cheapest to test.
 * Every mapper is total in one direction and defensive in the other: a row
 * comes back from a database that an older or newer build may have written, so
 * reading one is validation, not a cast.
 *
 * A row that cannot be read is dropped rather than repaired into something
 * plausible. Inventing a value here would put a measurement in a person's
 * history that nothing produced.
 */
import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import { COMMAND_TOKENS, SHORTCUT_ACTION_IDS, type ShortcutActionId, type ShortcutMapping } from '@/domain/commands';
import { LESSON_IDS, type LessonId } from '@/domain/lessons';
import {
  GESTURE_EVENT_KINDS,
  HANDS,
  RECORD_EVIDENCE,
  type CalibrationProfile,
  type CalibrationSample,
  type GestureEvent,
  type GestureEventKind,
  type GestureEventMode,
  type GestureEventSource,
  type GestureOutcome,
  type Hand,
  type LessonProgress,
  type RecordEvidence,
} from '@/domain/models';
import { ONBOARDING_LAST_STEP } from '@/domain/onboarding';
import type { ProfilePreferencesRecord } from '@/services/preferences/storedPreferences';

/* ------------------------------------------------------------------ */
/* Row shapes, as the migration defines them                           */
/* ------------------------------------------------------------------ */

export interface PreferencesRow {
  user_id: string;
  audio_announcements: boolean;
  visual_confirmation: boolean;
  haptic_feedback: boolean;
  longer_interaction_time: boolean;
  hand: string;
  onboarding_completed: boolean;
  onboarding_step: number;
}

export interface GestureEventRow {
  user_id: string;
  id: string;
  at: string;
  source: string;
  mode: string;
  kind: string;
  target_contact: string | null;
  detected_contact: string | null;
  target_token: string | null;
  token: string | null;
  duration_ms: number | null;
  outcome: string;
  evidence: string;
  seeded: boolean;
  lesson_id: string | null;
}

export interface CalibrationProfileRow {
  user_id: string;
  id: string;
  hand: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  samples_required_per_contact: number;
  evidence: string;
  device_id: string | null;
}

export interface CalibrationSampleRow {
  user_id: string;
  ordinal: number;
  contact: string;
  recorded_at: string;
  duration_ms: number;
  detected_contact: string | null;
  accepted: boolean;
  reason: string | null;
}

export interface LessonProgressRow {
  user_id: string;
  lesson_id: string;
  status: string;
  attempts: number;
  correct: number;
  best_accuracy: number | null;
  last_accuracy: number | null;
  last_attempt_at: string | null;
  completed_at: string | null;
  runs: number;
  run_attempts: number;
  run_correct: number;
}

export interface CommandMappingRow {
  user_id: string;
  shortcut_1: string;
  shortcut_2: string;
}

/* ------------------------------------------------------------------ */
/* Readers                                                             */
/* ------------------------------------------------------------------ */

const GESTURE_SOURCES = ['simulator', 'training', 'calibration', 'device'] as const;
const GESTURE_MODES = ['guided', 'free', 'lesson', 'calibration', 'device'] as const;
const OUTCOMES = ['recognised', 'mismatch', 'rejected_duration', 'window_closed', 'emergency', 'emergency_cancelled'] as const;
const CALIBRATION_STATUSES = ['not_started', 'in_progress', 'incomplete', 'complete'] as const;
const LESSON_STATUSES = ['not_started', 'in_progress', 'complete'] as const;
const SAMPLE_REASONS = ['wrong_contact', 'too_long', 'no_contact'] as const;

function oneOf<T extends string>(values: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? (value as T) : null;
}

/** An ISO timestamp, or null. Postgres returns these with an offset; the app stores them as written. */
function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function ratio(value: unknown): number | null {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : null;
}

/**
 * One stored attempt. Returns null when a field the record cannot do without
 * is missing or unrecognised — an event with no time, no outcome or no
 * evidence label is not a weaker record, it is not a record.
 */
export function readGestureEvent(row: Partial<GestureEventRow>): GestureEvent | null {
  const at = timestamp(row.at);
  const outcome = oneOf(OUTCOMES, row.outcome);
  const evidence = oneOf(RECORD_EVIDENCE, row.evidence);
  const source = oneOf(GESTURE_SOURCES, row.source);
  const mode = oneOf(GESTURE_MODES, row.mode);
  if (!row.id || !at || !outcome || !evidence || !source || !mode) return null;

  const targetToken = oneOf(COMMAND_TOKENS, row.target_token);
  const lessonId = oneOf(LESSON_IDS, row.lesson_id);
  return {
    id: row.id,
    at,
    source: source as GestureEventSource,
    mode: mode as GestureEventMode,
    kind: (oneOf(GESTURE_EVENT_KINDS, row.kind) ?? 'command') as GestureEventKind,
    targetContact: oneOf(CONTACT_KEYS, row.target_contact),
    detectedContact: oneOf(CONTACT_KEYS, row.detected_contact),
    token: oneOf(COMMAND_TOKENS, row.token),
    durationMs: count(row.duration_ms),
    outcome: outcome as GestureOutcome,
    evidence: evidence as RecordEvidence,
    seeded: row.seeded === true,
    ...(targetToken ? { targetToken } : {}),
    ...(lessonId ? { lessonId } : {}),
  };
}

export function readPreferences(row: Partial<PreferencesRow>): ProfilePreferencesRecord | null {
  const hand = oneOf(HANDS, row.hand);
  if (!hand) return null;
  const step = count(row.onboarding_step);
  return {
    version: 1,
    audioAnnouncements: row.audio_announcements === true,
    visualConfirmation: row.visual_confirmation !== false,
    hapticFeedback: row.haptic_feedback !== false,
    longerInteractionTime: row.longer_interaction_time === true,
    hand: hand as Hand,
    onboardingCompleted: row.onboarding_completed === true,
    onboardingStep: step !== null && step <= ONBOARDING_LAST_STEP ? step : 0,
  };
}

export function readCalibrationSample(row: Partial<CalibrationSampleRow>): CalibrationSample | null {
  const contact = oneOf(CONTACT_KEYS, row.contact);
  const recordedAt = timestamp(row.recorded_at);
  const durationMs = count(row.duration_ms);
  if (!contact || !recordedAt || durationMs === null) return null;
  const reason = oneOf(SAMPLE_REASONS, row.reason);
  return {
    contact: contact as ContactKey,
    recordedAt,
    durationMs,
    detectedContact: oneOf(CONTACT_KEYS, row.detected_contact),
    accepted: row.accepted === true,
    ...(reason ? { reason } : {}),
  };
}

export function readCalibrationProfile(
  row: Partial<CalibrationProfileRow>,
  sampleRows: readonly Partial<CalibrationSampleRow>[],
): CalibrationProfile | null {
  const hand = oneOf(HANDS, row.hand);
  const status = oneOf(CALIBRATION_STATUSES, row.status);
  const startedAt = timestamp(row.started_at);
  const evidence = oneOf(RECORD_EVIDENCE, row.evidence);
  const required = count(row.samples_required_per_contact);
  if (!row.id || !hand || !status || !startedAt || !evidence || !required) return null;

  // Ordinal is the order the samples were taken in, and the database does not
  // promise to return them in it.
  const samples = [...sampleRows]
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map(readCalibrationSample)
    .filter((sample): sample is CalibrationSample => sample !== null);

  return {
    id: row.id,
    hand: hand as Hand,
    status: status as CalibrationProfile['status'],
    startedAt,
    completedAt: timestamp(row.completed_at),
    samplesRequiredPerContact: required,
    samples,
    evidence: evidence as 'simulated' | 'measured',
    deviceId: typeof row.device_id === 'string' ? row.device_id : null,
  };
}

export function readLessonProgress(row: Partial<LessonProgressRow>): LessonProgress | null {
  const lessonId = oneOf(LESSON_IDS, row.lesson_id);
  const status = oneOf(LESSON_STATUSES, row.status);
  const attempts = count(row.attempts);
  const correct = count(row.correct);
  if (!lessonId || !status || attempts === null || correct === null) return null;
  return {
    lessonId: lessonId as LessonId,
    status: status as LessonProgress['status'],
    attempts,
    // A row claiming more correct than attempted is contradictory. The database
    // rejects it, so this only fires for a row written by something else.
    correct: Math.min(correct, attempts),
    bestAccuracy: ratio(row.best_accuracy),
    lastAccuracy: ratio(row.last_accuracy),
    lastAttemptAt: timestamp(row.last_attempt_at),
    completedAt: timestamp(row.completed_at),
    runs: count(row.runs) ?? 0,
    runAttempts: count(row.run_attempts) ?? 0,
    runCorrect: Math.min(count(row.run_correct) ?? 0, count(row.run_attempts) ?? 0),
  };
}

/**
 * The two assignable slots, each holding the phone action it triggers.
 *
 * A slot whose action this build does not recognise reads as 'unassigned'
 * rather than failing the pair: the tap is still recognised, it just does
 * nothing, which is a state the product already has words for. That is the
 * difference between this and the other readers — here there is a truthful
 * fallback, and elsewhere there is not.
 */
export function readShortcuts(row: Partial<CommandMappingRow>): ShortcutMapping | null {
  if (row.shortcut_1 === undefined && row.shortcut_2 === undefined) return null;
  return {
    quick_action_1: (oneOf(SHORTCUT_ACTION_IDS, row.shortcut_1) ?? 'unassigned') as ShortcutActionId,
    quick_action_2: (oneOf(SHORTCUT_ACTION_IDS, row.shortcut_2) ?? 'unassigned') as ShortcutActionId,
  };
}

/* ------------------------------------------------------------------ */
/* Writers                                                             */
/* ------------------------------------------------------------------ */

export function writeGestureEvent(userId: string, event: GestureEvent): GestureEventRow {
  return {
    user_id: userId,
    id: event.id,
    at: event.at,
    source: event.source,
    mode: event.mode,
    kind: event.kind ?? 'command',
    target_contact: event.targetContact,
    detected_contact: event.detectedContact,
    target_token: event.targetToken ?? null,
    token: event.token,
    duration_ms: event.durationMs,
    outcome: event.outcome,
    evidence: event.evidence,
    seeded: event.seeded,
    lesson_id: event.lessonId ?? null,
  };
}

export function writePreferences(userId: string, preferences: ProfilePreferencesRecord): PreferencesRow {
  return {
    user_id: userId,
    audio_announcements: preferences.audioAnnouncements,
    visual_confirmation: preferences.visualConfirmation,
    haptic_feedback: preferences.hapticFeedback,
    longer_interaction_time: preferences.longerInteractionTime,
    hand: preferences.hand,
    onboarding_completed: preferences.onboardingCompleted,
    onboarding_step: preferences.onboardingStep,
  };
}

export function writeCalibration(
  userId: string,
  profile: CalibrationProfile,
): { profile: CalibrationProfileRow; samples: CalibrationSampleRow[] } {
  return {
    profile: {
      user_id: userId,
      id: profile.id,
      hand: profile.hand,
      status: profile.status,
      started_at: profile.startedAt,
      completed_at: profile.completedAt,
      samples_required_per_contact: profile.samplesRequiredPerContact,
      evidence: profile.evidence,
      device_id: profile.deviceId,
    },
    samples: profile.samples.map((sample, ordinal) => ({
      user_id: userId,
      ordinal,
      contact: sample.contact,
      recorded_at: sample.recordedAt,
      duration_ms: sample.durationMs,
      detected_contact: sample.detectedContact,
      accepted: sample.accepted,
      reason: sample.reason ?? null,
    })),
  };
}

export function writeLessonProgress(userId: string, progress: LessonProgress): LessonProgressRow {
  return {
    user_id: userId,
    lesson_id: progress.lessonId,
    status: progress.status,
    attempts: progress.attempts,
    correct: progress.correct,
    best_accuracy: progress.bestAccuracy,
    last_accuracy: progress.lastAccuracy,
    last_attempt_at: progress.lastAttemptAt,
    completed_at: progress.completedAt,
    runs: progress.runs,
    run_attempts: progress.runAttempts ?? 0,
    run_correct: progress.runCorrect ?? 0,
  };
}

export function writeShortcuts(userId: string, shortcuts: ShortcutMapping): CommandMappingRow {
  return { user_id: userId, shortcut_1: shortcuts.quick_action_1, shortcut_2: shortcuts.quick_action_2 };
}
