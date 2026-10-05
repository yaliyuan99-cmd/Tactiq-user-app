import { SwitchField } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { SettingsDivider, SettingsSection, WRAPPING_SWITCH_ROW } from '../SettingsSection';
import { switchAnnouncement } from '../settingsOptions';
import { SpeechSample, VibrationSample } from './FeedbackTryouts';

export const AUDIO_DESCRIPTION =
  'Speaks results aloud using your browser’s voice. Your screen reader still announces them either way.';
export const VISUAL_DESCRIPTION = 'Flashes the contact point and shows the command name on screen.';
export const HAPTIC_DESCRIPTION = 'Vibrates this phone as a stand-in for the ring’s haptics, where the browser allows it.';

export function FeedbackSection() {
  const { preferences, update } = usePreferences();
  const { announce } = useFeedback();

  return (
    <SettingsSection
      id="feedback"
      intro="Every result is written on screen and sent to your screen reader. Sound and vibration are extras on top, so no feedback is ever vibration-only."
    >
      <div className="grid gap-3">
        <SwitchField
          containerClassName={WRAPPING_SWITCH_ROW}
          label="Audio announcements"
          description={AUDIO_DESCRIPTION}
          checked={preferences.audioAnnouncements}
          onChange={(audioAnnouncements) => {
            update({ audioAnnouncements });
            // Turning speech on confirms in the voice the user just chose.
            announce(switchAnnouncement('Audio announcements', audioAnnouncements), { forceSpeech: audioAnnouncements });
          }}
        />
        <SpeechSample enabled={preferences.audioAnnouncements} />
      </div>

      <SettingsDivider />

      <SwitchField
        containerClassName={WRAPPING_SWITCH_ROW}
        label="Visual confirmation"
        description={VISUAL_DESCRIPTION}
        checked={preferences.visualConfirmation}
        onChange={(visualConfirmation) => {
          update({ visualConfirmation });
          announce(switchAnnouncement('Visual confirmation', visualConfirmation));
        }}
      />

      <SettingsDivider />

      <div className="grid gap-3">
        <SwitchField
          containerClassName={WRAPPING_SWITCH_ROW}
          label="Haptic feedback"
          description={HAPTIC_DESCRIPTION}
          checked={preferences.hapticFeedback}
          onChange={(hapticFeedback) => {
            update({ hapticFeedback });
            announce(switchAnnouncement('Haptic feedback', hapticFeedback));
          }}
        />
        <VibrationSample enabled={preferences.hapticFeedback} />
        <p className="max-w-prose text-sm text-muted-foreground">
          The ring itself is designed to confirm each command with its own haptic pattern. That has not been built or felt
          yet, so this phone’s vibration is only a rough stand-in.
        </p>
      </div>
    </SettingsSection>
  );
}
