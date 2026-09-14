import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FieldError, FieldHint } from './FieldParts';
import { hasContent, useFieldIds } from './fieldIds';

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /** Alias for hint. */
  readonly description?: ReactNode;
  readonly error?: ReactNode;
  readonly containerClassName?: string;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(function CheckboxField(
  { label, hint: hintProp, description, error, id: explicitId, className, containerClassName, ...rest },
  ref,
) {
  const hint = hintProp ?? description;
  const { id, hintId, errorId, describedBy } = useFieldIds(explicitId, hint, error);
  const invalid = hasContent(error);
  return (
    <div className={cn('w-full', containerClassName)}>
      <div className="flex items-start gap-3">
        <span className="target-44 inline-flex shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn('h-5 w-5 cursor-pointer accent-primary disabled:cursor-not-allowed', className)}
            {...rest}
          />
        </span>
        <div className="min-w-0 pt-2.5">
          <label htmlFor={id} className="block cursor-pointer font-medium leading-snug">
            {label}
          </label>
          <FieldHint id={hintId}>{hint}</FieldHint>
        </div>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
});
