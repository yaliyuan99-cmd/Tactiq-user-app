/**
 * Nine commands on eight contact points.
 *
 * Source of truth: Table 3 of the AUSSEF paper, `host/tactiq/grammar.py`
 * (token names, tap / hold durations) and `docs/PROTOCOL.md` (haptic classes).
 * Seven commands are fixed. Only Shortcut 1 and Shortcut 2 can be changed.
 * Emergency shares the pinky fingertip with Shortcut 1 and is separated by
 * duration — a five-second hold — never by tap count. It can never be remapped.
 */
import { type ContactKey } from './contacts';

export const COMMAND_TOKENS = [
  'confirm',
  'back',
  'undo',
  'next',
  'read',
  'previous',
  'quick_action_1',
  'quick_action_2',
  'emergency',
] as const;
export type CommandToken = (typeof COMMAND_TOKENS)[number];

export type Interaction = 'tap' | 'hold_5s';
export type CommandKind = 'fixed' | 'shortcut' | 'emergency';

/** The four haptic classes the bench firmware defines (docs/PROTOCOL.md). */
export type HapticClass = 'armed' | 'confirm' | 'reject' | 'emergency';

export interface FeedbackDescription {
  /** What the ring's haptic actuator is specified to do (design intent). */
  readonly haptic: string;
  /** What this app shows when visual confirmation is on. */
  readonly visual: string;
  /** What the app announces (and what a screen reader would say). */
  readonly text: string;
}

export interface CommandDefinition {
  readonly token: CommandToken;
  readonly contact: ContactKey;
  readonly interaction: Interaction;
  readonly kind: CommandKind;
  /** Display name, e.g. "Dismiss / Back". */
  readonly label: string;
  /** One line: what it does. */
  readonly description: string;
  /** How the phone would carry it out (Table 3 "Platform route"). */
  readonly platformRoute: string;
  /** Whether the paper promises this route on every platform. */
  readonly guaranteed: boolean;
  readonly hapticClass: HapticClass;
  readonly feedback: FeedbackDescription;
}

const tapFeedback = (text: string): FeedbackDescription => ({
  haptic: 'One strong click (the "confirm" haptic class) when the tap is accepted.',
  visual: 'The contact point flashes once and the command name is shown.',
  text,
});

export const COMMANDS: readonly CommandDefinition[] = [
  {
    token: 'confirm',
    contact: 'index_tip',
    interaction: 'tap',
    kind: 'fixed',
    label: 'Confirm',
    description: 'Select the item your screen reader is focused on.',
    platformRoute: 'Screen-reader activate',
    guaranteed: true,
    hapticClass: 'confirm',
    feedback: tapFeedback('Confirm.'),
  },
  {
    token: 'back',
    contact: 'index_base',
    interaction: 'tap',
    kind: 'fixed',
    label: 'Dismiss / Back',
    description: 'Go back, or cancel what is open.',
    platformRoute: 'Screen-reader or system Back',
    guaranteed: true,
    hapticClass: 'confirm',
    feedback: tapFeedback('Back.'),
  },
  {
    token: 'undo',
    contact: 'middle_tip',
    interaction: 'tap',
    kind: 'fixed',
    label: 'Undo',
    description: 'Reverse the last command where the app allows it.',
    platformRoute: 'App-dependent; not guaranteed',
    guaranteed: false,
    hapticClass: 'confirm',
    feedback: tapFeedback('Undo.'),
  },
  {
    token: 'next',
    contact: 'middle_base',
    interaction: 'tap',
    kind: 'fixed',
    label: 'Next',
    description: 'Move screen-reader focus to the next item.',
    platformRoute: 'Screen-reader next item',
    guaranteed: true,
    hapticClass: 'confirm',
    feedback: tapFeedback('Next.'),
  },
  {
    token: 'read',
    contact: 'ring_tip',
    interaction: 'tap',
    kind: 'fixed',
    label: 'Read / Repeat',
    description: 'Read the focused item again.',
    platformRoute: 'Screen-reader read current',
    guaranteed: true,
    hapticClass: 'confirm',
    feedback: tapFeedback('Read again.'),
  },
  {
    token: 'previous',
    contact: 'ring_base',
    interaction: 'tap',
    kind: 'fixed',
    label: 'Previous',
    description: 'Move screen-reader focus to the previous item.',
    platformRoute: 'Screen-reader previous item',
    guaranteed: true,
    hapticClass: 'confirm',
    feedback: tapFeedback('Previous.'),
  },
  {
    token: 'quick_action_1',
    contact: 'pinky_tip',
    interaction: 'tap',
    kind: 'shortcut',
    label: 'Shortcut 1',
    description: 'A shortcut you choose. Brief tap only — a long hold on this point is Emergency.',
    platformRoute: 'Platform automation',
    guaranteed: false,
    hapticClass: 'confirm',
    feedback: tapFeedback('Shortcut one.'),
  },
  {
    token: 'quick_action_2',
    contact: 'pinky_base',
    interaction: 'tap',
    kind: 'shortcut',
    label: 'Shortcut 2',
    description: 'A second shortcut you choose.',
    platformRoute: 'Platform automation',
    guaranteed: false,
    hapticClass: 'confirm',
    feedback: tapFeedback('Shortcut two.'),
  },
  {
    token: 'emergency',
    contact: 'pinky_tip',
    interaction: 'hold_5s',
    kind: 'emergency',
    label: 'Emergency',
    description:
      'Hold the pinky fingertip for five full seconds to hand over to the phone’s own emergency pathway. Cannot be changed.',
    platformRoute: 'Platform SOS pathway; not guaranteed',
    guaranteed: false,
    hapticClass: 'emergency',
    feedback: {
      haptic:
        'A distinct arming pulse at two seconds, then a long 750 ms alert when the hold reaches five seconds. Releasing early cancels with no pulse.',
      visual: 'A progress ring fills over five seconds; the point turns solid orange when it completes.',
      text: 'Emergency armed at two seconds. Emergency hold complete at five seconds.',
    },
  },
];

export const SHORTCUT_TOKENS = ['quick_action_1', 'quick_action_2'] as const;
export type ShortcutToken = (typeof SHORTCUT_TOKENS)[number];

export function isShortcutToken(token: CommandToken): token is ShortcutToken {
  return (SHORTCUT_TOKENS as readonly string[]).includes(token);
}

export function isCommandToken(value: unknown): value is CommandToken {
  return typeof value === 'string' && (COMMAND_TOKENS as readonly string[]).includes(value);
}

const BY_TOKEN = new Map(COMMANDS.map((c) => [c.token, c] as const));

export function getCommand(token: CommandToken): CommandDefinition {
  const found = BY_TOKEN.get(token);
  if (!found) throw new Error(`Unknown command token: ${token}`);
  return found;
}

/** All commands that live on one contact (the pinky tip carries two). */
export function commandsForContact(contact: ContactKey): CommandDefinition[] {
  return COMMANDS.filter((c) => c.contact === contact);
}

/** The command a contact + interaction resolves to, or null (e.g. a hold on a fixed point). */
export function resolveCommand(contact: ContactKey, interaction: Interaction): CommandDefinition | null {
  return COMMANDS.find((c) => c.contact === contact && c.interaction === interaction) ?? null;
}

/* ---------------------------------------------------------------------------
 * Shortcut actions.
 *
 * Every entry is a mock: no phone can run these from a browser, and the paper
 * lists custom shortcuts as "Platform automation — not promised". The list
 * exists so users can see, preview and save a choice; the simulator announces
 * the choice as a simulated outcome.
 * ------------------------------------------------------------------------- */

export const SHORTCUT_ACTION_IDS = [
  'unassigned',
  'play_pause',
  'announce_time',
  'read_notifications',
  'open_assistant',
  'toggle_flashlight',
  'announce_phone_battery',
  'start_voice_memo',
] as const;
export type ShortcutActionId = (typeof SHORTCUT_ACTION_IDS)[number];

export interface ShortcutAction {
  readonly id: ShortcutActionId;
  readonly label: string;
  /** What the phone would do — always conditional; nothing here runs for real. */
  readonly description: string;
  /** What the simulator announces when the shortcut fires. */
  readonly simulatedOutcome: string;
}

export const SHORTCUT_ACTIONS: readonly ShortcutAction[] = [
  {
    id: 'unassigned',
    label: 'Nothing assigned',
    description: 'The tap is recognised but does nothing.',
    simulatedOutcome: 'Shortcut not assigned.',
  },
  {
    id: 'play_pause',
    label: 'Play or pause media',
    description: 'Would toggle whatever is playing.',
    simulatedOutcome: 'Media paused.',
  },
  {
    id: 'announce_time',
    label: 'Announce the time',
    description: 'Would have the screen reader speak the current time.',
    simulatedOutcome: 'It is a quarter past two.',
  },
  {
    id: 'read_notifications',
    label: 'Read recent notifications',
    description: 'Would read the notification shade from the top.',
    simulatedOutcome: 'Two notifications. Reading the first.',
  },
  {
    id: 'open_assistant',
    label: 'Open the voice assistant',
    description: 'Would open the phone’s assistant for a spoken request.',
    simulatedOutcome: 'Assistant listening.',
  },
  {
    id: 'toggle_flashlight',
    label: 'Toggle the flashlight',
    description: 'Would switch the phone’s torch on or off.',
    simulatedOutcome: 'Flashlight on.',
  },
  {
    id: 'announce_phone_battery',
    label: 'Announce phone battery',
    description: 'Would speak the phone’s battery level (the phone’s, not the ring’s).',
    simulatedOutcome: 'Phone battery level announced.',
  },
  {
    id: 'start_voice_memo',
    label: 'Start a voice memo',
    description: 'Would begin recording a voice memo.',
    simulatedOutcome: 'Recording started.',
  },
];

export function isShortcutActionId(value: unknown): value is ShortcutActionId {
  return typeof value === 'string' && (SHORTCUT_ACTION_IDS as readonly string[]).includes(value);
}

export function getShortcutAction(id: ShortcutActionId): ShortcutAction {
  return SHORTCUT_ACTIONS.find((a) => a.id === id) ?? SHORTCUT_ACTIONS[0]!;
}

export type ShortcutMapping = Readonly<Record<ShortcutToken, ShortcutActionId>>;

export const DEFAULT_SHORTCUT_MAPPING: ShortcutMapping = {
  quick_action_1: 'play_pause',
  quick_action_2: 'announce_time',
};

/** The command's display label, with the assigned shortcut where relevant. */
export function commandLabelWithShortcut(command: CommandDefinition, mapping: ShortcutMapping): string {
  if (!isShortcutToken(command.token)) return command.label;
  const action = getShortcutAction(mapping[command.token]);
  return action.id === 'unassigned' ? `${command.label} (nothing assigned)` : `${command.label}: ${action.label}`;
}
