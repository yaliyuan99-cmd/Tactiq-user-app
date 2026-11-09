import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface ProgressBarProps {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  /** Shows "3 of 8" beside the label. Defaults to true. */
  readonly showValueText?: boolean;
  /** Overrides the "3 of 8" wording, for both the visible and the spoken value. */
  readonly valueText?: string;
  /** Draws one block per unit, for a count of whole things such as lessons or steps. */
  readonly segmented?: boolean;
  readonly className?: string;
}

export function ProgressBar({ value, max, label, showValueText = true, valueText, segmented = false, className }: ProgressBarProps) {
  const labelId = useId();
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  const percent = (safeValue / safeMax) * 100;
  const text = valueText ?? `${safeValue} of ${safeMax}`;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span id={labelId} className="font-medium">
          {label}
        </span>
        {showValueText && (
          <span className="font-mono-label text-muted-foreground" aria-hidden="true">
            {text}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={text}
        className={cn('h-2 w-full', segmented ? 'flex gap-1' : 'overflow-hidden rounded-full border border-border bg-muted')}
      >
        {segmented ? (
          Array.from({ length: safeMax }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-full min-w-0 flex-1 rounded-full transition-colors duration-[var(--dur-tap)]',
                index < safeValue ? 'bg-primary' : 'border border-border-strong bg-muted',
              )}
            />
          ))
        ) : (
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        )}
      </div>
    </div>
  );
}
