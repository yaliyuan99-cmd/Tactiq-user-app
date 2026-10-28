import { HOME_SECTIONS } from '@/app/publicRoutes';
import { HomeSection } from './HomeSection';
import { SCENARIOS } from './homeContent';
import { EYEBROW } from './homeStyles';

/** Three everyday moments, as a numbered row separated by rules rather than boxes. */
export function ScenariosSection() {
  return (
    <HomeSection
      id={HOME_SECTIONS.scenarios}
      eyebrow="Why a ring"
      heading="Three moments it is designed for"
      lede="None of these is solved by a bigger phone screen or a louder voice assistant."
    >
      <ol className="mt-10 grid gap-10 md:mt-12 md:grid-cols-3 md:gap-0">
        {SCENARIOS.map((scenario, index) => {
          const { Icon } = scenario;
          return (
            <li
              key={scenario.id}
              className="md:border-l md:border-border md:px-7 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
            >
              <p className={EYEBROW}>{String(index + 1).padStart(2, '0')}</p>
              <Icon className="mt-4 h-6 w-6 text-foreground" aria-hidden="true" />
              <h3 className="mt-3">{scenario.title}</h3>
              <p className="mt-2 text-muted-foreground">{scenario.text}</p>
            </li>
          );
        })}
      </ol>
    </HomeSection>
  );
}
