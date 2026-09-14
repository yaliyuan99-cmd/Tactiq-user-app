/**
 * The five training lessons. Steps are resolved against the command map so
 * a lesson can never claim a contact carries a command it does not.
 */
import { type ContactKey } from './contacts';
import { type CommandToken, resolveCommand } from './commands';
import { EMERGENCY_HOLD_MS } from './timing';

export const LESSON_IDS = [
  'squeeze_to_activate',
  'confirm_and_back',
  'next_previous_read',
  'undo_and_shortcuts',
  'emergency_hold',
] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export type LessonStep =
  | { readonly kind: 'squeeze'; readonly instruction: string }
  | { readonly kind: 'tap'; readonly contact: ContactKey; readonly token: CommandToken; readonly instruction: string }
  | {
      readonly kind: 'hold';
      readonly contact: ContactKey;
      readonly token: 'emergency';
      readonly holdMs: number;
      /** 'cancel': start the hold and let go before five seconds. 'complete': hold the full five seconds. */
      readonly expect: 'cancel' | 'complete';
      readonly instruction: string;
    };

export interface Lesson {
  readonly id: LessonId;
  readonly number: number;
  readonly title: string;
  readonly summary: string;
  readonly explanation: readonly string[];
  readonly steps: readonly LessonStep[];
  /** Tokens this lesson teaches — used for progress and the dashboard. */
  readonly teaches: readonly CommandToken[];
}

function tap(contact: ContactKey, instruction?: string): LessonStep {
  const command = resolveCommand(contact, 'tap');
  if (!command) throw new Error(`No tap command on ${contact}`);
  return {
    kind: 'tap',
    contact,
    token: command.token,
    instruction: instruction ?? `Squeeze, then tap the ${contactPhrase(contact)} for ${command.label}.`,
  };
}

function contactPhrase(contact: ContactKey): string {
  const [finger, segment] = contact.split('_');
  return `${finger} ${segment === 'tip' ? 'fingertip' : 'finger base'}`;
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'squeeze_to_activate',
    number: 1,
    title: 'Squeeze to activate',
    summary: 'Open the command window on purpose, so ordinary hand movement never fires a command.',
    explanation: [
      'The ring stays asleep until you squeeze its body. A short, deliberate squeeze opens a command window for about three seconds.',
      'In the design, the ring gives one sharp tick when the window opens. If you do nothing, it closes again quietly.',
      'This lesson only practises the squeeze. Nothing happens on the phone yet.',
    ],
    steps: [
      { kind: 'squeeze', instruction: 'Squeeze the ring to open the command window.' },
      { kind: 'squeeze', instruction: 'Squeeze again. Notice the window closes on its own after a few seconds.' },
      { kind: 'squeeze', instruction: 'One more squeeze, then let the window close without tapping.' },
    ],
    teaches: [],
  },
  {
    id: 'confirm_and_back',
    number: 2,
    title: 'Confirm and Back',
    summary: 'The two commands you will use most: select something, or step out of it.',
    explanation: [
      'Confirm lives on the index fingertip, right beside the ring. Back lives at the base of the same finger.',
      'Both are brief taps. Tap, release, done.',
      'The two points share one finger, which makes them easy to find by feel and easy to tell apart by position.',
    ],
    steps: [
      tap('index_tip'),
      tap('index_base'),
      tap('index_tip'),
      tap('index_base'),
      tap('index_tip', 'Once more: squeeze, then Confirm on the index fingertip.'),
    ],
    teaches: ['confirm', 'back'],
  },
  {
    id: 'next_previous_read',
    number: 3,
    title: 'Next, Previous and Read',
    summary: 'Move through a list without a swipe, and hear an item again.',
    explanation: [
      'Next is the base of the middle finger. Previous is the base of the ring finger. Read / Repeat is the ring fingertip.',
      'These three replace the swipes screen-reader users repeat hundreds of times a day.',
      'Bases are for moving. The ring fingertip re-reads what is focused.',
    ],
    steps: [
      tap('middle_base'),
      tap('middle_base'),
      tap('ring_tip'),
      tap('ring_base'),
      tap('ring_tip'),
      tap('middle_base'),
    ],
    teaches: ['next', 'previous', 'read'],
  },
  {
    id: 'undo_and_shortcuts',
    number: 4,
    title: 'Undo and personal shortcuts',
    summary: 'Reverse a slip, and try the two points you can assign yourself.',
    explanation: [
      'Undo is the middle fingertip. Where the app allows it, Undo reverses the last command.',
      'Shortcut 1 is a brief tap on the pinky fingertip. Shortcut 2 is the base of the pinky. You choose what they do on the Commands page.',
      'Keep the pinky fingertip tap brief: a long hold on that same point is Emergency, which the next lesson covers.',
    ],
    steps: [tap('middle_tip'), tap('pinky_tip'), tap('pinky_base'), tap('middle_tip'), tap('pinky_base')],
    teaches: ['undo', 'quick_action_1', 'quick_action_2'],
  },
  {
    id: 'emergency_hold',
    number: 5,
    title: 'Five-second emergency hold',
    summary: 'Learn the one command that is separated by time, and how to cancel it.',
    explanation: [
      'Emergency is a five-second hold on the pinky fingertip. A brief tap there is Shortcut 1; only a sustained hold is Emergency.',
      'In the design, the ring pulses once at two seconds so you know the hold is being counted, then gives a long alert at five seconds.',
      'Letting go before five seconds cancels it with no alert. This lesson practises both cancelling and completing. It is a simulation: no emergency message is ever sent from this app.',
    ],
    steps: [
      {
        kind: 'hold',
        contact: 'pinky_tip',
        token: 'emergency',
        holdMs: EMERGENCY_HOLD_MS,
        expect: 'cancel',
        instruction: 'Squeeze, start holding the pinky fingertip, then let go before five seconds to cancel.',
      },
      {
        kind: 'hold',
        contact: 'pinky_tip',
        token: 'emergency',
        holdMs: EMERGENCY_HOLD_MS,
        expect: 'complete',
        instruction: 'Squeeze, then hold the pinky fingertip for the full five seconds until the hold completes.',
      },
    ],
    teaches: ['emergency'],
  },
];

export function getLesson(id: LessonId): Lesson {
  const found = LESSONS.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown lesson: ${id}`);
  return found;
}

export function isLessonId(value: unknown): value is LessonId {
  return typeof value === 'string' && (LESSON_IDS as readonly string[]).includes(value);
}

export function nextLessonId(id: LessonId): LessonId | null {
  const i = LESSON_IDS.indexOf(id);
  return i >= 0 && i < LESSON_IDS.length - 1 ? LESSON_IDS[i + 1]! : null;
}
