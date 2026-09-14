import { useId } from 'react';
import { Hand, List } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { PracticeView } from './practiceView';

export interface ViewSwitchProps {
  readonly value: PracticeView;
  readonly onChange: (view: PracticeView) => void;
  readonly className?: string;
}

const OPTIONS = [
  { value: 'hand', label: 'Hand view', Icon: Hand },
  { value: 'list', label: 'List view', Icon: List },
] as const;

/**
 * A compact two-option radio group. Native radios, so arrow keys move between
 * the options and the choice is announced without extra code.
 */
export function ViewSwitch({ value, onChange, className }: ViewSwitchProps) {
  const name = `practice-view-${useId().replace(/:/g, '')}`;
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-2 text-sm font-medium">Show the contact points as</legend>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(({ value: option, label, Icon }) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={cn(
                'target-44 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2',
                selected ? 'border-primary bg-secondary' : 'border-border bg-card hover:bg-secondary',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="h-5 w-5 shrink-0 accent-primary"
              />
              <span className="font-medium">{label}</span>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
