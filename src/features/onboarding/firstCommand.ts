/**
 * What one ring result means for the single command setup asks for. Pure: no
 * React, no services.
 *
 * The words replace the ring's own announcement rather than following it, so
 * they are returned with the ring's feedback kind (see
 * `FeedbackContextValue.feedback`). `announcement` is null when the ring has
 * already said everything — a dropped press, or a cancelled hold — so nothing
 * is announced twice.
 */
import type { ShortcutMapping } from '@/domain/commands';
import type { ContactKey } from '@/domain/contacts';
import { getContact } from '@/domain/contacts';
import { EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { describeRingResult, spokenLabelForToken, type RingResult } from '@/features/practice';
import type { FeedbackKind } from '@/services/feedback/types';
import { FIRST_COMMAND_LABEL, FIRST_COMMAND_PLACE, FIRST_COMMAND_TOKEN } from './onboardingCopy';

export type FirstCommandVerdict = 'correct' | 'other_command' | 'not_recognised';

export interface FirstCommandOutcome {
  readonly verdict: FirstCommandVerdict;
  /** Shown on screen, with the display labels. */
  readonly message: string;
  /** Announced under `feedbackKind`, or null when the ring's own words already say it all. */
  readonly announcement: string | null;
  readonly feedbackKind: FeedbackKind;
  /** Where the attempt landed when it was not the point asked for, for the hand drawing. */
  readonly detectedContact: ContactKey | null;
}

const TRY_AGAIN = `Try again: squeeze, then tap the ${FIRST_COMMAND_PLACE}.`;

function place(contact: ContactKey): string {
  return getContact(contact).label.toLowerCase();
}

/** Judges one result against the single command setup asks for. */
export function firstCommandOutcome(result: RingResult, mapping: ShortcutMapping): FirstCommandOutcome {
  const description = describeRingResult(result, mapping);

  if (result.kind === 'command' && result.token === FIRST_COMMAND_TOKEN) {
    return {
      verdict: 'correct',
      message: `${FIRST_COMMAND_LABEL} on the ${FIRST_COMMAND_PLACE}. That is the command.`,
      announcement: `${FIRST_COMMAND_LABEL} on the ${FIRST_COMMAND_PLACE}. That is the command.`,
      feedbackKind: description.feedbackKind,
      detectedContact: null,
    };
  }

  if (result.kind === 'command') {
    return {
      verdict: 'other_command',
      message: `That was ${description.shortLabel}, on the ${place(result.contact)}. ${TRY_AGAIN}`,
      announcement: `That was ${spokenLabelForToken(result.token, mapping)}, on the ${place(result.contact)}. ${TRY_AGAIN}`,
      feedbackKind: description.feedbackKind,
      detectedContact: result.contact,
    };
  }

  if (result.kind === 'emergency') {
    const words = `Emergency hold complete. ${EMERGENCY_SIMULATION_NOTICE} ${TRY_AGAIN}`;
    return {
      verdict: 'other_command',
      message: words,
      announcement: words,
      feedbackKind: description.feedbackKind,
      detectedContact: null,
    };
  }

  return {
    verdict: 'not_recognised',
    message: `${description.visibleMessage} ${TRY_AGAIN}`,
    announcement: null,
    feedbackKind: description.feedbackKind,
    detectedContact: null,
  };
}
