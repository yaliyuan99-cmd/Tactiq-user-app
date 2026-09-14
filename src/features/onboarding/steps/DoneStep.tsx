import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ROUTES, lessonRoute } from '@/app/routes';
import { getLesson } from '@/domain/lessons';
import { CALIBRATION_SAMPLES_PER_CONTACT } from '@/domain/timing';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { DONE_LEDE } from '../onboardingCopy';
import { summariseChoices } from '../onboardingFlow';
import { StepLede, StepSection } from './StepSection';

const NEXT_LESSON = getLesson('confirm_and_back');

interface NextLink {
  readonly to: string;
  readonly label: string;
  readonly description: string;
}

const NEXT_LINKS: readonly NextLink[] = [
  {
    to: lessonRoute(NEXT_LESSON.id),
    label: 'Continue training',
    description: `Lesson ${NEXT_LESSON.number}: ${NEXT_LESSON.title}. ${NEXT_LESSON.summary}`,
  },
  {
    to: ROUTES.calibrate,
    label: 'Calibrate',
    description: `Practise the calibration routine: ${CALIBRATION_SAMPLES_PER_CONTACT} taps on each of the eight points.`,
  },
  {
    to: ROUTES.simulator,
    label: 'Open the simulator',
    description: 'Try all nine commands freely on the simulated ring.',
  },
];

export interface DoneStepProps {
  /** Marks setup finished before a link below navigates, so the dashboard pages open instead of returning here. */
  readonly onLeave: () => void;
}

export function DoneStep({ onLeave }: DoneStepProps) {
  const { preferences } = usePreferences();
  const { state } = useDevice();
  const choices = summariseChoices({
    hand: preferences.hand,
    textSize: preferences.textSize,
    audioAnnouncements: preferences.audioAnnouncements,
    longerInteractionTime: preferences.longerInteractionTime,
    deviceMode: state.mode,
    deviceStatusLabel: describeDeviceState(state).label,
  });

  return (
    <>
      <StepLede>{DONE_LEDE}</StepLede>

      <StepSection title="Your choices" card>
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
      </StepSection>

      <StepSection title="What to do next">
        <ul className="divide-y divide-border border-y border-border">
          {NEXT_LINKS.map((link) => (
            <li key={link.to} className="py-3">
              <Link
                to={link.to}
                onClick={onLeave}
                className="target-44 inline-flex items-center gap-2 font-semibold text-primary-strong underline"
              >
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
