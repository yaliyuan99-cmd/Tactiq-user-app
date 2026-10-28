/**
 * Fixed wording for the four setup steps, in one place so the steps and their
 * tests say exactly the same thing. Planned ring behaviour is always
 * conditional ("would", "is designed to"); nothing here claims a measurement.
 */
import { getCommand } from '@/domain/commands';
import { getContact } from '@/domain/contacts';

export const PAGE_TITLE = 'Set up Tactiq';
export const PROGRESS_LABEL = 'Setup progress';

/** Said on the first step and never repeated: setup is short, and nothing here is a finished device. */
export const SETUP_HONESTY =
  'No finished ring exists yet. Setup takes four short steps, you can skip any of them, and everything you do in this app runs on a simulated ring and is labelled Simulated.';

/* Step 1 — Which hand */
export const HAND_LEDE =
  'The ring is designed to sit on your index finger, with the thumb of the same hand tapping eight points: the tip and the base of your index, middle, ring and pinky finger. Hand drawings across the app mirror to match your choice.';
export const HAND_QUESTION = 'Which hand will wear the ring?';

/* Step 2 — A few preferences */
export const PREFERENCES_LEDE =
  'Four settings that change how Tactiq reads and responds. Each one applies as soon as you choose it, and you can change them any time in Settings. You do not need to tell us why.';
export const CONTRAST_DESCRIPTION = 'Darker text and stronger borders.';
export const AUDIO_DESCRIPTION =
  'Speaks results aloud with your browser’s voice. Your screen reader announces them either way.';
export const TEXT_SIZE_HINT = 'Larger text applies across the app straight away.';
export const MORE_IN_SETTINGS =
  'Settings has the rest: reduced motion, on-screen confirmation of each command, and vibration on this phone as a stand-in for the ring’s haptics.';

/* Step 3 — Your first command */
/** The one command setup asks for: Confirm, on the index fingertip beside the ring. */
export const FIRST_COMMAND_TOKEN = 'confirm' as const;
export const FIRST_COMMAND_CONTACT = 'index_tip' as const;
export const FIRST_COMMAND_LABEL = getCommand(FIRST_COMMAND_TOKEN).label;
export const FIRST_COMMAND_PLACE = getContact(FIRST_COMMAND_CONTACT).label.toLowerCase();

export const FIRST_COMMAND_LEDE = `Run one command, so setup ends with something you have done rather than something you have read. You are asked for ${FIRST_COMMAND_LABEL}, on the ${FIRST_COMMAND_PLACE} next to the ring.`;
export const FIRST_COMMAND_DEMO_NOTE =
  'In Demo Mode a Squeeze button stands in for the ring, and each point is a button you can tap or reach with the Tab key.';
export const FIRST_COMMAND_HARDWARE_NOTE =
  'With a Bluetooth bench ring, squeeze the ring itself, then touch your thumb to the point.';
export const FIRST_COMMAND_STEPS: readonly string[] = [
  'Squeeze on purpose. That opens the command window for a few seconds, so ordinary hand movement never fires a command.',
  `Tap the ${FIRST_COMMAND_PLACE}. That point carries ${FIRST_COMMAND_LABEL}.`,
];
export const FIRST_COMMAND_SKIPPABLE = 'You can skip this step and practise later in the simulator or in training.';
export const FIRST_COMMAND_DONE_TITLE = 'You have run your first command';
export const FIRST_COMMAND_DONE = `Nothing was sent to a phone: Tactiq simulated ${FIRST_COMMAND_LABEL} and measured nothing. Training and the simulator work the same way, and you can run it here as often as you like.`;
export const FIRST_COMMAND_OFFLINE =
  'You chose a Bluetooth bench ring and it is not connected, so no taps can arrive here. Skip this step, then connect the ring or switch to Demo Mode from the dashboard.';
export const LAST_ATTEMPT_LABEL = 'Last attempt';
export const FIRST_COMMAND_NO_ATTEMPT = 'None yet. Squeeze, then tap the point marked Target.';

/* Step 4 — You are ready */
export const DONE_LEDE =
  'Setup is finished and your choices are saved. The dashboard is open to you now — the button below is only a way there.';
export const DONE_SETTINGS_LEAD = 'You can change any of these choices in';
export const CHOICES_HEADING = 'Your choices';
export const NEXT_HEADING = 'What to do next';
