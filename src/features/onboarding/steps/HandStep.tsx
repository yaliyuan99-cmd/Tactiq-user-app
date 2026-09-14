import { HandMap, RadioGroupField, type RadioOption } from '@/components';
import type { Hand } from '@/domain/models';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { HAND_LEDE, HAND_QUESTION } from '../onboardingCopy';
import { HAND_LABELS, choiceAnnouncement } from '../onboardingFlow';
import { StepLede } from './StepSection';

const HAND_OPTIONS: readonly RadioOption<Hand>[] = [
  { value: 'left', label: HAND_LABELS.left, description: 'Ring on your left index finger. Your left thumb taps.' },
  { value: 'right', label: HAND_LABELS.right, description: 'Ring on your right index finger. Your right thumb taps.' },
];

export function HandStep() {
  const { preferences, update } = usePreferences();
  const { announce } = useFeedback();
  const { hand } = preferences;

  return (
    <>
      <StepLede>{HAND_LEDE}</StepLede>
      <div className="grid items-start gap-6 rounded-lg border border-border bg-card p-5 shadow-card sm:grid-cols-2 sm:p-6">
        <RadioGroupField<Hand>
          label={HAND_QUESTION}
          options={HAND_OPTIONS}
          value={hand}
          onChange={(next) => {
            update({ hand: next });
            announce(choiceAnnouncement('Hand', HAND_LABELS[next]));
          }}
        />
        <HandMap
          hand={hand}
          interactive={false}
          size="sm"
          caption={`Preview: ${HAND_LABELS[hand].toLowerCase()} hand, palm facing you.`}
        />
      </div>
    </>
  );
}
