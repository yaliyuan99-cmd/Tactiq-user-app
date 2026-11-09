import { Check } from 'lucide-react';
import { ONBOARDING_STEPS } from '@/domain/onboarding';
import { cn } from '@/lib/cn';

export interface SetupRailProps {
  readonly index: number;
  /** Goes back to a step that has been passed. Steps ahead are reached with Continue. */
  readonly onGoTo: (index: number) => void;
}

/** The four steps, from the large breakpoint up: passed ones can be reopened, and the current one is marked. */
export function SetupRail({ index, onGoTo }: SetupRailProps) {
  return (
    <ol role="list" aria-label="Setup steps" className="grid">
      {ONBOARDING_STEPS.map((step, position) => {
        const passed = position < index;
        const current = position === index;
        const last = position === ONBOARDING_STEPS.length - 1;
        const node = (
          <span
            aria-hidden="true"
            className={cn(
              'relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold tabular-nums transition-colors duration-[var(--dur-tap)]',
              passed && 'border-primary bg-primary text-primary-foreground',
              current && 'border-primary bg-card text-primary-strong',
              !passed && !current && 'border-border-strong bg-background text-muted-foreground',
            )}
          >
            {passed ? <Check className="h-4 w-4" /> : position + 1}
          </span>
        );
        return (
          <li key={step.id} className="relative pb-5 last:pb-0" aria-current={current ? 'step' : undefined}>
            {!last && (
              <span
                aria-hidden="true"
                className={cn('absolute bottom-0 left-[1.0625rem] top-0 w-0.5', passed ? 'bg-primary' : 'bg-border-strong')}
              />
            )}
            {passed ? (
              <button
                type="button"
                onClick={() => onGoTo(position)}
                className="target-44 relative flex w-full cursor-pointer items-center gap-3 rounded-full pr-3 text-left font-medium transition-colors duration-[var(--dur-tap)] hover:bg-secondary"
              >
                {node}
                <span>
                  <span className="sr-only">Go back to: </span>
                  {step.title}
                </span>
              </button>
            ) : (
              <p className={cn('relative flex min-h-11 items-center gap-3', current ? 'font-semibold' : 'text-muted-foreground')}>
                {node}
                {step.title}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
