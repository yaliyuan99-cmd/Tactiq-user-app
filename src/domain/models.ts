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
   * The command the exercise asked for. Set by guided practice, lessons and
   * calibration when known. It disambiguates a target contact that carries two
   * commands: on the pinky fingertip, a guided Emergency hold answered with a
   * brief tap is an attempt at `emergency`, not at `quick_action_1`. Absent on
   * free practice and on records saved before this field existed.
   */
  readonly targetToken?: CommandToken;
  readonly detectedContact: ContactKey | null;
  readonly token: CommandToken | null;
  readonly durationMs: number | null;
  readonly outcome: GestureOutcome;
  readonly evidence: 'simulated' | 'measured';
  /** True for the seeded sample records in Demo Mode. */
  readonly seeded: boolean;
  readonly lessonId?: LessonId;
}

export type HistoryRange = 'today' | '7d' | 'all';

export interface CommandPerformance {
  readonly token: CommandToken;
  readonly attempts: number;
  readonly successes: number;
  /** successes / attempts, or null when there are no attempts. */
  readonly rate: number | null;
}

export interface ActivitySummary {
  readonly range: HistoryRange;
  readonly attempts: number;
  readonly successes: number;
  readonly misclassifications: number;
  readonly rejected: number;
  readonly emergencies: number;
  readonly mostPractised: { readonly token: CommandToken; readonly count: number } | null;
  readonly perCommand: readonly CommandPerformance[];
  readonly firstAt: string | null;
  readonly lastAt: string | null;
  readonly includesSeeded: boolean;
  readonly evidence: 'simulated' | 'measured' | 'mixed' | null;
}
