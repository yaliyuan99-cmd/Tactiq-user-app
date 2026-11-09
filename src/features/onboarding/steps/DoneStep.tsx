import { Link } from 'react-router';
import { ArrowRight, Check } from 'lucide-react';
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
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="settle-in grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-7 w-7" />
        </span>
        <StepLede>{DONE_LEDE}</StepLede>
      </div>

      <StepSection title={NEXT_HEADING}>
        <ul role="list" className="grid gap-3">
          {links.map((link) => (
            <li key={link.id} className="lift relative rounded-lg border-[1.5px] border-foreground bg-card p-4 shadow-card">
              <Link to={link.to} className="stretched-link target-44 inline-flex items-center gap-2 font-semibold text-primary-strong underline">
                {link.label}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <p className="mt-1 text-muted-foreground text-pretty">{link.description}</p>
            </li>
          ))}
        </ul>
      </StepSection>

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
    </>
  );
}
