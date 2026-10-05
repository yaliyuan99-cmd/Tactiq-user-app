import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /**
   * Pending state. The button stays focusable (no `disabled` attribute) but is
   * marked aria-disabled + aria-busy, shows a spinner and ignores clicks.
   */
  readonly busy?: boolean;
  readonly leadingIcon?: ReactNode;
  readonly trailingIcon?: ReactNode;
  readonly fullWidth?: boolean;
}

/**
 * `busy` and `aria-disabled` both keep the button focusable and both swallow
 * the click, so `onClick` does not run. A control that must explain why
 * nothing happened cannot use `onClick` for that: either say it up front with
 * `aria-describedby` (see `FeedbackTryouts`), explain from `onClickCapture`
 * (see `ConfirmDialog`), or use a plain `<button>` with `buttonClasses()`
 * (see `ShortcutEditor`).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    busy = false,
    leadingIcon,
    trailingIcon,
    fullWidth,
    className,
    type = 'button',
    onClick,
    children,
    'aria-disabled': ariaDisabled,
    ...rest
  },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy || ariaDisabled === true || ariaDisabled === 'true') {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      aria-disabled={busy ? true : ariaDisabled}
      aria-busy={busy || undefined}
      onClick={handleClick}
      {...rest}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {leadingIcon}
          </span>
        )
      )}
      {children}
      {trailingIcon && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  );
});
