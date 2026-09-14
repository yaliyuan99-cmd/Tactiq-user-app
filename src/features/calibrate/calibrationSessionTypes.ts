/** The shape of the calibration page's controller, shared by its views. */
import type { ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, Hand } from '@/domain/models';
import type { RingController } from '@/features/practice';
import type { CalibrationRun, Resumability } from './calibrationFlow';
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
}
