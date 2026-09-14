import { PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { useTraining } from '@/services/ServicesProvider';
import { LessonList } from './LessonList';
import { ResetTrainingSection } from './ResetTrainingSection';
import { TrainingOverview } from './TrainingOverview';

export const TRAIN_LEDE = 'Five short lessons, from the squeeze to the emergency hold. Progress saves in this browser.';

/** /dashboard/train — overall progress, the recommended lesson, the five lessons in order, and a reset. */
export default function TrainPage() {
  usePageTitle('Train');
  const training = useTraining();
  const progress = training.getProgress();
  const summary = training.summary();
  const recommended = training.nextLesson();

  return (
    <>
      <PageHeader title="Train" lede={TRAIN_LEDE} />
      <div className="grid grid-cols-1 gap-10 sm:gap-12">
        <TrainingOverview
          summary={summary}
          recommended={recommended}
          recommendedStatus={recommended ? progress.lessons[recommended].status : null}
        />
        <LessonList progress={progress} recommended={recommended} />
        <ResetTrainingSection />
      </div>
    </>
  );
}
