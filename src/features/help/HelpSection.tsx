import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { getHelpSection, helpHeadingId, type HelpSectionId } from './helpSections';

export interface HelpSectionProps {
  readonly id: HelpSectionId;
  /** One or two plain sentences under the heading. */
  readonly lede?: ReactNode;
  readonly children: ReactNode;
  /** Draws the rule above the section. Off for the first section. */
  readonly divider?: boolean;
}

/**
 * One Help region, named by its h2. The section carries the public id other
 * screens link to; the heading can take focus so in-page links can move
 * keyboard and screen reader users straight to it.
 */
export function HelpSection({ id, lede, children, divider = true }: HelpSectionProps) {
  const headingId = helpHeadingId(id);
  return (
    <section id={id} aria-labelledby={headingId} className={cn('min-w-0', divider && 'border-t border-border pt-8')}>
      <h2 id={headingId} tabIndex={-1}>
        {getHelpSection(id).title}
      </h2>
      {lede && <p className="mt-2 max-w-prose text-muted-foreground">{lede}</p>}
      <div className="mt-6 grid min-w-0 gap-8">{children}</div>
    </section>
  );
}

export interface HelpSubsectionProps {
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/** An h3 group inside a section. */
export function HelpSubsection({ title, children, className }: HelpSubsectionProps) {
  return (
    <div className={cn('grid min-w-0 gap-3', className)}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
