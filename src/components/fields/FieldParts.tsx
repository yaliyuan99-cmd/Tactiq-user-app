import { type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { hasContent } from './fieldIds';

export function FieldLabel({
  htmlFor,
  id,
  required,
  children,
  className,
}: {
  htmlFor?: string;
  id?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} id={id} className={cn('block font-medium', className)}>
      {children}
      {required && <span className="ml-1 text-sm font-normal text-muted-foreground">(required)</span>}
    </label>
  );
}

export function FieldHint({ id, children }: { id: string | undefined; children: ReactNode }) {
  if (!id || !hasContent(children)) return null;
  return (
    <p id={id} className="mt-1 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Error text: icon + words, announced once when it appears. */
export function FieldError({ id, children }: { id: string | undefined; children: ReactNode }) {
  if (!id || !hasContent(children)) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-destructive">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
