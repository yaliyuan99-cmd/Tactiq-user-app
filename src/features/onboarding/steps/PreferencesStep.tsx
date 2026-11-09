import { SegmentedRadioGroup, SwitchField, type SegmentedOption } from '@/components';
import type { TextSize } from '@/domain/models';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import {
  AUDIO_DESCRIPTION,
  CONTRAST_DESCRIPTION,
  MORE_IN_SETTINGS,
  PREFERENCES_LEDE,
  TEXT_SIZE_HINT,
} from '../onboardingCopy';
import {
  TEXT_SIZE_LABELS,
  choiceAnnouncement,
  commandWindowSeconds,
  longerTimeAnnouncement,
  switchAnnouncement,
} from '../onboardingFlow';
import { StepLede, StepSection } from './StepSection';

const TEXT_SIZE_OPTIONS: readonly SegmentedOption<TextSize>[] = [
  { value: 'default', label: TEXT_SIZE_LABELS.default },
  { value: 'large', label: TEXT_SIZE_LABELS.large },
  { value: 'larger', label: TEXT_SIZE_LABELS.larger },
];

/**
 * Step 2: the four settings worth asking about before the first command —
 * text size, contrast, speech and time. Every control saves and applies at
 * once, says what changed, and can be changed again in Settings.
 */
export function PreferencesStep() {
  const { preferences, update } = usePreferences();
  const { state } = useDevice();
  const { announce } = useFeedback();

  return (
    <>
      <StepLede>{PREFERENCES_LEDE}</StepLede>

      <StepSection title="Reading, speech and time" card>
        <div className="grid gap-1.5">
          <SegmentedRadioGroup<TextSize>
            legend="Text size"
            options={TEXT_SIZE_OPTIONS}
            value={preferences.textSize}
            onChange={(textSize) => {
              update({ textSize });
              announce(choiceAnnouncement('Text size', TEXT_SIZE_LABELS[textSize]));
            }}
          />
          <p className="text-sm text-muted-foreground">{TEXT_SIZE_HINT}</p>
        </div>
        <SwitchField
          containerClassName="border-t border-border pt-4"
          label="Increased contrast"
          description={CONTRAST_DESCRIPTION}
          checked={preferences.contrast === 'high'}
          onChange={(on) => {
            update({ contrast: on ? 'high' : 'default' });
            announce(switchAnnouncement('Increased contrast', on));
          }}
        />
        <SwitchField
          containerClassName="border-t border-border pt-4"
          label="Audio announcements"
          description={AUDIO_DESCRIPTION}
          checked={preferences.audioAnnouncements}
          onChange={(on) => {
            update({ audioAnnouncements: on });
            // Turning speech on confirms in the voice the user just chose.
            announce(switchAnnouncement('Audio announcements', on), { forceSpeech: on });
          }}
        />
        <SwitchField
          containerClassName="border-t border-border pt-4"
          label="Longer interaction time"
          description={`After a squeeze, the command window stays open for ${commandWindowSeconds(
            false,
          )} seconds. Switch this on to keep it open for ${commandWindowSeconds(true)} seconds in Demo Mode. A Bluetooth bench ring keeps its own ${commandWindowSeconds(false)}-second window.`}
          checked={preferences.longerInteractionTime}
          onChange={(longerInteractionTime) => {
            update({ longerInteractionTime });
            announce(longerTimeAnnouncement(longerInteractionTime, state.mode));
          }}
        />
      </StepSection>

      <p className="max-w-prose text-muted-foreground">{MORE_IN_SETTINGS}</p>
    </>
  );
}
