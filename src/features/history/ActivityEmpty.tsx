import { type ReactNode } from 'react';
import { Activity, GraduationCap, Hand, type LucideIcon } from 'lucide-react';
import { Button, ButtonLink } from '@/components';
import { ROUTES } from '@/app/routes';

export interface ActivityEmptyProps {
  /** Adds the labelled sample records. Null when they cannot be offered here. */
  readonly onAddSamples: (() => void) | null;
}

function Way({ Icon, description, children }: { Icon: LucideIcon; description: string; children: ReactNode }) {
  return (
    <li className="lift relative flex flex-col items-start gap-3 rounded-lg border-[1.5px] border-foreground bg-card p-5 shadow-card">
      <span aria-hidden="true" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary-strong">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-muted-foreground">{description}</p>
      {children}
    </li>
  );
}

/** Nothing recorded yet: what will appear here, and the ways to make something appear. */
export function ActivityEmpty({ onAddSamples }: ActivityEmptyProps) {
  return (
    <section aria-labelledby="activity-empty-heading">
      <h2 id="activity-empty-heading">No activity yet</h2>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Attempts from the simulator, lessons and calibration will appear here. Each one is labelled Simulated, or Measured
        when it came from a connected bench ring.
      </p>
      <ul role="list" className="mt-5 grid gap-3 md:grid-cols-3">
        <Way Icon={Hand} description="Squeeze, tap the point it asks for and see the result straight away.">
          <ButtonLink to={ROUTES.simulator} className="stretched-link mt-auto">
            Practise a command
          </ButtonLink>
        </Way>
        <Way Icon={GraduationCap} description="Five short lessons, from the squeeze to the emergency hold.">
          <ButtonLink to={ROUTES.train} variant="secondary" className="stretched-link mt-auto">
            Start a lesson
          </ButtonLink>
        </Way>
        {onAddSamples && (
          <Way Icon={Activity} description="See this page filled in. Every record is labelled Sample, and you can remove them.">
            <Button variant="secondary" className="stretched-link mt-auto" onClick={onAddSamples}>
              Add sample records
            </Button>
          </Way>
        )}
      </ul>
    </section>
  );
}
