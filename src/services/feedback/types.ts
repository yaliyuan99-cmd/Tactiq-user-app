/**
 * Feedback contract: one place that turns ring events into what the user
 * perceives — a live-region announcement (always), speech (if audio
 * announcements are on), vibration (if haptic feedback is on and the browser
 * allows it). Visual confirmation is rendered by components, which read the
 * same preference.
 */
export type FeedbackKind =
  | 'armed'
  | 'window_closed'
  | 'confirm'
  | 'reject'
  | 'emergency_arming'
  | 'emergency'
  | 'emergency_cancelled'
  | 'connection';

export interface AnnounceOptions {
  /** Interrupts the screen reader; use only for time-critical messages. */
  readonly assertive?: boolean;
  /** Also speak aloud regardless of the audio preference (e.g. calibration prompts the user opted into). */
  readonly forceSpeech?: boolean;
}

export interface FeedbackContextValue {
  /** Announces through an aria-live region; speaks aloud when enabled. */
  announce(message: string, options?: AnnounceOptions): void;
  /** Announce + speak + vibrate pattern for a ring event, respecting preferences. */
  feedback(kind: FeedbackKind, message: string): void;
  speak(text: string): void;
  stopSpeaking(): void;
  /** Returns false when vibration is unavailable or switched off. */
  vibrate(pattern: number | number[]): boolean;
  readonly canVibrate: boolean;
  readonly canSpeak: boolean;
}

/** Vibration patterns (ms) that stand in for the ring's four haptic classes. */
export const VIBRATION_PATTERNS: Readonly<Record<FeedbackKind, number[]>> = {
  armed: [20],
  window_closed: [],
  confirm: [60],
  reject: [30, 60, 30],
  emergency_arming: [40, 80, 40],
  emergency: [750],
  emergency_cancelled: [],
  connection: [30],
};
