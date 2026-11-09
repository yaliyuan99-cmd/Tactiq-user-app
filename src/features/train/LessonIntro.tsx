import { useId } from 'react';
import { Link } from 'react-router';
import { Play } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, EvidenceLabel } from '@/components';
import type { Lesson } from '@/domain/lessons';
import type { LessonProgress } from '@/domain/models';
import { COMMAND_WINDOW_LONG_MS } from '@/domain/timing';
import { windowSeconds } from '@/features/practice';
import { formatPercent } from '@/lib/time';
import { useDevice } from '@/services/device/DeviceProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import type { HeadingLevel } from './headingLevel';
import { LessonHeading } from './LessonHeading';
import { teachesPhrase } from './trainingWords';

export interface LessonIntroProps {
  readonly lesson: Lesson;
  readonly progress: LessonProgress;
  readonly headingLevel: HeadingLevel;
  readonly onStart: () => void;
  /**
   * Whether to link to Settings for Longer interaction time. False inside
   * onboarding, where Settings is behind the setup gate: following the link
   * would bounce straight back to setup. The sentence still states the window,
   * it just does not offer a way out of the step.
   */
  readonly showSettingsLink?: boolean;
}

function ProgressNote({ progress }: { progress: LessonProgress }) {
  if (progress.status === 'in_progress') {
    return <p>You started this lesson before. Starting it again begins at step 1.</p>;
  }
  if (progress.status === 'complete' && progress.bestAccuracy !== null) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>You have completed this lesson. Best accuracy: {formatPercent(progress.bestAccuracy)}</span>
        <EvidenceLabel kind="simulated" />
      </p>
    );
  }
  return null;
}

/**
 * What the lesson covers, how many steps it has, the time limit and how to
 * extend it, then "Start lesson". The stated window is always the one the
 * active device uses; Longer interaction time only applies in Demo Mode,
 * because the bench firmware's window is fixed.
 */
export function LessonIntro({ lesson, progress, headingLevel, onStart, showSettingsLink = true }: LessonIntroProps) {
  const headingId = useId();
  const { preferences } = usePreferences();
  const { state } = useDevice();
  const teaches = teachesPhrase(lesson);
  const openFor = windowSeconds(state.commandWindowMs);

  return (
    <section aria-labelledby={headingId} className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
      <div className="grid gap-4">
        <div>
          <LessonHeading level={headingLevel} id={headingId}>
            How this lesson works
          </LessonHeading>
          <div className="mt-3 grid gap-3">
            {lesson.explanation.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <div>
          <Button size="lg" onClick={onStart} leadingIcon={<Play className="h-5 w-5" />}>
            Start lesson
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border-[1.5px] border-foreground bg-card p-5 shadow-card sm:p-6">
        <ol role="list" aria-label="The steps in this lesson" className="step-list text-sm">
          {lesson.steps.map((step, index) => (
            <li key={index}>{step.instruction}</li>
          ))}
        </ol>
        <dl className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <dt className="text-sm text-muted-foreground">You will practise</dt>
            <dd className="font-semibold">{teaches ?? 'Opening the command window with a squeeze'}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-sm text-muted-foreground">Steps</dt>
            <dd className="font-semibold tabular-nums">{lesson.steps.length}</dd>
          </div>
        </dl>
        {state.mode === 'demo' ? (
          <p className="text-sm text-muted-foreground">
            Each squeeze opens the command window for {openFor} seconds.{' '}
            {preferences.longerInteractionTime ? (
              <>
                Longer interaction time is on.
                {showSettingsLink && (
                  <>
                    {' '}
                    <Link to={ROUTES.settings} className="font-medium text-primary-strong underline">
                      Change it in Settings
                    </Link>
                  </>
                )}
              </>
            ) : showSettingsLink ? (
              <>
                Need more time?{' '}
                <Link to={ROUTES.settings} className="font-medium text-primary-strong underline">
                  Turn on Longer interaction time in Settings
                </Link>{' '}
                for {windowSeconds(COMMAND_WINDOW_LONG_MS)} seconds.
              </>
            ) : (
              <>
                Longer interaction time, in Settings, gives {windowSeconds(COMMAND_WINDOW_LONG_MS)} seconds. You can
                change it once setup is finished.
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your bench ring keeps its command window open for {openFor} seconds.{' '}
            {showSettingsLink ? (
              <>
                <Link to={ROUTES.settings} className="font-medium text-primary-strong underline">
                  Longer interaction time
                </Link>{' '}
                only changes practice in Demo Mode.
              </>
            ) : (
              <>Longer interaction time only changes practice in Demo Mode.</>
            )}
          </p>
        )}
        <ProgressNote progress={progress} />
      </div>
    </section>
  );
}
