/**
 * The phone in the homepage's try-it stage: what each command would do to a
 * screen-reader focus, as a pure function. Everything here is invented example
 * content for a simulation, and the stage labels it Simulated.
 */
import { getCommand, type CommandToken } from '@/domain/commands';

export interface PhoneItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

export const PHONE_ITEMS: readonly PhoneItem[] = [
  { id: 'bus', title: 'Bus 333', detail: 'Arrives in 2 minutes at stand C.' },
  { id: 'message', title: 'Message from Sam', detail: 'Running late. See you at the station.' },
  { id: 'maps', title: 'Maps', detail: 'Turn left in 50 metres.' },
  { id: 'music', title: 'Music', detail: 'Tap Shortcut 1 to play or pause.' },
];

export interface PhoneState {
  readonly focus: number;
  readonly open: number | null;
  readonly playing: boolean;
}

export const INITIAL_PHONE: PhoneState = { focus: 0, open: null, playing: false };

export interface PhoneResult {
  readonly state: PhoneState;
  /** What the screen reader would say. */
  readonly spoken: string;
}

const item = (index: number): PhoneItem => PHONE_ITEMS[index] as PhoneItem;

/** `previous` is the state before the last command, for Undo. */
export function applyCommand(state: PhoneState, token: CommandToken, previous: PhoneState | null): PhoneResult {
  switch (token) {
    case 'next': {
      if (state.open !== null) return { state, spoken: 'Go back first to move through the list.' };
      if (state.focus === PHONE_ITEMS.length - 1) return { state, spoken: `End of list. ${item(state.focus).title}.` };
      const focus = state.focus + 1;
      return { state: { ...state, focus }, spoken: item(focus).title };
    }
    case 'previous': {
      if (state.open !== null) return { state, spoken: 'Go back first to move through the list.' };
      if (state.focus === 0) return { state, spoken: `Top of list. ${item(0).title}.` };
      const focus = state.focus - 1;
      return { state: { ...state, focus }, spoken: item(focus).title };
    }
    case 'read': {
      const current = item(state.open ?? state.focus);
      return { state, spoken: state.open === null ? current.title : current.detail };
    }
    case 'confirm':
      if (state.open !== null) return { state, spoken: item(state.open).detail };
      return { state: { ...state, open: state.focus }, spoken: `Opened. ${item(state.focus).detail}` };
    case 'back':
      if (state.open === null) return { state, spoken: 'Nothing to close.' };
      return { state: { ...state, open: null }, spoken: `Back. ${item(state.focus).title}.` };
    case 'undo':
      if (!previous) return { state, spoken: 'Nothing to undo.' };
      return { state: previous, spoken: 'Undone.' };
    case 'quick_action_1': {
      const playing = !state.playing;
      return { state: { ...state, playing }, spoken: playing ? 'Music playing.' : 'Music paused.' };
    }
    case 'quick_action_2':
      return {
        state,
        spoken: `The time is ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
      };
    case 'emergency':
      return { state, spoken: 'Simulation only. No emergency message was sent.' };
    default:
      return { state, spoken: getCommand(token).spokenLabel };
  }
}
