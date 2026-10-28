import { type ReactNode } from 'react';
import { type HomeSectionId } from '@/app/publicRoutes';
import { cn } from '@/lib/cn';
import { EYEBROW, LEDE, SECTION, SECTION_INNER, SHELL } from './homeStyles';

export interface HomeSectionProps {
  readonly id: HomeSectionId;
  readonly eyebrow?: string;
  readonly heading: string;
  readonly lede?: ReactNode;
  /**
   * 'stacked' runs the heading across the top. 'split' moves it into a narrow
   * left column from `lg` up, so the page does not repeat one rhythm.
   */
  readonly layout?: 'stacked' | 'split';
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * One band of the homepage: a quiet rule, the centred shell, a named landmark
 * and a single h2. The page's only h1 is the hero headline.
 */
export function HomeSection({
  id,
  eyebrow,
  heading,
  lede,
  layout = 'stacked',
  children,
  className,
}: HomeSectionProps) {
  const headingId = `${id}-heading`;
  const header = (
    <div className={layout === 'split' ? 'lg:sticky lg:top-8' : 'max-w-3xl'}>
      {eyebrow && <p className={EYEBROW}>{eyebrow}</p>}
      <h2 id={headingId} className={cn('text-2xl sm:text-3xl', eyebrow && 'mt-3')}>
        {heading}
      </h2>
      {lede && <div className={cn(LEDE, 'mt-4')}>{lede}</div>}
    </div>
  );

  return (
    <section id={id} aria-labelledby={headingId} className={cn(SECTION, className)}>
      <div className={cn(SHELL, SECTION_INNER)}>
        {layout === 'split' ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
            {header}
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          <>
            {header}
            {children}
          </>
        )}
      </div>
    </section>
  );
}
