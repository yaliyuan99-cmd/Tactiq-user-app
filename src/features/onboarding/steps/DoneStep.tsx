import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { useTraining } from '@/services/ServicesProvider';
import { nextStepLinks } from '../nextSteps';
import { CHOICES_HEADING, DONE_LEDE, DONE_SETTINGS_LEAD, NEXT_HEADING } from '../onboardingCopy';
import { summariseChoices } from '../onboardingFlow';
import { StepLede, StepSection } from './StepSection';

/**
 * Step 4: setup is already recorded as finished when this step opens, so what
 * it says and what the app allows agree. Where to go next is read from real
 * training progress, never from a fixed lesson.
 */
export function DoneStep() {
  const { preferences } = usePreferences();
  const { state } = useDevice();
  const training = useTraining();
  const choices = summariseChoices({
    hand: preferences.hand,
    textSize: preferences.textSize,
    contrast: preferences.contrast,
    audioAnnouncements: preferences.audioAnnouncements,
    longerInteractionTime: preferences.longerInteractionTime,
    deviceMode: state.mode,
    deviceStatusLabel: describeDeviceState(state).label,
  });
  const links = nextStepLinks(training.summary());

  return (
    <>
      <StepLede>{DONE_LEDE}</StepLede>

      <StepSection title={CHOICES_HEADING} card>
        <dl className="grid gap-3">
          {choices.map((choice) => (
            <div
              key={choice.id}
              data-choice={choice.id}
              className="grid gap-0.5 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4"
            >
              <dt className="font-semibold">{choice.label}</dt>
              <dd>{choice.value}</dd>
            </div>
          ))}
        </dl>
        <p>
          {DONE_SETTINGS_LEAD}{' '}
          <Link to={ROUTES.settings} className="target-44 font-semibold text-primary-strong underline">
            Settings
          </Link>
          .
        </p>
      </StepSection>

      <StepSection title={NEXT_HEADING}>
        <ul className="divide-y divide-border border-y border-border">
          {links.map((link) => (
            <li key={link.id} className="py-3">
              <Link to={link.to} className="target-44 inline-flex items-center gap-2 font-semibold text-primary-strong underline">
                {link.label}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <p className="mt-1 text-muted-foreground">{link.description}</p>
            </li>
          ))}
        </ul>
      </StepSection>
    </>
  );
}
