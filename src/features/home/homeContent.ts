/**
 * Every word on the public homepage, in one file, with the numbers taken from
 * `@/domain` so the page can never contradict the app.
 *
 * Rules this copy keeps: no ring has been built, so anything the hardware
 * would do is written as design intent ("would", "is designed to"); nothing
 * claims a measurement, a user, a price or a store listing; and the only
 * figures quoted are the design values in `@/domain/timing` and the
 * pre-registered targets in `@/domain/evidence`.
 */
import { Footprints, List, VolumeX, type LucideIcon } from 'lucide-react';
import { DESIGN_TARGETS, type DesignTarget } from '@/domain/evidence';
import { CONTACT_KEYS } from '@/domain/contacts';
import { COMMAND_WINDOW_MS, EMERGENCY_HOLD_MS, formatMs } from '@/domain/timing';

export const HERO = {
  eyebrow: 'A student research prototype from Sydney',
  headline: 'Can you control a phone with the hand you already know?',
  /** The part of the headline gone over with highlighter. The headline reads the same without it. */
  headlineMark: 'the hand you already know?',
  status: 'Status: no ring built. The app simulates it.',
  question: 'The question this project is testing:',
  lede:
    'Squeeze a ring worn on your index finger and a short command window opens. Touch your thumb to one of eight points on your own fingers, and that point is designed to drive VoiceOver or TalkBack: next, previous, read again, confirm, back.',
  honest:
    'No ring has been built. This app is the part that exists: it simulates the ring so the design can be learnt, practised and criticised before any hardware is made.',
} as const;

export interface HeroFact {
  readonly value: string;
  readonly label: string;
}

export const HERO_FACTS: readonly HeroFact[] = [
  { value: String(CONTACT_KEYS.length), label: 'contact points' },
  { value: formatMs(COMMAND_WINDOW_MS), label: 'command window' },
  { value: formatMs(EMERGENCY_HOLD_MS), label: 'emergency hold' },
];

export interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly Icon: LucideIcon;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'one-hand',
    title: 'One hand is already taken',
    text: 'A long cane or a guide-dog harness occupies a hand, and the phone is in a pocket. The ring is designed to be worked by the thumb of the hand that is already holding something.',
    Icon: Footprints,
  },
  {
    id: 'loud-place',
    title: 'Voice control fails in a loud place',
    text: 'On a platform or in a busy café, speaking to a phone is unreliable, and it says out loud what you are doing. A tap on your own finger is silent and private.',
    Icon: VolumeX,
  },
  {
    id: 'screen-reader',
    title: 'Moving through items, over and over',
    text: 'Next, previous and read again are the most repeated actions of a screen-reader day. They are designed to become three points your thumb can find without looking at anything.',
    Icon: List,
  },
];

export interface Step {
  readonly id: 'squeeze' | 'tap' | 'detect' | 'act' | 'confirm';
  readonly title: string;
  readonly text: string;
}

export const STEPS: readonly Step[] = [
  {
    id: 'squeeze',
    title: 'Squeeze',
    text: `Squeeze the ring on purpose. That opens a command window of ${formatMs(
      COMMAND_WINDOW_MS,
    )}, so ordinary hand movement is designed never to start a command.`,
  },
  {
    id: 'tap',
    title: 'Tap',
    text: 'Inside the window, touch one of eight points with your thumb: the tip or the base of your index, middle, ring or pinky finger.',
  },
  {
    id: 'detect',
    title: 'Detect',
    text: 'The ring would work out which point you touched and how long you held it. A press that is neither a tap nor a full hold is dropped rather than guessed.',
  },
  {
    id: 'act',
    title: 'Act',
    text: 'The phone would carry out the command mapped to that point, through VoiceOver on iPhone or TalkBack on Android.',
  },
  {
    id: 'confirm',
    title: 'Confirm',
    text: 'The ring would answer with a short haptic pattern. In this app you get an on-screen message, a screen-reader announcement and, where the browser allows it, a vibration.',
  },
];

/** The two pre-registered targets the five steps are judged against. */
export const HEADLINE_TARGET_IDS = ['false_activations', 'per_contact_accuracy'] as const;

export const HEADLINE_TARGETS: readonly DesignTarget[] = HEADLINE_TARGET_IDS.map((id) => {
  const target = DESIGN_TARGETS.find((candidate) => candidate.id === id);
  if (!target) throw new Error(`Unknown design target: ${id}`);
  return target;
});

export interface AppCapability {
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

export const APP_CAPABILITIES: readonly AppCapability[] = [
  {
    id: 'calibrate',
    title: 'Guided calibration',
    text: 'Three taps on each of the eight points, announced one at a time, so you learn where they are on your own hand.',
  },
  {
    id: 'train',
    title: 'Five short lessons',
    text: 'One group of commands at a time, from the squeeze itself to the emergency hold, with the result of every attempt read out.',
  },
  {
    id: 'practise',
    title: 'Free practice',
    text: 'A simulated ring you can squeeze and tap as long as you like, including presses it deliberately drops.',
  },
  {
    id: 'shortcuts',
    title: 'Your own two shortcuts',
    text: 'Seven commands are fixed. Two are yours to assign, and the emergency hold can never be remapped.',
  },
  {
    id: 'history',
    title: 'Your activity, labelled',
    text: 'Every record says where it came from — Simulated, or Measured from a bench prototype — and you can download or delete all of it.',
  },
];

export interface StatusRow {
  readonly id: string;
  readonly label: string;
  readonly exists: boolean;
  readonly detail: string;
}

export const PROJECT_STATUS: readonly StatusRow[] = [
  {
    id: 'app',
    label: 'This web app',
    exists: true,
    detail: 'Setup, calibration, lessons, practice, command mapping and activity history, all driven by a simulated ring.',
  },
  {
    id: 'firmware',
    label: 'Bench prototype firmware',
    exists: true,
    detail:
      'An unvalidated bench build that speaks over Bluetooth, which this app can connect to. It has no battery gauge, so no ring battery level is ever shown.',
  },
  {
    id: 'ring',
    label: 'A wearable ring',
    exists: false,
    detail: 'Nothing has been fabricated. Size, fit, weight, range and battery life are all unknown.',
  },
  {
    id: 'results',
    label: 'Validated performance',
    exists: false,
    detail: 'No accuracy, false-activation or comfort result has been measured, and no participant data exists.',
  },
  {
    id: 'phone',
    label: 'Phone integration',
    exists: false,
    detail:
      'The route through VoiceOver and TalkBack is designed, not built. On iPhone the intended route is for the ring to appear as a Bluetooth keyboard, which would carry the fixed commands only.',
  },
];

export interface Question {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export const QUESTIONS: readonly Question[] = [
  {
    id: 'buy',
    question: 'Can I buy one?',
    answer:
      'No. Nothing is for sale, there is no store listing and no ring exists. Tactiq is a student research project, and this app is the part of it you can use today.',
  },
  {
    id: 'today',
    question: 'What actually works right now?',
    answer:
      'The whole app, with a simulated ring: setup, guided calibration, five lessons, free practice, your two shortcuts and your own activity history. If an unvalidated bench prototype is connected over Bluetooth, the app reads from that instead and labels those records Measured.',
  },
  {
    id: 'screen-readers',
    question: 'Does it work with VoiceOver and TalkBack?',
    answer:
      'The app itself is built to be used with a screen reader, a keyboard or a switch. Driving the phone through VoiceOver or TalkBack is design intent: it needs hardware that does not exist yet.',
  },
  {
    id: 'emergency',
    question: 'What does the Emergency command do?',
    answer:
      'In this app, nothing is sent to anyone: a five-second hold on the pinky fingertip completes a simulation and says so in words. On a phone it is designed to hand over to the platform’s own emergency pathway, and that handover is not guaranteed either. In an emergency, contact your local emergency number directly.',
  },
  {
    id: 'numbers',
    question: 'Are any of the numbers on this page results?',
    answer:
      'No. The durations are design values from the research grammar and the bench firmware. The accuracy and false-activation figures are thresholds fixed before any testing, so future results can be judged against them. Nothing has been tested.',
  },
];

export const PRIVACY_POINTS: readonly string[] = [
  'No account is needed to try it. A guest profile opens in this browser and nothing about it leaves the device.',
  'Settings, calibration, lesson progress, shortcuts and activity are stored in this browser. You can download all of it, or delete all of it, from inside the app.',
  'No analytics, no advertising and no tracking. The type is served from this site, so no font request goes to a third party.',
  'If you choose to sign up with an email address, the account service handles that address. Everything else still stays in your browser.',
];

export const ACCESSIBILITY_POINTS: readonly string[] = [
  'Every control is reachable with Tab, has a visible focus outline, and is at least 44 by 44 pixels. A skip link comes first on the page.',
  'Results, command-window changes and page changes are announced through live regions, and colour is never the only signal.',
  'Pages reflow to one column at 320 pixels wide and at 200% zoom, without scrolling sideways.',
  'Nothing depends on a gesture or a vibration. Reduced motion is respected, and every vibration is also shown and announced.',
];

export const FOOTER_NOTE =
  'Tactiq is a student research project. No ring has been built, nothing here is for sale, and every figure the app shows carries a label saying where it came from.';
