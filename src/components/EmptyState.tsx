import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { renderIcon, type IconInput } from './iconSlot';

export interface EmptyStateProps {
  readonly icon?: IconInput;
  readonly title: string;
  readonly body: ReactNode;
  readonly action?: ReactNode;
  readonly headingLevel?: 2 | 3 | 4;
  readonly className?: string;
}

export function EmptyState({ icon, title, body, action, headingLevel = 2, className }: EmptyStateProps) {
  const Heading = headingLevel === 4 ? 'h4' : headingLevel === 3 ? 'h3' : 'h2';
  const renderedIcon = renderIcon(icon, 'h-5 w-5');
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-dashed border-border-strong px-5 py-8 text-center sm:px-8',
        className,
      )}
    >
      {renderedIcon && (
        <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          {renderedIcon}
        </span>
      )}
      <Heading className={headingLevel === 2 ? 'text-lg' : undefined}>{title}</Heading>
      <div className="mt-2 max-w-prose text-muted-foreground">{body}</div>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
