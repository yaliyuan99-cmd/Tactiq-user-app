/**
 * In-page navigation helpers for the Help page: open a collapsed answer, move
 * keyboard focus to where a link pointed, and scroll there. InPageLink uses
 * them on click; useHelpHashTarget uses them for the address hash.
 */
import { helpHeadingId, isHelpSectionId } from './helpSections';

/**
 * Opens the target if it is a details element and focuses its summary, or
 * focuses the heading of a Help section. Does not scroll. Returns the element
 * that received focus, or null when the id is not on the page.
 */
export function revealHelpTarget(id: string, root: Document = document): HTMLElement | null {
  const target = root.getElementById(id);
  if (!target) return null;

  let focusTarget: HTMLElement | null = null;
  if (target instanceof HTMLDetailsElement) {
    target.open = true;
    focusTarget = target.querySelector('summary');
  } else if (isHelpSectionId(id)) {
    focusTarget = root.getElementById(helpHeadingId(id));
  }
  if (!focusTarget) {
    focusTarget = target;
    if (!focusTarget.hasAttribute('tabindex') && focusTarget.tabIndex < 0) focusTarget.setAttribute('tabindex', '-1');
  }
  focusTarget.focus({ preventScroll: true });
  return focusTarget;
}

/** Opens a troubleshooting answer the address points at, without moving focus. */
export function openDetailsById(id: string, root: Document = document): boolean {
  const target = root.getElementById(id);
  if (!(target instanceof HTMLDetailsElement)) return false;
  target.open = true;
  return true;
}

export function scrollToId(id: string, behavior: ScrollBehavior, root: Document = document): boolean {
  const target = root.getElementById(id);
  if (!target || typeof target.scrollIntoView !== 'function') return false;
  target.scrollIntoView({ block: 'start', behavior });
  return true;
}
