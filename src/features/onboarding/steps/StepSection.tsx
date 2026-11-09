import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StepSectionProps {
  readonly title: ReactNode;
  /** Shown beside the heading, e.g. an evidence label. */
  readonly aside?: ReactNode;
  readonly intro?: ReactNode;
  /** Draws the section on a card surface. */
  readonly card?: boolean;
  readonly className?: string;
  readonly children?: ReactNode;
}

/** A region inside a step, named by its h2. */
export function StepSection({ title, aside, intro, card = false, className, children }: StepSectionProps) {
  const headingId = `step-section-${useId().replace(/:/g, '')}`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'min-w-0',
        card && 'rounded-lg border-[1.5px] border-foreground bg-card p-5 text-card-foreground shadow-card sm:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={headingId}>{title}</h2>
        {aside}
      </div>
      {intro && <p className="mt-2 max-w-prose text-muted-foreground">{intro}</p>}
      {/* A shrinkable track and anywhere-wrapping keep long words beside a switch from widening a 320 px screen at larger text sizes. */}
      {children && <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 [overflow-wrap:anywhere]">{children}</div>}
    </section>
  );
}

/** The opening paragraph of a step, directly under the h1. */
export function StepLede({ children }: { readonly children: ReactNode }) {
  return <p className="max-w-prose text-lg text-muted-foreground">{children}</p>;
}
