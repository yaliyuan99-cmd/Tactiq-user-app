import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FieldError, FieldHint, FieldLabel } from './FieldParts';
import { CONTROL_CLASSES, hasContent, useFieldIds } from './fieldIds';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  /** Rendered as <option>s. Children are rendered after them, for optgroups. */
  readonly options?: readonly SelectOption[];
  readonly containerClassName?: string;
}

/** A native select — the most reliable picker for screen readers and switch access. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, required, options, id: explicitId, className, containerClassName, children, ...rest },
  ref,
) {
  const { id, hintId, errorId, describedBy } = useFieldIds(explicitId, hint, error);
  const invalid = hasContent(error);
  return (
    <div className={cn('w-full', containerClassName)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <FieldHint id={hintId}>{hint}</FieldHint>
      <div className="relative mt-1.5">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL_CLASSES, 'appearance-none pr-10', className)}
          {...rest}
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
});
