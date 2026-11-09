import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly as?: 'section' | 'div' | 'article';
  readonly heading?: ReactNode;
  readonly headingLevel?: 2 | 3;
  readonly eyebrow?: string;
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
}

/** The standard surface: off-white card, 1px border, rounded-lg. */
export function Card({
  as: Tag = 'section',
  heading,
  headingLevel = 2,
  eyebrow,
  actions,
  className,
  children,
  ...rest
}: CardProps) {
  const headingId = useId();
  const hasHeading = heading !== undefined && heading !== null && heading !== false;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const showHeader = hasHeading || Boolean(eyebrow) || Boolean(actions);

  return (
    <Tag
      className={cn('relative rounded-lg border-[1.5px] border-foreground bg-card p-5 text-card-foreground shadow-card sm:p-6', className)}
      aria-labelledby={hasHeading ? headingId : undefined}
      {...rest}
    >
      {showHeader && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {eyebrow && <p className="font-mono-label mb-1 text-muted-foreground">{eyebrow}</p>}
            {hasHeading && (
              <Heading id={headingId} className={headingLevel === 3 ? 'text-lg' : undefined}>
                {heading}
              </Heading>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
