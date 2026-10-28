import { Callout, EvidenceLabel, HandMap, RadioGroupField, type RadioOption } from '@/components';
import type { Hand } from '@/domain/models';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { HAND_LEDE, HAND_QUESTION, SETUP_HONESTY } from '../onboardingCopy';
import { HAND_LABELS, choiceAnnouncement } from '../onboardingFlow';
import { StepLede } from './StepSection';

const HAND_OPTIONS: readonly RadioOption<Hand>[] = [
  { value: 'left', label: HAND_LABELS.left, description: 'Ring on your left index finger. Your left thumb taps.' },
  { value: 'right', label: HAND_LABELS.right, description: 'Ring on your right index finger. Your right thumb taps.' },
];

/** Step 1: the one choice that changes every hand drawing in the app, plus the honesty note for the whole flow. */
export function HandStep() {
  const { preferences, update } = usePreferences();
  const { announce } = useFeedback();
  const { hand } = preferences;

  return (
    <>
      <StepLede>{HAND_LEDE}</StepLede>

      <Callout kind="info">
        <div className="grid gap-1.5">
          <EvidenceLabel kind="simulated" />
          <p>{SETUP_HONESTY}</p>
        </div>
      </Callout>

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
          caption={`Preview: ${HAND_LABELS[hand].toLowerCase()} hand, palm facing you. The ring sits on the index finger.`}
        />
      </div>
    </>
  );
}
