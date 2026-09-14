import { Callout, EvidenceLabel, HandMap } from '@/components';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { WELCOME_HONESTY, WELCOME_HOW_IT_WORKS, WELCOME_LEDE } from '../onboardingCopy';
import { HAND_LABELS, STEP_COUNT } from '../onboardingFlow';
import { StepLede, StepSection } from './StepSection';

export function WelcomeStep() {
  const { preferences } = usePreferences();
  const handName = HAND_LABELS[preferences.hand].toLowerCase();

  return (
    <>
      <StepLede>{WELCOME_LEDE}</StepLede>

      <Callout kind="info">
        <div className="grid gap-1.5">
          <EvidenceLabel kind="simulated" />
          <p>{WELCOME_HONESTY}</p>
        </div>
      </Callout>

      <StepSection title="How it would work">
        <ol className="grid max-w-prose list-decimal gap-3 pl-6 marker:font-semibold marker:text-primary-strong">
          {WELCOME_HOW_IT_WORKS.map((line) => (
            <li key={line} className="pl-1">
              {line}
            </li>
          ))}
        </ol>
        <HandMap
          hand={preferences.hand}
          interactive={false}
          size="sm"
          className="mt-2"
          caption={`The eight contact points on a ${handName} hand. The ring sits on the index finger.`}
        />
      </StepSection>

      <p className="max-w-prose">
        Setup has {STEP_COUNT} short steps. Most are optional, and you can leave and come back to where you stopped.
      </p>
    </>
  );
}
