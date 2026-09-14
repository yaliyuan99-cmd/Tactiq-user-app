import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { BrowserCheck } from './BrowserCheck';
import { WINDOW_TEXT } from './helpContent';
import { HelpSection, HelpSubsection } from './HelpSection';
import { STANDALONE_LINK } from './helpStyles';

const LIST = 'grid max-w-prose list-disc gap-2 pl-6 marker:text-muted-foreground';

export function AccessibilitySection() {
  return (
    <HelpSection
      id="accessibility"
      lede="Tactiq is designed to be used without sight, with a keyboard, a screen reader or a switch, and at any text size."
    >
      <HelpSubsection title="Keyboard">
        <ul className={LIST}>
          <li>
            <kbd>Tab</kbd> moves to the next control and <kbd>Shift</kbd> + <kbd>Tab</kbd> to the previous one. The first
            Tab on every page offers Skip to main content.
          </li>
          <li>
            <kbd>Enter</kbd> or <kbd>Space</kbd> presses a button, opens an answer on this page, or taps a contact point.
          </li>
          <li>
            Hold <kbd>Enter</kbd> or <kbd>Space</kbd> on a contact point to hold it. The time the key stays down is the
            length of the press, so holding it on the pinky fingertip for five seconds is the emergency hold.
          </li>
          <li>
            <kbd>Escape</kbd> lets go of a hold started with the emergency hold button; letting go before five seconds
            cancels the hold. Escape also closes dialogs.
          </li>
        </ul>
      </HelpSubsection>

      <HelpSubsection title="Screen readers">
        <div className="grid max-w-prose gap-2">
          <p>
            Tactiq is designed to work with VoiceOver, TalkBack, NVDA and JAWS. Results, command window changes and page
            changes are sent to your screen reader through live regions, so you hear them without losing your place. Dropped
            presses and emergency hold messages are announced straight away; everything else waits until your screen reader
            has finished speaking.
          </p>
          <p>
            Audio announcements are optional. Switch them on in Settings to have the browser speak the same messages aloud,
            which helps when no screen reader is running. With a screen reader on, you may prefer to leave them off so you do
            not hear each message twice.
          </p>
        </div>
      </HelpSubsection>

      <HelpSubsection title="Text, contrast and zoom">
        <ul className={LIST}>
          <li>Text size has three steps: Default, Large and Larger.</li>
          <li>Increased contrast darkens text and strengthens borders and focus outlines, in light and dark themes.</li>
          <li>
            Pages are designed to reflow into one column at 200% browser zoom and on screens as narrow as 320 pixels, without
            scrolling sideways.
          </li>
          <li>Colour is never the only signal: every state is also written in words.</li>
        </ul>
      </HelpSubsection>

      <HelpSubsection title="Motion and vibration">
        <ul className={LIST}>
          <li>
            Reduce motion removes animation and smooth scrolling. Tactiq also follows the reduced-motion setting on your
            device.
          </li>
          <li>
            Haptic feedback vibrates your phone as a stand-in for the ring’s haptics, where the browser allows it. Safari on
            iPhone and iPad cannot vibrate, so every vibration is also shown on screen and announced.
          </li>
        </ul>
        <div className="max-w-prose">
          <BrowserCheck topic="vibration" />
        </div>
      </HelpSubsection>

      <HelpSubsection title="Time limits">
        <p className="max-w-prose">
          The command window is a time limit of {WINDOW_TEXT.normal} after each squeeze. Longer interaction time doubles it
          to {WINDOW_TEXT.longer} with the simulated ring. The emergency hold always takes five seconds, because its length is
          what tells it apart from Shortcut 1.
        </p>
      </HelpSubsection>

      <p>
        <Link to={ROUTES.settings} className={STANDALONE_LINK}>
          Change accessibility and feedback settings
        </Link>
      </p>
    </HelpSection>
  );
}
