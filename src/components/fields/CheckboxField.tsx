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
      {/*
        One label around the 44 px box and the text, so the whole row operates the
        checkbox: the box alone is 21 px, and a span around it only looks like a
        target (WCAG 2.2 target size, and our own 44 px rule in theme.css).
        The hint and the error stay outside the label — they are referenced with
        aria-describedby and must not join the accessible name.
      */}
      <label htmlFor={id} className="flex w-full cursor-pointer items-start gap-3">
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
        <span className="min-w-0 pt-2.5 font-medium leading-snug">{label}</span>
      </label>
      {/* Indented to the label text: 2.75rem box + 0.75rem gap. */}
      <div className="pl-14">
        <FieldHint id={hintId}>{hint}</FieldHint>
        <FieldError id={errorId}>{error}</FieldError>
      </div>
    </div>
  );
});
