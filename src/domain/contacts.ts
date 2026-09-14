/**
 * The eight thumb-to-finger contact points.
 *
 * Source of truth: `host/tactiq/contacts.py` in the Tactiq research repo and
 * Table 3 of the AUSSEF paper. The paper says tip/base; the website API says
 * knuckle top/bottom — `apiKnuckle` carries that bridge so exports need no
 * translation. Order is anatomical (index → pinky, tip before base) and is
 * shared verbatim with the firmware's `CLASS_KEYS`.
 */

export const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const;
export type Finger = (typeof FINGERS)[number];

export const SEGMENTS = ['tip', 'base'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const CONTACT_KEYS = [
  'index_tip',
  'index_base',
  'middle_tip',
  'middle_base',
  'ring_tip',
  'ring_base',
  'pinky_tip',
  'pinky_base',
] as const;
export type ContactKey = (typeof CONTACT_KEYS)[number];

export interface ContactPoint {
  readonly key: ContactKey;
  readonly finger: Finger;
  readonly segment: Segment;
  /** Human label, e.g. "Index fingertip". */
  readonly label: string;
  /** Two-letter abbreviation used by the paper's Appendix D (IT, IB, …). */
  readonly abbreviation: string;
  /** Spoken prompt, as the research calibration tool says it. */
  readonly spoken: string;
  /** Website API vocabulary: tip = top, base = bottom. */
  readonly apiKnuckle: 'top' | 'bottom';
  /** Where to find it by touch — plain language for calibration and lessons. */
  readonly howToFind: string;
}

const FINGER_LABEL: Record<Finger, string> = {
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  pinky: 'Pinky',
};

const HOW_TO_FIND: Record<ContactKey, string> = {
  index_tip: 'The pad at the very end of your index finger, next to the ring.',
  index_base: 'The lowest section of your index finger, just above the palm.',
  middle_tip: 'The pad at the end of your middle finger, the longest finger.',
  middle_base: 'The lowest section of your middle finger, just above the palm.',
  ring_tip: 'The pad at the end of your ring finger.',
  ring_base: 'The lowest section of your ring finger, just above the palm.',
  pinky_tip: 'The pad at the end of your smallest finger, furthest from the thumb.',
  pinky_base: 'The lowest section of your smallest finger, just above the palm.',
};

export const CONTACT_POINTS: readonly ContactPoint[] = CONTACT_KEYS.map((key) => {
  const [finger, segment] = key.split('_') as [Finger, Segment];
  return {
    key,
    finger,
    segment,
    label: `${FINGER_LABEL[finger]} ${segment === 'tip' ? 'fingertip' : 'finger base'}`,
    abbreviation: `${FINGER_LABEL[finger][0]}${segment === 'tip' ? 'T' : 'B'}`,
    spoken: `${finger} ${segment}`,
    apiKnuckle: segment === 'tip' ? 'top' : 'bottom',
    howToFind: HOW_TO_FIND[key],
  };
});

const BY_KEY = new Map(CONTACT_POINTS.map((c) => [c.key, c] as const));

export function getContact(key: ContactKey): ContactPoint {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Unknown contact point: ${key}`);
  return found;
}

export function isContactKey(value: unknown): value is ContactKey {
  return typeof value === 'string' && (CONTACT_KEYS as readonly string[]).includes(value);
}

/** The two contacts on one finger — the pair the paper predicts is easiest to confuse. */
export function siblingContact(key: ContactKey): ContactKey {
  const c = getContact(key);
  return `${c.finger}_${c.segment === 'tip' ? 'base' : 'tip'}` as ContactKey;
}
