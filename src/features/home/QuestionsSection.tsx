import { ChevronDown } from 'lucide-react';
import { HOME_SECTIONS } from '@/app/publicRoutes';
import { HomeSection } from './HomeSection';
import { QUESTIONS } from './homeContent';

/** A short FAQ on native details elements: keyboard and screen-reader support come with them. */
export function QuestionsSection() {
  return (
    <HomeSection id={HOME_SECTIONS.questions} eyebrow="Questions" heading="The five we are asked most">
      <div className="mt-10 grid max-w-3xl gap-3 md:mt-12">
        {QUESTIONS.map((item, index) => (
          <details key={item.id} open={index === 0} className="group rounded-lg border-[1.5px] border-foreground bg-card shadow-card">
            <summary className="target-44 flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-lg font-semibold hover:bg-secondary [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown
                className="h-5 w-5 shrink-0 transition-transform duration-[var(--dur-move)] group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="px-5 pb-5 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </HomeSection>
  );
}
