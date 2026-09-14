import { forwardRef, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonLinkProps extends LinkProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly leadingIcon?: ReactNode;
  readonly trailingIcon?: ReactNode;
  readonly fullWidth?: boolean;
}

/** A react-router link that looks like a Button. Use it for navigation, never for actions. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'primary', size = 'md', leadingIcon, trailingIcon, fullWidth, className, children, ...rest },
  ref,
) {
  return (
    <Link
      ref={ref}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {leadingIcon && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      {children}
      {trailingIcon && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </Link>
  );
});
