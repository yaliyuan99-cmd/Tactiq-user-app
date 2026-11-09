import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Braille } from './Braille';

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
    <header className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-2 sm:mb-10 sm:pt-4', className)}>
      <div className="min-w-0 max-w-3xl">
        {/* The title in braille, as a margin mark. Decorative: the print below is the title. */}
        {typeof title === 'string' && <Braille text={title} dot={2.6} className="mb-4 text-foreground/70" />}
        {eyebrow && <p className="biro mb-2">{eyebrow}</p>}
        <h1 id={PAGE_TITLE_ID} tabIndex={-1}>
          <span className="marker-under">{title}</span>
        </h1>
        {lede && <div className="mt-3 text-xl leading-snug text-muted-foreground text-pretty">{lede}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
