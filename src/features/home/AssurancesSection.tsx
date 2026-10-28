import { Accessibility, Lock } from 'lucide-react';
import { HOME_SECTIONS, type HomeSectionId } from '@/app/publicRoutes';
import { cn } from '@/lib/cn';
import { ACCESSIBILITY_POINTS, PRIVACY_POINTS } from './homeContent';
import { EYEBROW, SECTION, SHELL } from './homeStyles';

interface AssuranceProps {
  readonly id: HomeSectionId;
  readonly eyebrow: string;
  readonly heading: string;
  readonly points: readonly string[];
  readonly Icon: typeof Lock;
}

function Assurance({ id, eyebrow, heading, points, Icon }: AssuranceProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-8">
      <p className={cn(EYEBROW, 'flex items-center gap-2')}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 id={headingId} className="mt-3 text-xl">
        {heading}
      </h2>
      <ul className="mt-4 grid gap-3">
        {points.map((point) => (
          <li key={point} className="border-l border-border pl-4 text-muted-foreground">
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Privacy and accessibility share one band: both are short, both are promises
 * about this app rather than about hardware, and the footer links to each id.
 */
export function AssurancesSection() {
  return (
    <div className={SECTION}>
      <div className={cn(SHELL, 'grid gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16')}>
        <Assurance
          id={HOME_SECTIONS.privacy}
          eyebrow="Privacy"
          heading="Your practice stays in your browser"
          points={PRIVACY_POINTS}
          Icon={Lock}
        />
        <Assurance
          id={HOME_SECTIONS.accessibility}
          eyebrow="Accessibility"
          heading="Built to be used without sight"
          points={ACCESSIBILITY_POINTS}
          Icon={Accessibility}
        />
      </div>
    </div>
  );
}
