import { forwardRef, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Callout } from '@/components';
import { cn } from '@/lib/cn';

export const DEMO_MODE_NOTE =
  'Profiles are stored in this browser only. No password is stored or checked, so anyone using this browser can open them.';

/** The Demo Mode disclosure shown on every signed-out screen when no account backend is configured. */
export function DemoModeNote({ children, className }: { readonly children?: ReactNode; readonly className?: string }) {
  return (
    <Callout kind="info" role="note" title="Demo Mode" className={className}>
      <p>{DEMO_MODE_NOTE}</p>
      {children}
    </Callout>
  );
}

/** An underlined text link with a 44px target, for secondary navigation between the auth screens. */
export const TextLink = forwardRef<HTMLAnchorElement, LinkProps>(function TextLink({ className, ...rest }, ref) {
  return (
    <Link
      ref={ref}
      className={cn(
        'target-44 inline-flex items-center rounded-sm font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground',
        className,
      )}
      {...rest}
    />
  );
});

export interface FormMessageProps {
  readonly tone: 'error' | 'success';
  /** Nothing is shown while null; the live region stays in place so a new message is announced. */
  readonly message: string | null;
  readonly title?: string;
  /** Extra content shown under the message, such as a link. */
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * A form-level message: an error (role alert) or a success (role status).
 * The wrapper is always rendered so screen readers announce the message when
 * it appears, and it takes tabIndex -1 so the page can move focus to it.
 */
export const FormMessage = forwardRef<HTMLDivElement, FormMessageProps>(function FormMessage(
  { tone, message, title, children, className },
  ref,
) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-md', message ? className : undefined)}
    >
      {message && (
        <Callout kind={tone === 'error' ? 'danger' : 'success'} title={title}>
          <p>{message}</p>
          {children}
        </Callout>
      )}
    </div>
  );
});
