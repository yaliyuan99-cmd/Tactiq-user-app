import { CircleCheck, CircleOff } from 'lucide-react';
import { HOME_SECTIONS } from '@/app/publicRoutes';
import { HomeSection } from './HomeSection';
import { PROJECT_STATUS } from './homeContent';
import { EYEBROW } from './homeStyles';

/**
 * Project status, stated as rows of "exists" and "not yet". Each row pairs an
 * icon with the words, so the distinction never rests on colour.
 */
export function ResearchSection() {
  return (
    <HomeSection
      id={HOME_SECTIONS.research}
      layout="split"
      eyebrow="Research and status"
      heading="What exists, and what does not"
      lede="Tactiq is a student research project. Keeping this list honest is part of the work, so it names the gaps before it names the plan."
    >
      <dl className="divide-y divide-border border-y border-border">
        {PROJECT_STATUS.map((row) => {
          const Icon = row.exists ? CircleCheck : CircleOff;
          return (
            <div key={row.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-6">
              <dt className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Icon
                  className={`h-5 w-5 shrink-0 ${row.exists ? 'text-status-confirmed' : 'text-status-future'}`}
                  aria-hidden="true"
                />
                <span className="font-medium">{row.label}</span>
                <span className={EYEBROW}>{row.exists ? 'Exists' : 'Not yet'}</span>
              </dt>
              <dd className="text-muted-foreground">{row.detail}</dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-8 grid max-w-prose gap-3">
        <h3>What happens next</h3>
        <p className="text-muted-foreground">
          The next step is a bench sweep to settle how long a squeeze must be held before the command window opens. The
          value in the firmware today is a placeholder, not a measurement. Only after that does fabrication of a
          wearable make sense.
        </p>
        <p className="text-muted-foreground">
          Until then, every figure this project publishes is a design value, a threshold fixed in advance, or something
          the app simulated. Inside the app, the Help page lists every limitation in full.
        </p>
      </div>
    </HomeSection>
  );
}
