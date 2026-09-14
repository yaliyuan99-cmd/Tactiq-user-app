import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { FieldError, FieldHint, FieldLabel } from './FieldParts';
import { CONTROL_CLASSES, hasContent, useFieldIds } from './fieldIds';

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly containerClassName?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, hint, error, required, id: explicitId, rows = 4, className, containerClassName, ...rest },
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
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(CONTROL_CLASSES, 'mt-1.5 resize-y', className)}
        {...rest}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
});
