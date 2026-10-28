import { HOME_SECTIONS } from '@/app/publicRoutes';
import { HomeSection } from './HomeSection';
import { QUESTIONS } from './homeContent';

/** A short FAQ. Plain headings and answers: nothing to open, nothing to discover. */
export function QuestionsSection() {
  return (
    <HomeSection id={HOME_SECTIONS.questions} eyebrow="Questions" heading="The five we are asked most">
      <div className="mt-10 grid gap-x-12 gap-y-8 md:mt-12 md:grid-cols-2">
        {QUESTIONS.map((item) => (
          <div key={item.id} className="max-w-prose">
            <h3>{item.question}</h3>
            <p className="mt-2 text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </HomeSection>
  );
}
