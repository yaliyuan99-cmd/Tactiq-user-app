import { useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<V extends string> {
  readonly value: V;
  readonly label: string;
}

export interface SegmentedRadioGroupProps<V extends string> {
  readonly legend: string;
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
export function SegmentedRadioGroup<V extends string>({ legend, options, value, onChange, className }: SegmentedRadioGroupProps<V>) {
  const name = `segmented-${useId().replace(/:/g, '')}`;
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="font-medium">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1 rounded-md border border-input bg-input-background p-1">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label key={option.value} className="relative flex min-w-0 flex-auto">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
              />
              <span
                className={cn(
                  'target-44 flex w-full items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-center font-medium leading-tight',
                  'peer-focus-visible:outline-solid peer-focus-visible:outline-(length:--focus-width) peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                  selected ? 'bg-primary text-primary-foreground' : 'text-foreground peer-hover:bg-secondary',
                )}
              >
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
