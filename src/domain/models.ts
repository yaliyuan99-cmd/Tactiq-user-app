/**
 * Typed models shared by every service and screen. Every record that could
 * be mistaken for a measurement carries an `evidence` field.
 */
import { type ContactKey } from './contacts';
import { type CommandToken, type ShortcutMapping } from './commands';
import { type LessonId } from './lessons';

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

/* The option sets are exported as values so labels, radio groups and the guard
 * that validates stored preferences all read from one list. */
export const HANDS = ['left', 'right'] as const;
export type Hand = (typeof HANDS)[number];

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const TEXT_SIZES = ['default', 'large', 'larger'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const CONTRAST_PREFERENCES = ['default', 'high'] as const;
export type ContrastPreference = (typeof CONTRAST_PREFERENCES)[number];

export interface UserPreferences {
  readonly version: 1;
  readonly theme: ThemePreference;
  readonly textSize: TextSize;
  readonly contrast: ContrastPreference;
  readonly reducedMotion: boolean;
  /** Speak announcements aloud with the browser's speech synthesis. */
  readonly audioAnnouncements: boolean;
  /** Flash the contact point and show the command name on screen. */
  readonly visualConfirmation: boolean;
  /** Vibrate the phone (where the browser allows it) as a stand-in for the ring's haptics. */
  readonly hapticFeedback: boolean;
  /**
   * Doubles the command window of the simulated ring (Demo Mode). A connected
   * bench prototype keeps its firmware's 3-second window, and the Emergency
   * hold and tap limit do not change.
   */
  readonly longerInteractionTime: boolean;
  readonly hand: Hand;
  readonly onboardingCompleted: boolean;
  /** Last onboarding step reached, so a user can return later. */
  readonly onboardingStep: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  version: 1,
  theme: 'system',
  textSize: 'default',
  contrast: 'default',
  reducedMotion: false,
  audioAnnouncements: false,
  visualConfirmation: true,
  hapticFeedback: true,
  longerInteractionTime: false,
  hand: 'right',
  onboardingCompleted: false,
  onboardingStep: 0,
};

/* ------------------------------------------------------------------ */
/* Command mapping                                                     */
/* ------------------------------------------------------------------ */

export interface CommandMapping {
  readonly version: 1;
  readonly shortcuts: ShortcutMapping;
  readonly updatedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Calibration                                                         */
/* ------------------------------------------------------------------ */

export type CalibrationStatus = 'not_started' | 'in_progress' | 'complete' | 'incomplete';

export interface CalibrationSample {
  readonly contact: ContactKey;
  readonly recordedAt: string;
  readonly durationMs: number;
  /** The contact the ring (or mock ring) reported for this prompt. */
  readonly detectedContact: ContactKey | null;
  readonly accepted: boolean;
  readonly reason?: 'wrong_contact' | 'too_long' | 'no_contact';
}

export interface CalibrationProfile {
  readonly id: string;
  readonly hand: Hand;
  readonly status: CalibrationStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly samplesRequiredPerContact: number;
  readonly samples: readonly CalibrationSample[];
  readonly evidence: 'simulated' | 'measured';
  readonly deviceId: string | null;
}

export interface CalibrationCoverage {
  readonly contact: ContactKey;
  readonly accepted: number;
  readonly required: number;
  readonly needsRepeat: boolean;
}

export interface CalibrationSummary {
  readonly status: CalibrationStatus;
  readonly coverage: readonly CalibrationCoverage[];
  readonly pointsNeedingRepeat: readonly ContactKey[];
  readonly lastPerformedAt: string | null;
  readonly evidence: 'simulated' | 'measured' | null;
  readonly hand: Hand | null;
  /**
   * The ring the calibration was recorded against, or null for a simulated
   * one. Carried so a finished calibration can be checked against the ring
   * now connected: without it nothing downstream can even see that a complete
   * profile belongs to a different device.
   */
  readonly deviceId: string | null;
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

export type LessonStatus = 'not_started' | 'in_progress' | 'complete';

export interface LessonProgress {
  readonly lessonId: LessonId;
  readonly status: LessonStatus;
  readonly attempts: number;
  readonly correct: number;
  /** Best completed-run accuracy, 0–1, or null if never completed. */
  readonly bestAccuracy: number | null;
  readonly lastAccuracy: number | null;
  readonly lastAttemptAt: string | null;
  readonly completedAt: string | null;
  readonly runs: number;
  /** Attempts in the current (or most recent) run. Zeroed when a run starts or the lesson restarts. */
  readonly runAttempts?: number;
  /** Correct attempts in the current (or most recent) run. */
  readonly runCorrect?: number;
}

export interface TrainingProgress {
  readonly version: 1;
  readonly lessons: Readonly<Record<LessonId, LessonProgress>>;
}

export interface TrainingSummary {
  readonly lessonsCompleted: number;
  readonly lessonsTotal: number;
  readonly attempts: number;
  readonly correct: number;
  readonly accuracy: number | null;
  readonly commandsLearnt: readonly CommandToken[];
  readonly nextLesson: LessonId | null;
  readonly evidence: 'simulated';
}

/* ------------------------------------------------------------------ */
/* Activity history                                                    */
/* ------------------------------------------------------------------ */

export type GestureEventSource = 'simulator' | 'training' | 'calibration' | 'device';
export type GestureEventMode = 'guided' | 'free' | 'lesson' | 'calibration' | 'device';

/**
 * What a record describes.
 * - `command`: a press aimed at a command — a tap, a five-second hold, or a
 *   press that was dropped. This is the default, so records saved before the
 *   field existed still read correctly.
 * - `activation`: the deliberate squeeze that opens the command window. It
 *   carries no contact point and no command, and it is never a command
 *   attempt, right or wrong.
 */
export const GESTURE_EVENT_KINDS = ['command', 'activation'] as const;
export type GestureEventKind = (typeof GESTURE_EVENT_KINDS)[number];

/** The evidence a stored record can carry. Nothing in this app is validated performance. */
export const RECORD_EVIDENCE = ['simulated', 'measured'] as const;
export type RecordEvidence = (typeof RECORD_EVIDENCE)[number];

export type GestureOutcome =
  /** A tap was recognised as a command (in guided modes: it matched the target). */
  | 'recognised'
  /** A tap was recognised, but not as the target that was asked for. */
  | 'mismatch'
  /** Press was neither a brief tap nor a full hold, so it was dropped. */
  | 'rejected_duration'
  /** The tap arrived with the command window closed. */
  | 'window_closed'
  /** A five-second hold completed. Simulation only. */
  | 'emergency'
  /** A hold on the emergency point was released before five seconds. */
  | 'emergency_cancelled';

export interface GestureEvent {
  readonly id: string;
  readonly at: string;
  readonly source: GestureEventSource;
  readonly mode: GestureEventMode;
  readonly targetContact: ContactKey | null;
  /**
   * The command the exercise asked for. Set by guided practice and lessons
   * when known. It disambiguates a target contact that carries two commands:
   * on the pinky fingertip, a guided Emergency hold answered with a brief tap
   * is an attempt at `emergency`, not at `quick_action_1`. Absent on free
   * practice, on calibration (which prompts a point, not a command) and on
   * records saved before this field existed.
   */
  readonly targetToken?: CommandToken;
  readonly detectedContact: ContactKey | null;
  readonly token: CommandToken | null;
  readonly durationMs: number | null;
  readonly outcome: GestureOutcome;
  readonly evidence: RecordEvidence;
  /** True for the seeded sample records in Demo Mode. */
  readonly seeded: boolean;
  readonly lessonId?: LessonId;
  /**
   * See GESTURE_EVENT_KINDS. Absent on records saved before the field existed;
   * `eventKind()` reads those as command records (and infers the old squeeze
   * records, which carried no contact, token or duration at all).
   */
  readonly kind?: GestureEventKind;
}

export type HistoryRange = 'today' | '7d' | 'all';

export interface CommandPerformance {
  readonly token: CommandToken;
  readonly attempts: number;
  readonly successes: number;
  /** successes / attempts, or null when there are no attempts. */
  readonly rate: number | null;
}

/**
 * A rate with the counts it came from, so a percentage is never carried — or
 * shown — on its own.
 */
export interface AttemptRate {
  readonly attempts: number;
  readonly successes: number;
  /** successes / attempts, or null when there are no attempts. */
  readonly rate: number | null;
}

/**
 * What a record is, for counting. Every record falls into exactly one class,
 * and the classes are the one definition of the accuracy denominator. The
 * rules live in `services/history/classify.ts`.
 */
export const ACTIVITY_RECORD_CLASSES = ['activation', 'attempt', 'untargeted', 'emergency'] as const;
export type ActivityRecordClass = (typeof ACTIVITY_RECORD_CLASSES)[number];

/** Records in a view, counted by class. `activations + attempts + untargeted + emergency === total`. */
export interface ActivityCounts {
  /** Every record in the view, whatever its class. */
  readonly total: number;
  /** Squeezes that opened the command window. Never command attempts. */
  readonly activations: number;
  /** Attempts at something that was asked for: the accuracy denominator. */
  readonly attempts: number;
  /** Of `attempts`, those attributed to one command — exactly what `perCommand` sums to. */
  readonly commandAttempts: number;
  /** Of `attempts`, calibration prompts, which ask for a contact point and no command. */
  readonly contactAttempts: number;
  /** Command records with nothing asked for (free practice): recorded, never scored. */
  readonly untargeted: number;
  /** Emergency holds, and presses that answered an Emergency prompt. Scored apart from taps. */
  readonly emergency: number;
  /** Demo Mode sample records among `total`. */
  readonly seeded: number;
  /** `total` minus `seeded`: the records the user made. */
  readonly own: number;
}

/** Every outcome in a view, counted, whatever its class — so nothing is silently dropped. */
export type OutcomeCounts = Readonly<Record<GestureOutcome, number>>;

/**
 * The emergency hold, scored on its own terms: a five-second hold is never a
 * recognised tap, so it is never part of the command accuracy figure.
 */
export interface EmergencyPerformance {
  /** Emergency records in view: `completed + cancelled + notHeld`. */
  readonly attempts: number;
  /** Five-second holds that completed. Simulation only — nothing is ever sent. */
  readonly completed: number;
  /** Holds released before five seconds. */
  readonly cancelled: number;
  /** Presses answering an Emergency prompt that were not a hold: a brief tap, or a press that was dropped. */
  readonly notHeld: number;
  /** completed / attempts, or null when there are none. */
  readonly rate: number | null;
}

/** One evidence's share of a view, so simulated practice is never blended into one figure with bench readings. */
export interface EvidenceSlice {
  readonly records: number;
  readonly accuracy: AttemptRate;
}

export type EvidenceBreakdown = Readonly<Record<RecordEvidence, EvidenceSlice>>;

export interface ActivitySummary {
  readonly range: HistoryRange;
  /**
   * The accuracy denominator: presses that answered a question the app asked —
   * guided practice, lesson steps and calibration prompts. Activations, free
   * practice and emergency holds are excluded, so
   * `attempts === successes + misclassifications + rejected`.
   */
  readonly attempts: number;
  readonly successes: number;
  /** Mismatches among `attempts`. */
  readonly misclassifications: number;
  /** Dropped presses among `attempts`: too long for a tap, or the window had closed. */
  readonly rejected: number;
  /** Completed emergency holds in view; the same number as `emergency.completed`. */
  readonly emergencies: number;
  readonly mostPractised: { readonly token: CommandToken; readonly count: number } | null;
  /**
   * One row per command. The Emergency row always reads zero attempts: a hold
   * is not a tap, and it is counted in `emergency` instead. The rows sum
   * exactly to `counts.commandAttempts`.
   */
  readonly perCommand: readonly CommandPerformance[];
  readonly firstAt: string | null;
  readonly lastAt: string | null;
  readonly includesSeeded: boolean;
  readonly evidence: 'simulated' | 'measured' | 'mixed' | null;
  /** `attempts` and `successes` with their rate, so the figure never travels alone. */
  readonly accuracy: AttemptRate;
  /** The part of `accuracy` attributed to commands: what `perCommand` sums to. */
  readonly commandAccuracy: AttemptRate;
  /** The part of `accuracy` from calibration prompts, which name a point and no command. */
  readonly contactAccuracy: AttemptRate;
  readonly emergency: EmergencyPerformance;
  readonly counts: ActivityCounts;
  readonly outcomes: OutcomeCounts;
  /** Accuracy per evidence, so a mixed view can separate the two instead of blending them. */
  readonly byEvidence: EvidenceBreakdown;
  /** True when the filter behind this summary left records out (see isNarrowingFilter). */
  readonly filtered: boolean;
}
