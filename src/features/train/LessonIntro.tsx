import { useId } from 'react';
import { Link } from 'react-router';
import { Play } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Button, EvidenceLabel } from '@/components';
import type { Lesson } from '@/domain/lessons';
import type { LessonProgress } from '@/domain/models';
import { COMMAND_WINDOW_LONG_MS } from '@/domain/timing';
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
}

function seconds(ms: number): number {
  return Math.round(ms / 100) / 10;
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

/** What the lesson covers, how many steps it has, the time limit and how to extend it, then "Start lesson". */
export function LessonIntro({ lesson, progress, headingLevel, onStart }: LessonIntroProps) {
  const headingId = useId();
  const { preferences } = usePreferences();
  const { state } = useDevice();
  const teaches = teachesPhrase(lesson);
  const windowSeconds = seconds(state.commandWindowMs);

  return (
    <section aria-labelledby={headingId} className="grid max-w-3xl gap-6">
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

      <div className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0 border-l-2 border-border-strong pl-3">
            <dt className="text-sm text-muted-foreground">You will practise</dt>
            <dd className="font-semibold">{teaches ?? 'Opening the command window with a squeeze'}</dd>
          </div>
          <div className="min-w-0 border-l-2 border-border-strong pl-3">
            <dt className="text-sm text-muted-foreground">Steps</dt>
            <dd className="font-semibold tabular-nums">{lesson.steps.length}</dd>
          </div>
        </dl>
        <p className="text-muted-foreground">
          Each squeeze opens the command window for {windowSeconds} seconds.{' '}
          {preferences.longerInteractionTime ? (
            <>
              Longer interaction time is on.{' '}
              <Link to={ROUTES.settings} className="font-medium text-primary-strong underline">
                Change it in Settings
              </Link>
            </>
          ) : (
            <>
              Need more time?{' '}
              <Link to={ROUTES.settings} className="font-medium text-primary-strong underline">
                Turn on Longer interaction time in Settings
              </Link>{' '}
              for {seconds(COMMAND_WINDOW_LONG_MS)} seconds.
            </>
          )}
        </p>
        <ProgressNote progress={progress} />
        <div>
          <Button onClick={onStart} leadingIcon={<Play className="h-5 w-5" />}>
            Start lesson
          </Button>
        </div>
      </div>
    </section>
  );
}
