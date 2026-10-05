/**
 * The evidence for the figures on the Training card, taken from the lesson
 * records themselves: with a bench ring connected those records are Measured,
 * and the card must not call them Simulated while Recent activity below it says
 * Measured.
 */
import type { ActivitySummary } from '@/domain/models';

export interface TrainingEvidenceNote {
  readonly kind: 'simulated' | 'measured';
  readonly text: string;
}

export function trainingEvidenceNote(evidence: ActivitySummary['evidence']): TrainingEvidenceNote {
  if (evidence === 'measured') {
    return {
      kind: 'measured',
      text: 'Attempts and accuracy come from taps on a connected bench ring, which has not been validated.',
    };
  }
  if (evidence === 'mixed') {
    return {
      kind: 'simulated',
      text: 'Attempts and accuracy mix practice with the simulated ring and taps on a connected bench ring.',
    };
  }
  return { kind: 'simulated', text: 'Attempts and accuracy come from lessons in this app, not from a ring.' };
}
