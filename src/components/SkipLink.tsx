import { type MouseEvent } from 'react';

export interface SkipLinkProps {
  /** id of the element that should receive focus (usually the main landmark). */
  readonly targetId?: string;
  readonly label?: string;
}

/**
 * First focusable element on every page. Moves focus (not just scroll) to the
 * target, because client-side routers do not reliably do that for hash links.
 */
export function SkipLink({ targetId = 'main-content', label = 'Skip to main content' }: SkipLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
    if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
  };

  return (
    <a href={`#${targetId}`} className="skip-link" onClick={handleClick}>
      {label}
    </a>
  );
}
