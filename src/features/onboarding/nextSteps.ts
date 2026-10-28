/**
 * Where setup sends the user once it is finished. Pure: the caller passes the
 * training summary it read from the training service.
 *
 * The training link is derived from real lesson progress, never from a fixed
 * lesson id: someone who skipped the first command is pointed at lesson 1, and
 * someone who has finished every lesson is not told to "continue".
 */
import { ROUTES, lessonRoute } from '@/app/routes';
import { getLesson } from '@/domain/lessons';
import type { TrainingSummary } from '@/domain/models';
import { CALIBRATION_SAMPLES_PER_CONTACT } from '@/domain/timing';

export type NextStepId = 'training' | 'calibrate' | 'simulator';

export interface NextStepLink {
  readonly id: NextStepId;
  readonly to: string;
  readonly label: string;
  readonly description: string;
}

/** True once any lesson has been finished or any attempt recorded. */
function hasTrained(summary: TrainingSummary): boolean {
  return summary.lessonsCompleted > 0 || summary.attempts > 0;
}

/** The training link for the progress the user actually has. */
export function trainingLink(summary: TrainingSummary): NextStepLink {
  if (summary.nextLesson === null) {
    return {
      id: 'training',
      to: ROUTES.train,
      label: 'Open training',
      description: `All ${summary.lessonsTotal} lessons are done. Open training to run any of them again.`,
    };
  }
  const lesson = getLesson(summary.nextLesson);
  return {
    id: 'training',
    to: lessonRoute(lesson.id),
    label: hasTrained(summary) ? 'Continue training' : 'Start training',
    description: `Lesson ${lesson.number} of ${summary.lessonsTotal}: ${lesson.title}. ${lesson.summary}`,
  };
}

/** The three places setup offers at the end, training first. */
export function nextStepLinks(summary: TrainingSummary): readonly NextStepLink[] {
  return [
    trainingLink(summary),
    {
      id: 'calibrate',
      to: ROUTES.calibrate,
      label: 'Rehearse calibration',
      description: `A run through the calibration routine: ${CALIBRATION_SAMPLES_PER_CONTACT} prompted taps on each of the eight points. It records which point you tapped; it does not adjust a ring.`,
    },
    {
      id: 'simulator',
      to: ROUTES.simulator,
      label: 'Open the simulator',
      description: 'Try all nine commands freely on the simulated ring.',
    },
  ];
}
