/**
 * Everything calibration says, as pure functions: prompts, the feedback after
 * each tap, what an announcement carries when it is spoken, and the results
 * summary. British/Australian spelling, sentence case, plain words.
 */
import { resolveCommand } from '@/domain/commands';
import { CONTACT_KEYS, getContact, type ContactKey } from '@/domain/contacts';
import type { CalibrationProfile, CalibrationSample } from '@/domain/models';
import { TAP_MAX_MS } from '@/domain/timing';
import {
  MAX_MISSES_PER_POINT,
  acceptedTotal,
  remainingPoints,
  requiredPerPoint,
  requiredTotal,
  sampleNumber,
} from './calibrationFlow';

export const SQUEEZE_FIRST_MESSAGE = 'Squeeze first.';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** "three" for 3; digits above ten. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Index fingertip" → "index fingertip", for use inside a sentence. */
export function pointPhrase(contact: ContactKey): string {
  return getContact(contact).label.toLowerCase();
}

/** "A", "A and B", "A, B and C". */
export function joinWithAnd(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The visible prompt: "Tap your Index fingertip". */
export function promptHeading(contact: ContactKey): string {
  return `Tap your ${getContact(contact).label}`;
}

/** The spoken prompt: "Tap your index fingertip." */
export function promptSentence(contact: ContactKey): string {
  return `Tap your ${pointPhrase(contact)}.`;
}

/** What "Repeat this point" says: the prompt, how to find the point and which tap is next. */
export function repeatPromptMessage(profile: CalibrationProfile, contact: ContactKey): string {
  return `${promptSentence(contact)} ${getContact(contact).howToFind} Sample ${sampleNumber(profile, contact)} of ${requiredPerPoint(profile)}.`;
}

/** Context only: the command the point would carry in everyday use. */
export function pointCommandSentence(contact: ContactKey): string {
  const command = resolveCommand(contact, 'tap');
  const base = command ? `In everyday use this point would carry ${command.label}.` : '';
  return contact === 'pinky_tip' ? `${base} Keep the tap brief: a five-second hold here is Emergency.` : base;
}

/** "half a second" for the 500 ms tap limit. */
export function tapLimitWords(ms: number = TAP_MAX_MS): string {
  return ms === 500 ? 'half a second' : `${ms} milliseconds`;
}

export type FeedbackTone = 'accepted' | 'retry' | 'info';

export interface SampleFeedbackInput {
  readonly prompt: ContactKey;
  readonly detectedContact: ContactKey | null;
  readonly accepted: boolean;
  readonly reason?: CalibrationSample['reason'];
  /** Accepted taps on the prompted point, including this one. */
  readonly acceptedCount: number;
  readonly required: number;
  /** Misses on the prompted point in this run, including this one. */
  readonly misses: number;
  readonly emergencyCancelled: boolean;
}

export interface SampleFeedback {
  readonly message: string;
  readonly tone: FeedbackTone;
}

export const EMERGENCY_CANCELLED_NOTE = 'Emergency hold cancelled. Nothing was sent.';

/** The words after one calibration tap. */
export function sampleFeedback(input: SampleFeedbackInput): SampleFeedback {
  const target = pointPhrase(input.prompt);
  const prefix = input.emergencyCancelled ? `${EMERGENCY_CANCELLED_NOTE} ` : '';
  if (input.accepted) {
    const message =
      input.acceptedCount >= input.required
        ? `${getContact(input.prompt).label} done.`
        : `Got it. ${input.acceptedCount} of ${input.required} on the ${target}.`;
    return { message: `${prefix}${message}`, tone: 'accepted' };
  }

  let what: string;
  let instruction: string;
  if (input.reason === 'wrong_contact' && input.detectedContact) {
    what = `That was the ${pointPhrase(input.detectedContact)}.`;
    instruction = `Tap the ${target}.`;
  } else if (input.reason === 'too_long') {
    what = 'That press was too long.';
    instruction = `Tap briefly, under ${tapLimitWords()}.`;
  } else {
    what = 'No point was detected.';
    instruction = `Tap the ${target}.`;
  }
  if (input.misses >= MAX_MISSES_PER_POINT) {
    instruction = `After ${numberWord(MAX_MISSES_PER_POINT)} tries, we will move on and mark the ${target} to repeat.`;
  }
  return { message: `${prefix}${what} ${instruction}`, tone: 'retry' };
}

export function resultsHeading(complete: boolean): string {
  return complete ? 'Calibration complete' : 'Calibration incomplete';
}

/** One sentence under the results heading. */
export function resultsSentence(profile: CalibrationProfile): string {
  const remaining = remainingPoints(profile);
  const required = requiredPerPoint(profile);
  if (remaining.length === 0) {
    return `All ${numberWord(CONTACT_KEYS.length)} points have ${numberWord(required)} accepted ${required === 1 ? 'tap' : 'taps'}.`;
  }
  const count = remaining.length;
  const lead = count === 1 ? 'One point needs' : `${capitalise(numberWord(count))} points need`;
  return `${lead} repeating: ${joinWithAnd(remaining.map((c) => getContact(c).label))}.`;
}

/** Shown under the progress once a tap on the prompted point has not counted. */
export function missesSentence(misses: number): string {
  const tries = misses === 1 ? 'One try has' : `${capitalise(numberWord(misses))} tries have`;
  return `${tries} not counted on this point. After ${numberWord(MAX_MISSES_PER_POINT)}, we move on and mark it to repeat.`;
}

/** What the evidence label on a calibration means, in one or two sentences. */
export function evidenceSentence(evidence: CalibrationProfile['evidence']): string {
  return evidence === 'simulated'
    ? 'The simulated ring always detects the point you choose, so these results show that you practised the routine. They say nothing about how well a ring would sense your touch.'
    : 'These taps were detected by the connected bench prototype. They are a record of this session, not a validated accuracy result.';
}

/** "9 of 24 taps". */
export function progressText(profile: CalibrationProfile | null): string {
  return `${acceptedTotal(profile)} of ${requiredTotal(profile)} taps`;
}

export interface Announcement {
  /** For the live region. */
  readonly text: string;
  /** For speech: `text` plus anything a screen reader gets from the focused heading instead. */
  readonly spoken: string;
}

/**
 * After a recorded tap that does not end the run. When the prompt moves on,
 * the new heading takes focus, so only speech repeats the next prompt.
 */
export function afterSampleAnnouncement(feedback: SampleFeedback, target: ContactKey, next: ContactKey): Announcement {
  return {
    text: feedback.message,
    spoken: next === target ? feedback.message : `${feedback.message} ${promptSentence(next)}`,
  };
}

/** When a run ends. The results heading takes focus, so only speech says it. */
export function resultsAnnouncement(profile: CalibrationProfile, lastFeedback: string | null): Announcement {
  const heading = resultsHeading(profile.status === 'complete');
  const sentence = resultsSentence(profile);
  const lead = lastFeedback ? `${lastFeedback} ` : '';
  return { text: `${lead}${sentence}`, spoken: `${lead}${heading}. ${sentence}` };
}
