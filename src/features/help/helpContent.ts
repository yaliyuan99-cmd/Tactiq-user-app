/**
 * Structured content for the Help page that is derived from the domain, so
 * the page can never disagree with the command map or the timing constants.
 */
import { ROUTES } from '@/app/routes';
import { COMMANDS, type CommandKind, type CommandToken, type Interaction } from '@/domain/commands';
import { getContact } from '@/domain/contacts';
import {
  COMMAND_WINDOW_LONG_MS,
  COMMAND_WINDOW_MS,
  EMERGENCY_HOLD_MS,
  TAP_MAX_MS,
  TIMING_FACTS,
  formatMs,
  type TimingFact,
} from '@/domain/timing';
import type { HelpLinkTarget } from './troubleshooting';

/* ------------------------------------------------------------------ */
/* Getting started                                                     */
/* ------------------------------------------------------------------ */

export interface GettingStartedStep {
  readonly id: 'squeeze' | 'tap' | 'detect' | 'act' | 'confirm';
  readonly title: string;
  readonly text: string;
}

export const GETTING_STARTED_STEPS: readonly GettingStartedStep[] = [
  {
    id: 'squeeze',
    title: 'Squeeze',
    text: `Squeeze the ring on purpose. This opens a short command window (${formatMs(COMMAND_WINDOW_MS)}), so ordinary hand movement is designed never to trigger a command.`,
  },
  {
    id: 'tap',
    title: 'Tap',
    text: 'Touch one of the eight contact points briefly with your thumb: the tip or base of your index, middle, ring or pinky finger.',
  },
  {
    id: 'detect',
    title: 'Detect',
    text: 'The ring would identify which point your thumb touched and how long you held it.',
  },
  {
    id: 'act',
    title: 'Act',
    text: 'The phone would carry out the command mapped to that point through VoiceOver or TalkBack.',
  },
  {
    id: 'confirm',
    title: 'Confirm',
    text: 'The ring would give a haptic pattern to confirm. In this app you get an on-screen message, an announcement and, where the browser allows, a vibration.',
  },
];

export interface NextStepLink extends HelpLinkTarget {
  readonly description: string;
}

export const NEXT_STEP_LINKS: readonly NextStepLink[] = [
  { label: 'Connect', to: ROUTES.connect, description: 'Use Demo Mode, or connect a bench ring over Bluetooth.' },
  { label: 'Calibrate', to: ROUTES.calibrate, description: 'Guided taps on each of the eight contact points.' },
  { label: 'Train', to: ROUTES.train, description: 'Five short lessons, one group of commands at a time.' },
  { label: 'Simulator', to: ROUTES.simulator, description: 'Free practice with the simulated ring.' },
];

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

export function touchText(interaction: Interaction): string {
  return interaction === 'tap' ? 'Brief tap' : `Hold for ${formatMs(EMERGENCY_HOLD_MS)}`;
}

export function kindText(kind: CommandKind): string {
  switch (kind) {
    case 'fixed':
      return 'Fixed';
    case 'shortcut':
      return 'Customisable';
    case 'emergency':
      return 'Fixed, never remappable';
  }
}

export interface CommandSummaryRow {
  readonly token: CommandToken;
  readonly contact: string;
  readonly touch: string;
  readonly command: string;
  readonly kind: string;
}

/** The nine interactions, in command-map order. */
export const COMMAND_SUMMARY_ROWS: readonly CommandSummaryRow[] = COMMANDS.map((command) => ({
  token: command.token,
  contact: getContact(command.contact).label,
  touch: touchText(command.interaction),
  command: command.label,
  kind: kindText(command.kind),
}));

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

export interface TimingRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly source: string;
  readonly status: string;
}

function statusText(status: TimingFact['status']): string {
  return status === 'placeholder' ? 'Placeholder' : 'Design value';
}

/** TIMING_FACTS with their sources, plus the app's longer command window straight after the firmware one. */
export function timingRows(): TimingRow[] {
  const rows: TimingRow[] = [];
  for (const fact of TIMING_FACTS) {
    rows.push({
      id: fact.id,
      label: fact.label,
      value: formatMs(fact.valueMs),
      source: fact.source,
      status: statusText(fact.status),
    });
    if (fact.id === 'command_window') {
      rows.push({
        id: 'command_window_long',
        label: 'Command window with Longer interaction time',
        value: formatMs(COMMAND_WINDOW_LONG_MS),
        source: 'This app’s Longer interaction time setting, not the firmware',
        status: 'App setting',
      });
    }
  }
  return rows;
}

/** "3 s" and "6 s", for prose. */
export const WINDOW_TEXT = { normal: formatMs(COMMAND_WINDOW_MS), longer: formatMs(COMMAND_WINDOW_LONG_MS) } as const;
export const TAP_MAX_TEXT = formatMs(TAP_MAX_MS);
export const EMERGENCY_HOLD_TEXT = formatMs(EMERGENCY_HOLD_MS);
