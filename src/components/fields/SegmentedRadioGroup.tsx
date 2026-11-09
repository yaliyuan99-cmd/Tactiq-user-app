import { useId } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<V extends string> {
  readonly value: V;
  readonly label: string;
  /** Shown while the segment is not chosen; the chosen one carries the tick. */
  readonly Icon?: LucideIcon;
}

export interface SegmentedRadioGroupProps<V extends string> {
  readonly legend: string;
  /** Visually hides the legend (it stays available to screen readers). */
  readonly legendHidden?: boolean;
  readonly options: readonly SegmentedOption<V>[];
  readonly value: V;
  readonly onChange: (value: V) => void;
  readonly className?: string;
}

/**
 * Native radios in a fieldset, drawn as a row of segments. Arrow keys move
 * between options as with any radio group. The chosen segment is filled and
 * carries a tick, so the state never depends on colour alone.
 */
export function SegmentedRadioGroup<V extends string>({
  legend,
  legendHidden = false,
  options,
  value,
  onChange,
  className,
}: SegmentedRadioGroupProps<V>) {
  const name = `segmented-${useId().replace(/:/g, '')}`;
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={legendHidden ? 'sr-only' : 'font-medium'}>{legend}</legend>
      <div
        className={cn(
          'flex flex-wrap gap-1 rounded-xl border border-border-strong bg-input-background p-1',
          !legendHidden && 'mt-1.5',
        )}
      >
        {options.map(({ value: option, label, Icon }) => {
          const selected = option === value;
          return (
            <label key={option} className="relative flex min-w-0 flex-auto">
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
              />
              <span
                className={cn(
                  'target-44 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-center font-medium leading-tight transition-colors duration-[var(--dur-tap)]',
                  'peer-focus-visible:outline-solid peer-focus-visible:outline-(length:--focus-width) peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                  selected ? 'bg-primary text-primary-foreground' : 'text-foreground peer-hover:bg-secondary',
                )}
              >
                {selected ? (
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
