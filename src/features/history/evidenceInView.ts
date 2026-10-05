/**
 * One evidence tag and one sentence for the records currently in view, so the
 * lede, the banner, Summary and By command can never contradict the rows
 * underneath them. A bench ring's records are labelled Measured, and the page
 * must say Measured too.
 */
import type { ActivitySummary } from '@/domain/models';

export type EvidenceInView = ActivitySummary['evidence'];

/** Said after "Measured", because the only hardware is an unvalidated bench rig. */
export const BENCH_DETAIL = 'on an unvalidated bench prototype';

/** The sentence beside the tag: where these figures came from. */
export function evidenceSentence(evidence: EvidenceInView, allSamples = false): string {
  if (allSamples) return 'Every figure here comes from sample records added for Demo Mode, not from your own practice.';
  switch (evidence) {
    case 'measured':
      return 'Every figure here was recorded on a connected bench ring, which has not been validated.';
    case 'mixed':
      return 'These figures mix practice with the simulated ring and readings from a connected bench ring. Each record carries its own label.';
    default:
      return 'Every figure here comes from practice with the simulated ring in this app.';
  }
}
