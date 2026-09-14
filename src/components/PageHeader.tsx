import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const PAGE_TITLE_ID = 'page-title';

export interface PageHeaderProps {
  readonly eyebrow?: string;
  readonly title: ReactNode;
  readonly lede?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}

/**
 * The page's single h1. It carries id "page-title" and tabIndex -1 so the app
 * shell can move focus to it after a route change.
 */
export function PageHeader({ eyebrow, title, lede, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-8', className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="font-mono-label mb-2 text-muted-foreground">{eyebrow}</p>}
        <h1 id={PAGE_TITLE_ID} tabIndex={-1}>
          {title}
        </h1>
        {lede && <div className="mt-3 text-lg text-muted-foreground">{lede}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
