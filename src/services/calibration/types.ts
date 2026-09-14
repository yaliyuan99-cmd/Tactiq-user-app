import type { ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, CalibrationSummary, Hand } from '@/domain/models';

export interface CalibrationSampleInput {
  readonly contact: ContactKey;
  readonly detectedContact: ContactKey | null;
  readonly durationMs: number;
  readonly at?: string;
}

export interface CalibrationSampleResult {
  readonly accepted: boolean;
  readonly reason?: 'wrong_contact' | 'too_long' | 'no_contact';
  readonly profile: CalibrationProfile;
}

export interface CalibrationService {
  get(): CalibrationProfile | null;
  summary(): CalibrationSummary;
  /** Begins a new profile (replacing any in-progress one). */
  start(options: { hand: Hand; samplesPerContact?: number; deviceId?: string | null; evidence?: 'simulated' | 'measured' }): CalibrationProfile;
  recordSample(input: CalibrationSampleInput): CalibrationSampleResult;
  /** Marks the profile complete or incomplete depending on coverage. */
  complete(): CalibrationProfile;
  /** Leaves the profile as 'incomplete' so it can be resumed or redone. */
  pause(): CalibrationProfile | null;
  /** Removes the stored profile entirely. */
  reset(): void;
  subscribe(listener: () => void): () => void;
}
