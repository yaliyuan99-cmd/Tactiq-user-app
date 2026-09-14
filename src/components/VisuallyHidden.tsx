import { type HTMLAttributes, type ReactNode } from 'react';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  readonly as?: 'span' | 'div' | 'p';
  readonly children: ReactNode;
}

/** Content for screen readers only. Still in the accessibility tree; hidden from sight. */
export function VisuallyHidden({ as: Tag = 'span', className, children, ...rest }: VisuallyHiddenProps) {
  return (
    <Tag className={className ? `sr-only ${className}` : 'sr-only'} {...rest}>
      {children}
    </Tag>
  );
}
