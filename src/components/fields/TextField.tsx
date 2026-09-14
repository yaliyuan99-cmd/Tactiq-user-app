import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FieldError, FieldHint, FieldLabel } from './FieldParts';
import { CONTROL_CLASSES, hasContent, useFieldIds } from './fieldIds';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /** When set, the input is aria-invalid and the message is announced. */
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
  readonly containerClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, required, type = 'text', id: explicitId, className, containerClassName, ...rest },
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
      <input
        ref={ref}
        id={id}
        type={type}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(CONTROL_CLASSES, 'mt-1.5', className)}
        {...rest}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
});
