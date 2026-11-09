import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { HOME_SECTIONS } from '@/app/publicRoutes';
import { ROUTES } from '@/app/routes';
import { HomeSection } from './HomeSection';
import { SCENARIOS } from './homeContent';

/** Three everyday moments. Each card is one link into the practice screen. */
export function ScenariosSection() {
  return (
    <HomeSection
      id={HOME_SECTIONS.scenarios}
      eyebrow="Why a ring"
      heading="Three moments it is designed for"
      lede="None of these is solved by a bigger phone screen or a louder voice assistant."
    >
      <ul className="pasted mt-10 grid gap-5 md:mt-12 md:grid-cols-3">
        {SCENARIOS.map((scenario) => {
          const { Icon } = scenario;
          return (
            <li key={scenario.id} className="lift group relative flex flex-col rounded-md border-[1.5px] border-foreground bg-card p-7">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-foreground text-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl tracking-[-0.025em]">{scenario.title}</h3>
              <p className="mt-2 flex-1 text-muted-foreground">{scenario.text}</p>
              <Link
                to={`${ROUTES.demo}/simulator`}
                aria-label={`Practise this: ${scenario.title}`}
                className="stretched-link target-44 mt-4 inline-flex items-center gap-1.5 font-semibold text-primary-strong no-underline"
              >
                Practise this
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </HomeSection>
  );
}
