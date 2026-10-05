/**
 * Fixed wording for the onboarding screens, in one place so the steps and
 * their tests say exactly the same thing. Planned ring behaviour is always
 * conditional ("would", "is designed to"); nothing here claims a measurement.
 */
import { CONTACT_KEYS } from '@/domain/contacts';
import { CALIBRATION_SAMPLES_PER_CONTACT } from '@/domain/timing';

export const PAGE_TITLE = 'Set up Tactiq';
export const PROGRESS_LABEL = 'Setup progress';

/* Skip setup */
export const SKIP_SETUP_LABEL = 'Skip setup';
export const SKIP_SETUP_TITLE = 'Skip setup?';
export const SKIP_SETUP_DESCRIPTION = 'You can finish it later from the dashboard.';
export const SKIP_SETUP_CANCEL = 'Keep setting up';

/* Step 1 — Welcome */
export const WELCOME_LEDE =
  'Tactiq is a concept for a smart ring that would let you control your phone’s screen reader with small, deliberate touches of your thumb.';
export const WELCOME_HOW_IT_WORKS: readonly string[] = [
  'Squeeze the ring on purpose. That would open a short command window, so ordinary hand movement would not trigger anything.',
  'Touch your thumb to one of eight points: the tip or the base of your index, middle, ring or pinky finger.',
  'Your phone would carry out that command through VoiceOver or TalkBack.',
  'A vibration from the ring would confirm it.',
];
export const WELCOME_HONESTY =
  'No finished ring exists yet. This app lets you learn and practise with a simulated ring, and every result is labelled Simulated.';

/* Step 2 — Accessibility preferences */
export const ACCESSIBILITY_LEDE = 'Set these now or any time in Settings. You do not need to tell us why.';
export const CONTRAST_DESCRIPTION = 'Darker text and stronger borders.';
export const REDUCE_MOTION_DESCRIPTION = 'Turns off animation in this app, even if your device allows it.';
export const AUDIO_DESCRIPTION =
  'Speaks results aloud with your browser’s voice. Your screen reader announces them either way.';
export const VISUAL_DESCRIPTION = 'Flashes the contact point and shows the command name on screen.';
export const HAPTIC_DESCRIPTION =
  'Vibrates this phone as a rough stand-in for the ring’s haptics, where the browser allows it.';

/* Step 3 — Which hand */
export const HAND_LEDE =
  'The ring is designed to sit on your index finger, with the thumb of the same hand tapping the points on your fingers. Hand drawings across the app mirror to match.';
export const HAND_QUESTION = 'Which hand will wear the ring?';

/* Step 4 — Demo Mode or a ring */
export const DEVICE_LEDE =
  'No finished ring exists yet, so Demo Mode is how you learn and practise for now. The Bluetooth option is for the bench prototype.';
export const DEVICE_QUESTION = 'How will you use Tactiq?';
export const DEMO_OPTION_LABEL = 'Demo Mode (recommended while no ring exists)';
export const DEMO_OPTION_DESCRIPTION = 'A simulated ring that works in any browser. Every result is labelled Simulated.';
export const HARDWARE_OPTION_LABEL = 'Bluetooth ring';
export const HARDWARE_OPTION_DESCRIPTION =
  'For the Tactiq bench prototype. Needs Chrome or Edge on a computer or an Android phone.';
export const UNSUPPORTED_TITLE = 'This browser cannot connect to a ring';
export const USE_DEMO_LABEL = 'Use Demo Mode instead';
export const CONNECT_LABEL = 'Connect a ring';
export const CONNECT_PERMISSION_NOTE = 'Your browser asks for Bluetooth permission only when you choose Connect a ring.';
export const CONNECT_OPTIONAL_NOTE = 'You can continue without connecting and connect later from the dashboard.';

/* Step 5 — Calibration */
export const CALIBRATION_TAPS_TOTAL = CALIBRATION_SAMPLES_PER_CONTACT * CONTACT_KEYS.length;
export const CALIBRATION_WHAT =
  'Calibration is designed to teach the ring how your own taps feel on each of the eight points.';
export const CALIBRATION_HOW = `It asks for ${CALIBRATION_SAMPLES_PER_CONTACT} taps on each point, ${CALIBRATION_TAPS_TOTAL} in all, and takes about a minute.`;
export const CALIBRATION_DEMO =
  'In Demo Mode, calibration practises the routine with the simulated ring. Nothing is measured, and every result is labelled Simulated.';
export const CALIBRATION_LATER = 'You can calibrate now or later from the dashboard.';
export const OPEN_CALIBRATION_LABEL = 'Open calibration now';
export const OPEN_CALIBRATION_NOTE = 'This leaves setup. You can resume it from the dashboard.';

/* Step 6 — Feedback */
export const FEEDBACK_LEDE =
  'The ring is designed to confirm what happened with a short vibration pattern. Every result is also announced and shown on screen, so nothing depends on vibration alone.';
/**
 * The four haptic classes, from the single domain definition, so onboarding,
 * the lessons and the Commands page cannot drift apart.
 */
export { HAPTIC_CLASS_LIST as HAPTIC_CLASSES, type HapticClassInfo as HapticClassDescription } from '@/domain/haptics';
export const HAPTIC_NOT_BUILT = 'None of these patterns has been built into a ring or felt yet.';
export const TRY_VIBRATION_LABEL = 'Try a vibration';
export const HEAR_ANNOUNCEMENT_LABEL = 'Hear an announcement';
export const SAMPLE_ANNOUNCEMENT = 'Next.';
export const CANNOT_VIBRATE_NOTE =
  'This browser or device does not allow vibration (for example, Safari on iPhone). Every result is still announced and shown on screen.';
export const CANNOT_SPEAK_NOTE = 'This browser cannot speak aloud. Your screen reader still reads every announcement.';
export const VIBRATION_REQUESTED = 'Asked this phone to vibrate once, as a stand-in for the confirm click.';
export const VIBRATION_REFUSED = 'The browser did not vibrate this time.';
export const VIBRATION_SWITCHED_OFF =
  'Haptic feedback is switched off, so nothing vibrated. You can switch it on in Accessibility preferences or Settings.';
export const ANNOUNCEMENT_SENT = 'Announced: “Next.”';

/* Step 7 — First lesson */
export const LESSON_DONE = 'Lesson complete. You practised opening the command window on purpose.';
export const LESSON_LEFT = 'You left the lesson. Start it again, or continue when you are ready.';
export const RESTART_LESSON_LABEL = 'Start the lesson again';

/* Step 8 — All set */
export const DONE_LEDE = 'Setup is finished. Here is what you chose. You can change any of it in Settings.';
