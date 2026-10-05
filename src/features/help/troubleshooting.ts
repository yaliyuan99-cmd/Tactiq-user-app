/**
 * Troubleshooting answers. Each entry is one native details/summary item on
 * the Help page; its id is also an element id, so helpRoute('<entry id>')
 * opens that answer directly.
 */
import { ROUTES, lessonRoute } from '@/app/routes';
import { DEVICE_NAME } from '@/domain/protocol';
import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS, TAP_MAX_MS, formatMs } from '@/domain/timing';

export interface HelpLinkTarget {
  readonly label: string;
  readonly to: string;
}

/** A live check of what this browser offers, shown inside the answer. */
export type BrowserCheckKind = 'bluetooth' | 'speech';

export interface TroubleshootingEntry {
  readonly id: string;
  /** The summary text: the problem as the user would put it. */
  readonly question: string;
  /** One or two plain sentences before the list. */
  readonly intro: string;
  /** What to try, most likely fix first. */
  readonly steps: readonly string[];
  /** True when the steps must be followed in order. */
  readonly ordered: boolean;
  readonly note?: string;
  readonly check?: BrowserCheckKind;
  readonly links: readonly HelpLinkTarget[];
}

const CONNECT_LINK: HelpLinkTarget = { label: 'Go to Connect', to: ROUTES.connect };

export const TROUBLESHOOTING_ENTRIES: readonly TroubleshootingEntry[] = [
  {
    id: 'bluetooth-unavailable',
    question: 'My browser says Bluetooth is unavailable',
    intro: 'Connecting a ring uses Web Bluetooth, which only some browsers offer.',
    steps: [
      'Use Google Chrome or Microsoft Edge on a desktop computer or an Android phone.',
      'Safari, Firefox and every browser on iPhone and iPad do not offer Web Bluetooth, so they cannot connect a ring.',
      'Open Tactiq from its secure address, starting with https://. Browsers block Bluetooth on pages that are not secure.',
      'Check that Bluetooth is switched on for the computer or phone itself.',
    ],
    ordered: false,
    note: 'Demo Mode works in every browser, so you can keep practising with the simulated ring.',
    check: 'bluetooth',
    links: [CONNECT_LINK],
  },
  {
    id: 'no-ring-in-bluetooth-window',
    question: 'The Bluetooth window shows no ring',
    intro: `The window only lists nearby devices that are switched on and visible to Bluetooth. A bench ring shows up as “${DEVICE_NAME}”.`,
    steps: [
      'Check the ring is switched on and has power.',
      `Check it is running the Tactiq bench firmware, which is what makes it visible as “${DEVICE_NAME}”.`,
      'Bring the ring close to this computer or phone.',
      'If the ring is connected to another phone, computer or browser tab, disconnect it there first. It may not appear while it is connected elsewhere.',
      'Close the Bluetooth window, wait a few seconds, then choose Connect a ring again.',
    ],
    ordered: false,
    links: [CONNECT_LINK],
  },
  {
    id: 'bluetooth-permission-denied',
    question: 'I denied Bluetooth permission',
    intro:
      'If you closed the Bluetooth window without choosing a ring, nothing was denied: choose Connect a ring again. If the browser blocked Bluetooth for this site, allow it again:',
    steps: [
      'Select the icon to the left of the web address in the address bar, then choose Site settings (in Edge, Permissions for this site).',
      'Find Bluetooth devices and set it to Ask or Allow.',
      'On an Android phone, also open the phone’s settings for your browser app and allow Nearby devices.',
      'Reload Tactiq, go to Connect and choose Connect a ring.',
    ],
    ordered: true,
    links: [CONNECT_LINK],
  },
  {
    id: 'ring-disconnected',
    question: 'The ring disconnected',
    intro: 'Tactiq tries to reconnect once on its own after the link drops. If that does not work:',
    steps: [
      'Move the ring closer to this computer or phone, and check it still has power.',
      'On the Connect page, choose Reconnect.',
      'If reconnecting keeps failing, choose Forget this ring, switch the ring off and on, then choose Connect a ring and pick it again.',
      'Keep this tab open while you use the ring. Closing or reloading the tab ends the Bluetooth connection, and so does switching to Demo Mode.',
    ],
    ordered: false,
    links: [CONNECT_LINK],
  },
  {
    id: 'commands-not-recognised',
    question: 'Commands are not recognised',
    intro: 'Tactiq drops a press it is unsure about rather than guess, so nothing happens on the phone.',
    steps: [
      'Squeeze first. Taps only count while the command window is open.',
      `Tap within the window: ${formatMs(COMMAND_WINDOW_MS)}, or ${formatMs(COMMAND_WINDOW_LONG_MS)} in Demo Mode with Longer interaction time switched on.`,
      `Keep taps brief: no longer than half a second (${formatMs(TAP_MAX_MS)}). A longer press is dropped unless it is the full emergency hold.`,
      'If the wrong command keeps coming up, calibrate again. Calibration is designed to help a ring tell your contact points apart; in Demo Mode it is practice.',
      'If aiming at points on the hand drawing is hard, switch to List view.',
    ],
    ordered: false,
    links: [
      { label: 'Calibrate again', to: ROUTES.calibrate },
      { label: 'Practise in the Simulator', to: ROUTES.simulator },
      { label: 'Longer interaction time in Settings', to: ROUTES.settings },
    ],
  },
  {
    id: 'emergency-hold-incomplete',
    question: 'The emergency hold does not complete',
    intro: 'The hold only completes after five unbroken seconds on the pinky fingertip. Anything shorter cancels it.',
    steps: [
      'Squeeze first, then hold the pinky fingertip for the full five seconds.',
      'Letting go before five seconds cancels the hold. So does moving your finger or pointer off the point, or moving keyboard focus away.',
      'With a keyboard, keep Enter or Space held down on the pinky fingertip until the hold completes.',
      'If holding a key or finger down is hard, use the Start five-second hold on pinky fingertip button, then wait. Press it again, or press Escape, only if you want to cancel.',
    ],
    ordered: false,
    note: 'The hold is a simulation. Completing it never sends an emergency message or contacts anyone.',
    links: [
      { label: 'Practise in lesson 5', to: lessonRoute('emergency_hold') },
      { label: 'Practise in the Simulator', to: ROUTES.simulator },
    ],
  },
  {
    id: 'cannot-hear-announcements',
    question: 'I cannot hear announcements',
    intro: 'Announcements go to your screen reader. The app can also speak them aloud with the browser’s own voice.',
    steps: [
      'Check your screen reader is running: VoiceOver, TalkBack, NVDA or JAWS.',
      'Without a screen reader, switch on Audio announcements in Settings.',
      'Check the device volume is up and the device is not muted or on silent.',
      'Some browsers only allow speech after you have pressed something on the page. Press any button, then try again.',
    ],
    ordered: false,
    check: 'speech',
    links: [{ label: 'Audio announcements in Settings', to: ROUTES.settings }],
  },
  {
    id: 'progress-disappeared',
    question: 'My progress disappeared',
    intro:
      'Lesson progress, calibration, settings and activity are stored in this browser on this device only. They do not follow you to another browser or device.',
    steps: [
      'Private or incognito windows delete everything when the last one closes.',
      'Clearing browsing data, cookies or site data for this site deletes it too, and so can some clean-up tools.',
      'Check you are using the same browser, on the same device, as before.',
    ],
    ordered: false,
    note: 'To keep a copy of your activity, download it from History.',
    links: [{ label: 'Download activity in History', to: ROUTES.history }],
  },
];

export const TROUBLESHOOTING_ENTRY_IDS: readonly string[] = TROUBLESHOOTING_ENTRIES.map((entry) => entry.id);
