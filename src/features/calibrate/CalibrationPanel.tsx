import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CalibrationPanelProps {
  readonly headingId: string;
  readonly heading: ReactNode;
  /** Small label above the heading, e.g. "Point 2 of 8". */
  readonly eyebrow?: ReactNode;
  /** Shown beside the heading, e.g. an evidence label. */
  readonly aside?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * A card-styled section whose h2 can take focus (tabIndex -1) when the
 * calibration step changes. The shared Card does not expose its heading, so
 * this mirrors its surface.
 */
export const CalibrationPanel = forwardRef<HTMLHeadingElement, CalibrationPanelProps>(function CalibrationPanel(
  { headingId, heading, eyebrow, aside, children, className },
  ref,
) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn('min-w-0 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-card sm:p-6', className)}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {eyebrow && <p className="font-mono-label mb-1 text-muted-foreground">{eyebrow}</p>}
          <h2 id={headingId} ref={ref} tabIndex={-1}>
            {heading}
          </h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
});
