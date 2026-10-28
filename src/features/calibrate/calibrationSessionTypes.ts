/** The shape of the calibration page's controller, shared by its views. */
import type { ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, Hand } from '@/domain/models';
import type { RingController } from '@/features/practice';
import type { CalibrationRun, Resumability } from './calibrationFlow';
import type { RunRingState, StartState } from './calibrationScreenState';
import type { FeedbackTone } from './calibrationWording';

export type CalibrationPhase = 'start' | 'running' | 'results';

export interface FeedbackLine {
  readonly text: string;
  readonly tone: FeedbackTone;
}

export interface CalibrationSession {
  readonly phase: CalibrationPhase;
  readonly profile: CalibrationProfile | null;
  readonly run: CalibrationRun | null;
  /** The point being prompted while running. */
  readonly prompt: ContactKey | null;
  /** What the last tap meant, shown on screen (the same words are announced). */
  readonly feedback: FeedbackLine | null;
  readonly ring: RingController;
  readonly hand: Hand;
  readonly resumable: Resumability;
  /** The one state the start screen is in, so it shows exactly one description and one next action. */
  readonly startState: StartState;
  /** The one state the ring is in while a run is showing. */
  readonly runRingState: RunRingState;
  /** True after Pause, so the start screen takes focus. */
  readonly returnedToStart: boolean;
  readonly readAloud: boolean;
  readonly setReadAloud: (on: boolean) => void;
  readonly start: () => void;
  readonly resume: () => void;
  readonly repeatPoints: () => void;
  readonly repeatPrompt: () => void;
  readonly pause: () => void;
  readonly stop: () => void;
  /** Leaves a chosen-but-absent Bluetooth ring for the simulated one, so the page is never a dead end. */
  readonly switchToDemo: () => void;
}
