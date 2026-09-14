import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import type { HeadingLevel } from './headingLevel';

export interface LessonHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  readonly level: HeadingLevel;
  readonly children: ReactNode;
}

/** A heading whose level depends on where the lesson is shown (a page, or embedded in onboarding). */
export const LessonHeading = forwardRef<HTMLHeadingElement, LessonHeadingProps>(function LessonHeading(
  { level, children, ...rest },
  ref,
) {
  const Tag = level === 4 ? 'h4' : level === 3 ? 'h3' : 'h2';
  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  );
});
