import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { ButtonLink, PageHeader } from '@/components';
import { getLesson, isLessonId } from '@/domain/lessons';
import { usePageTitle } from '@/lib/usePageTitle';
import { LessonRunner } from './LessonRunner';
import { lessonTitle } from './trainingWords';

export const LESSON_NOT_FOUND_TITLE = 'Lesson not found';

function AllLessonsLink() {
  return (
    <Link
      to={ROUTES.train}
      className="target-44 mb-2 inline-flex items-center gap-1.5 font-medium text-primary-strong underline decoration-1 underline-offset-2 hover:decoration-2"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      All lessons
    </Link>
  );
}

/** /dashboard/train/:lessonId — one lesson, or a clear way back when the address names no lesson. */
export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lesson = isLessonId(lessonId) ? getLesson(lessonId) : null;
  usePageTitle(lesson ? lessonTitle(lesson) : LESSON_NOT_FOUND_TITLE);

  if (!lesson) {
    return (
      <>
        <PageHeader
          title={LESSON_NOT_FOUND_TITLE}
          lede="There is no lesson at this address. It may have been mistyped, or the link may be out of date."
        />
        <ButtonLink to={ROUTES.train} leadingIcon={<ArrowLeft className="h-5 w-5" />}>
          Back to all lessons
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <AllLessonsLink />
      <LessonRunner
        key={lesson.id}
        lessonId={lesson.id}
        onExit={() => {
          void navigate(ROUTES.train);
        }}
      />
    </>
  );
}
