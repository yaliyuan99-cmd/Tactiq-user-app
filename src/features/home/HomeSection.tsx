import { type ReactNode } from 'react';
import { useReveal } from '@/lib/useReveal';
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
  const reveal = useReveal<HTMLDivElement>();
  const header = (
    <div ref={reveal.ref} data-reveal={reveal.state} className={layout === 'split' ? 'lg:sticky lg:top-8' : 'max-w-3xl'}>
      {eyebrow && <p className={cn(EYEBROW, 'text-lg')}>{eyebrow}</p>}
      <h2
        id={headingId}
        className={cn(
          'font-extrabold tracking-[-0.035em] text-balance',
          layout === 'split' ? 'text-4xl leading-[1.04] sm:text-5xl' : 'text-4xl leading-[1.02] sm:text-5xl lg:text-[3.75rem]',
          eyebrow && 'mt-2',
        )}
      >
        {heading}
      </h2>
      {lede && <div className={cn(LEDE, 'mt-4')}>{lede}</div>}
    </div>
  );

  return (
    <section id={id} aria-labelledby={headingId} className={cn(SECTION, className)}>
      {/* Each section is a new entry: a ruled line across the page. */}
      <div className={cn(SHELL, SECTION_INNER, 'border-t-2 border-foreground')}>
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
