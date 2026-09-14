import { EMERGENCY_HOLD_MS } from '@/domain/timing';
import { cn } from '@/lib/cn';

export interface HoldRingProps {
  /** Hold progress from 0 to 1. Values outside the range are clamped. */
  readonly progress: number;
  /** True once the arming cue has been reached. Shown by stroke AND an "Armed" badge. */
  readonly armed: boolean;
  /** Diameter in CSS pixels. */
  readonly size?: number;
  readonly label: string;
  /** Length of the full hold. Defaults to the five-second emergency hold. */
  readonly holdMs?: number;
  /** Hides the seconds readout in the centre, e.g. when a contact point sits inside the ring. */
  readonly compact?: boolean;
  readonly className?: string;
}

function formatSeconds(seconds: number): string {
  return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);
}

/** Circular progress for the five-second hold. */
export function HoldRing({
  progress,
  armed,
  size = 96,
  label,
  holdMs = EMERGENCY_HOLD_MS,
  compact = false,
  className,
}: HoldRingProps) {
  const clamped = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;
  const totalSeconds = holdMs / 1000;
  const elapsed = Math.round(clamped * totalSeconds * 10) / 10;
  const strokeWidth = armed ? 6 : 4;
  const radius = 50 - 4;
  const circumference = 2 * Math.PI * radius;
  const valueText = `${formatSeconds(elapsed)} of ${formatSeconds(totalSeconds)} seconds${armed ? ', armed' : ''}`;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={totalSeconds}
      aria-valuenow={elapsed}
      aria-valuetext={valueText}
      data-armed={armed || undefined}
      className={cn('relative inline-flex shrink-0 flex-col items-center', className)}
      style={{ width: size }}
    >
      <span className="relative block" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="4" className="stroke-border-strong" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            className={armed ? 'stroke-primary' : 'stroke-foreground'}
          />
        </svg>
        {!compact && (
          <span
            aria-hidden="true"
            className="font-mono-label absolute inset-0 flex items-center justify-center text-foreground"
          >
            {formatSeconds(elapsed)} s
          </span>
        )}
      </span>
      {armed && (
        <span
          aria-hidden="true"
          className="font-mono-label mt-1 rounded-full bg-primary px-2 py-0.5 leading-none text-primary-foreground"
        >
          Armed
        </span>
      )}
    </div>
  );
}
