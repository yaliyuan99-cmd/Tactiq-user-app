import { HandMap, RadioGroupField } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { SettingsSection } from '../SettingsSection';
import { HAND_LABELS, HAND_OPTIONS, choiceAnnouncement, handPreviewCaption } from '../settingsOptions';

export function HandSection() {
  const { preferences, update } = usePreferences();
  const { announce } = useFeedback();
  const { hand } = preferences;

  return (
    <SettingsSection
      id="hand"
      intro="Choose the hand you wear the ring on. Hand maps across the app mirror to match."
    >
      <div className="grid items-start gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RadioGroupField
          label="Hand you wear the ring on"
          options={HAND_OPTIONS}
          value={hand}
          onChange={(next) => {
            update({ hand: next });
            announce(choiceAnnouncement('Hand', HAND_LABELS[next]));
          }}
        />
        <HandMap hand={hand} interactive={false} size="sm" caption={handPreviewCaption(hand)} />
      </div>
    </SettingsSection>
  );
}
