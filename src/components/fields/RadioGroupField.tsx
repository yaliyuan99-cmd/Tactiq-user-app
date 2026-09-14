import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FieldError, FieldHint } from './FieldParts';
import { hasContent } from './fieldIds';

export interface RadioOption<V extends string = string> {
  readonly value: V;
  readonly label: ReactNode;
  readonly description?: ReactNode;
  readonly disabled?: boolean;
}

export interface RadioGroupFieldProps<V extends string = string> {
  /** Rendered as the fieldset's legend. */
  readonly label: ReactNode;
  readonly options: readonly RadioOption<V>[];
  readonly value: V | null;
  readonly onChange: (value: V) => void;
  readonly name?: string;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly disabled?: boolean;
  /** Visually hides the legend (it stays available to screen readers). */
  readonly labelHidden?: boolean;
  readonly className?: string;
}

/** Native radios in a fieldset: arrow keys move between options without extra code. */
export function RadioGroupField<V extends string = string>({
  label,
  options,
  value,
  onChange,
  name,
  hint,
  error,
  required,
  disabled,
  labelHidden,
  className,
}: RadioGroupFieldProps<V>) {
  const base = `radio-${useId().replace(/:/g, '')}`;
  const groupName = name ?? base;
  const hintId = hasContent(hint) ? `${base}-hint` : undefined;
  const errorId = hasContent(error) ? `${base}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <fieldset
      className={cn('min-w-0', className)}
      aria-describedby={describedBy}
      aria-invalid={hasContent(error) || undefined}
      disabled={disabled}
    >
      <legend className={cn('font-medium', labelHidden && 'sr-only')}>
        {label}
        {required && <span className="ml-1 text-sm font-normal text-muted-foreground">(required)</span>}
      </legend>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <div className="mt-2 grid gap-2">
        {options.map((option, index) => {
          const optionId = `${base}-${index}`;
          const descriptionId = hasContent(option.description) ? `${optionId}-description` : undefined;
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex min-h-12 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5',
                selected ? 'border-primary bg-secondary' : 'border-border bg-card hover:bg-secondary',
                option.disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                required={required}
                disabled={option.disabled}
                aria-labelledby={`${optionId}-label`}
                aria-describedby={descriptionId}
                onChange={() => onChange(option.value)}
                className="mt-1 h-5 w-5 shrink-0 accent-primary"
              />
              <span className="min-w-0">
                <span id={`${optionId}-label`} className="block font-medium leading-snug">
                  {option.label}
                </span>
                {descriptionId && (
                  <span id={descriptionId} className="mt-0.5 block text-sm text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  );
}
