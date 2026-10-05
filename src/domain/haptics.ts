/**
 * The four haptic classes the bench firmware defines, described once here so
 * onboarding, the lessons and the Commands page all say the same thing.
 *
 * Every description is design intent: no pattern has been built into a ring or
 * felt yet. None of them carries a duration, because the research material
 * fixes no duration for any class — the phone vibration patterns in
 * `@/services/feedback` are this app's stand-ins, not firmware values.
 */

export const HAPTIC_CLASSES = ['armed', 'confirm', 'reject', 'emergency'] as const;
export type HapticClass = (typeof HAPTIC_CLASSES)[number];

export interface HapticClassInfo {
  readonly id: HapticClass;
  /** Short name for a list, e.g. "Window open". */
  readonly name: string;
  /** The pattern as a phrase that fits mid-sentence, e.g. "one short tick". */
  readonly phrase: string;
  /** When the ring is designed to give it, e.g. "a squeeze opens the command window". */
  readonly when: string;
  /** The full sentence: phrase + when. */
  readonly description: string;
}

const CLASSES: readonly Omit<HapticClassInfo, 'description'>[] = [
  { id: 'armed', name: 'Window open', phrase: 'one short tick', when: 'a squeeze opens the command window' },
  { id: 'confirm', name: 'Confirm', phrase: 'one firm click', when: 'a command is accepted' },
  { id: 'reject', name: 'Reject', phrase: 'a double click', when: 'a press is not recognised' },
  { id: 'emergency', name: 'Emergency', phrase: 'a long alert', when: 'a five-second emergency hold completes' },
];

function sentence(info: Omit<HapticClassInfo, 'description'>): string {
  return `${info.phrase.charAt(0).toUpperCase()}${info.phrase.slice(1)} when ${info.when}.`;
}

/** In firmware order: window open, confirm, reject, emergency. */
export const HAPTIC_CLASS_LIST: readonly HapticClassInfo[] = CLASSES.map((info) => ({
  ...info,
  description: sentence(info),
}));

export const HAPTIC_CLASS_INFO: Readonly<Record<HapticClass, HapticClassInfo>> = Object.fromEntries(
  HAPTIC_CLASS_LIST.map((info) => [info.id, info]),
) as Readonly<Record<HapticClass, HapticClassInfo>>;

/** "one short tick" — for use inside a sentence of your own. */
export function hapticPhrase(id: HapticClass): string {
  return HAPTIC_CLASS_INFO[id].phrase;
}

/** "One short tick when a squeeze opens the command window." */
export function hapticSentence(id: HapticClass): string {
  return HAPTIC_CLASS_INFO[id].description;
}
