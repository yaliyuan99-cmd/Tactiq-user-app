import { RadioGroupField, SwitchField, type RadioOption } from '@/components';
import type { TextSize, UserPreferences } from '@/domain/models';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import {
  ACCESSIBILITY_LEDE,
  AUDIO_DESCRIPTION,
  CONTRAST_DESCRIPTION,
  HAPTIC_DESCRIPTION,
  REDUCE_MOTION_DESCRIPTION,
  VISUAL_DESCRIPTION,
} from '../onboardingCopy';
import {
  TEXT_SIZE_LABELS,
  choiceAnnouncement,
  commandWindowSeconds,
  longerTimeAnnouncement,
  switchAnnouncement,
} from '../onboardingFlow';
import { StepLede, StepSection } from './StepSection';

const TEXT_SIZE_OPTIONS: readonly RadioOption<TextSize>[] = [
  { value: 'default', label: TEXT_SIZE_LABELS.default },
  { value: 'large', label: TEXT_SIZE_LABELS.large },
  { value: 'larger', label: TEXT_SIZE_LABELS.larger },
];

type SwitchPreference = 'reducedMotion' | 'audioAnnouncements' | 'visualConfirmation' | 'hapticFeedback';

/** Every control saves and applies at once, and says what changed. */
export function AccessibilityStep() {
  const { preferences, update, prefersReducedMotion } = usePreferences();
  const { announce } = useFeedback();

  const toggle = (key: SwitchPreference, label: string) => (on: boolean) => {
    update({ [key]: on } as Pick<UserPreferences, SwitchPreference>);
    // Turning speech on confirms in the voice the user just chose.
    announce(switchAnnouncement(label, on), { forceSpeech: key === 'audioAnnouncements' && on });
  };

  return (
    <>
      <StepLede>{ACCESSIBILITY_LEDE}</StepLede>

      <StepSection title="Text and display" card>
        <RadioGroupField<TextSize>
          label="Text size"
          hint="Larger text applies across the app straight away."
          options={TEXT_SIZE_OPTIONS}
          value={preferences.textSize}
          onChange={(textSize) => {
            update({ textSize });
            announce(choiceAnnouncement('Text size', TEXT_SIZE_LABELS[textSize]));
          }}
        />
        <SwitchField
          label="Increased contrast"
          description={CONTRAST_DESCRIPTION}
          checked={preferences.contrast === 'high'}
          onChange={(on) => {
            update({ contrast: on ? 'high' : 'default' });
            announce(switchAnnouncement('Increased contrast', on));
          }}
        />
        <SwitchField
          label="Reduce motion"
          description={REDUCE_MOTION_DESCRIPTION}
          checked={preferences.reducedMotion}
          onChange={toggle('reducedMotion', 'Reduce motion')}
        />
        {!preferences.reducedMotion && prefersReducedMotion && (
          <p className="text-sm text-muted-foreground">Your device already asks for reduced motion, so animation stays off.</p>
        )}
      </StepSection>

      <StepSection title="Feedback" card>
        <SwitchField
          label="Audio announcements"
          description={AUDIO_DESCRIPTION}
          checked={preferences.audioAnnouncements}
          onChange={toggle('audioAnnouncements', 'Audio announcements')}
        />
        <SwitchField
          label="Visual confirmation"
          description={VISUAL_DESCRIPTION}
          checked={preferences.visualConfirmation}
          onChange={toggle('visualConfirmation', 'Visual confirmation')}
        />
        <SwitchField
          label="Haptic feedback"
          description={HAPTIC_DESCRIPTION}
          checked={preferences.hapticFeedback}
          onChange={toggle('hapticFeedback', 'Haptic feedback')}
        />
      </StepSection>

      <StepSection title="Time" card>
        <SwitchField
          label="Longer interaction time"
          description={`After a squeeze, the command window stays open for ${commandWindowSeconds(
            false,
          )} seconds. Switch this on to keep it open for ${commandWindowSeconds(true)} seconds in Demo Mode. A Bluetooth bench ring keeps its own ${commandWindowSeconds(false)}-second window.`}
          checked={preferences.longerInteractionTime}
          onChange={(longerInteractionTime) => {
            update({ longerInteractionTime });
            announce(longerTimeAnnouncement(longerInteractionTime));
          }}
        />
      </StepSection>
    </>
  );
}
