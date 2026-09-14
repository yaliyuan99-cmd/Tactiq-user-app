import { type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { helpRoute } from '@/app/routes';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { revealHelpTarget, scrollToId } from './revealTarget';

export interface InPageLinkProps {
  /** A Help section id or a troubleshooting answer id. */
  readonly targetId: string;
  readonly children: ReactNode;
  readonly className?: string;
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * A link to somewhere on the Help page, addressed with helpRoute so the URL
 * can be shared. A plain click opens a collapsed answer, moves focus to the
 * target's heading or summary, and scrolls there (instantly with reduced
 * motion). The router updates the address with history.pushState rather than
 * a browser fragment jump, which would otherwise drop focus back to the page.
 */
export function InPageLink({ targetId, children, className }: InPageLinkProps) {
  const { prefersReducedMotion } = usePreferences();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainClick(event)) return;
    if (revealHelpTarget(targetId)) scrollToId(targetId, prefersReducedMotion ? 'auto' : 'smooth');
  };
  return (
    <Link to={helpRoute(targetId)} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
