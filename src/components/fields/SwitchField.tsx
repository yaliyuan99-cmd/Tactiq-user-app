import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchFieldProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children' | 'role' | 'type'> {
  readonly label: ReactNode;
  readonly description?: ReactNode;
  /** Alias for description. */
  readonly hint?: ReactNode;
  readonly checked: boolean;
  /** Called with the next state. */
  readonly onChange?: (checked: boolean) => void;
  /** Alias for onChange. */
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly onText?: string;
  readonly offText?: string;
  readonly containerClassName?: string;
}

/** An on/off setting. A real button with role="switch"; the state is shown in words as well as position. */
export const SwitchField = forwardRef<HTMLButtonElement, SwitchFieldProps>(function SwitchField(
  {
    label,
    description: descriptionProp,
    hint,
    checked,
    onChange,
    onCheckedChange,
    onText = 'On',
    offText = 'Off',
    disabled,
    id: explicitId,
    className,
    containerClassName,
    onClick,
    ...rest
  },
  ref,
) {
  const generated = useId().replace(/:/g, '');
  const id = explicitId ?? `switch-${generated}`;
  const labelId = `${id}-label`;
  const description = descriptionProp ?? hint;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn('flex items-start justify-between gap-4', containerClassName)}>
      <div className="min-w-0 pt-2">
        <span id={labelId} className="block font-medium leading-snug">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="mt-1 block text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          onChange?.(!checked);
          onCheckedChange?.(!checked);
        }}
        className={cn(
          'target-44 inline-flex shrink-0 items-center gap-2 rounded-full px-1.5 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-[var(--dur-move)]',
            checked ? 'border-primary bg-primary' : 'border-border-strong bg-switch-background',
          )}
        >
          <span
            className={cn(
              'absolute h-5 w-5 rounded-full bg-card shadow-card transition-transform duration-[var(--dur-move)]',
              checked ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </span>
        <span aria-hidden="true" className="font-mono-label w-7 text-left text-foreground">
          {checked ? onText : offText}
        </span>
      </button>
    </div>
  );
});
