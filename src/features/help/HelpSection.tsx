import { type ReactNode } from 'react';
import { ArrowUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getHelpSection, HELP_CONTENTS_ID, helpHeadingId, type HelpSectionId } from './helpSections';
import { InPageLink } from './InPageLink';
import { SECTION_DISCLOSURE_ATTR } from './revealTarget';

export interface HelpSectionProps {
  readonly id: HelpSectionId;
  /** One or two plain sentences under the heading. */
  readonly lede?: ReactNode;
  readonly children: ReactNode;
  /** Draws the rule above the section. Off for the first section. */
  readonly divider?: boolean;
  /**
   * Keeps the body in a closed disclosure the reader opens, the same pattern
   * Troubleshooting uses. For the long reference sections, which otherwise make
   * the page about sixteen phone screens of continuous prose.
   */
  readonly collapsible?: boolean;
}

const SUMMARY_CLASSES =
  'target-44 flex cursor-pointer list-none items-center rounded-md hover:bg-secondary [&::-webkit-details-marker]:hidden';

/** A link back to the contents card, so a reader who jumped in can get out again. */
function BackToContents() {
  return (
    <p>
      <InPageLink
        targetId={HELP_CONTENTS_ID}
        className="target-44 inline-flex items-center gap-1.5 font-medium text-primary-strong underline"
      >
        <ArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" />
        Back to contents
      </InPageLink>
    </p>
  );
}

/**
 * One Help region, named by its h2. The section carries the public id other
 * screens link to; the heading can take focus so in-page links can move
 * keyboard and screen reader users straight to it.
 *
 * A collapsible section keeps its h2 inside the <summary> (the one non-phrasing
 * element a summary may hold), so the heading stays a heading in the outline and
 * the contents list, and openSectionDisclosure can open the section when a link
 * or an address hash points into it.
 */
export function HelpSection({ id, lede, children, divider = true, collapsible = false }: HelpSectionProps) {
  const headingId = helpHeadingId(id);
  const { title } = getHelpSection(id);
  const body = (
    <>
      {children}
      <BackToContents />
    </>
  );
  // In a collapsible section the lede belongs with the body, under the summary;
  // in an open one it sits tight under the heading as before.
  const collapsedLede = lede && <p className="max-w-prose text-muted-foreground">{lede}</p>;

  if (collapsible) {
    return (
      <section id={id} aria-labelledby={headingId} className={cn('min-w-0', divider && 'border-t border-border pt-8')}>
        <details {...{ [SECTION_DISCLOSURE_ATTR]: true }} className="group">
          <summary className={SUMMARY_CLASSES}>
            <h2 id={headingId} tabIndex={-1} className="flex w-full items-center justify-between gap-4">
              <span className="min-w-0">{title}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
            </h2>
          </summary>
          <div className="mt-6 grid min-w-0 gap-8">
            {collapsedLede}
            {body}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section id={id} aria-labelledby={headingId} className={cn('min-w-0', divider && 'border-t border-border pt-8')}>
      <h2 id={headingId} tabIndex={-1}>
        {title}
      </h2>
      {lede && <p className="mt-2 max-w-prose text-muted-foreground">{lede}</p>}
      <div className="mt-6 grid min-w-0 gap-8">{body}</div>
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
