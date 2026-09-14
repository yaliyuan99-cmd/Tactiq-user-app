/**
 * Plumbing for modal dialogs, implemented by hand because jsdom (and some
 * older browsers) lack <dialog>.showModal(): a stack so only the top dialog
 * reacts to keys, a scroll lock, and hiding the rest of the page from
 * assistive technology while a dialog is open.
 */

/** Elements marked with this attribute stay exposed while a dialog is open (e.g. live regions). */
export const KEEP_EXPOSED_ATTRIBUTE = 'data-live-announcer';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',');

/** Tabbable descendants in DOM order. Visibility is not checked (jsdom has no layout). */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.tabIndex >= 0 && !el.closest('[inert]') && !el.closest('[hidden]'),
  );
}

const dialogStack: symbol[] = [];

export function pushDialog(): symbol {
  const token = Symbol('dialog');
  dialogStack.push(token);
  return token;
}

export function popDialog(token: symbol): void {
  const index = dialogStack.lastIndexOf(token);
  if (index >= 0) dialogStack.splice(index, 1);
}

export function isTopDialog(token: symbol): boolean {
  return dialogStack[dialogStack.length - 1] === token;
}

let scrollLocks = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/** Locks background scrolling. Returns the unlock function; nested locks are counted. */
export function lockScroll(): () => void {
  const body = document.body;
  if (scrollLocks === 0) {
    savedOverflow = body.style.overflow;
    savedPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) {
      body.style.overflow = savedOverflow;
      body.style.paddingRight = savedPaddingRight;
    }
  };
}

/**
 * Hides every other top-level element from assistive technology (aria-hidden,
 * plus inert where supported). Only elements this call changed are restored.
 */
export function hideOthers(keep: HTMLElement): () => void {
  const supportsInert = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;
  const changed: Array<{ el: HTMLElement; inert: boolean }> = [];
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child === keep || child.contains(keep)) continue;
    if (child.hasAttribute(KEEP_EXPOSED_ATTRIBUTE)) continue;
    if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'TEMPLATE') continue;
    if (child.getAttribute('aria-hidden') === 'true') continue;
    child.setAttribute('aria-hidden', 'true');
    let inertSet = false;
    if (supportsInert && !child.inert) {
      child.inert = true;
      inertSet = true;
    }
    changed.push({ el: child, inert: inertSet });
  }
  return () => {
    for (const { el, inert } of changed) {
      el.removeAttribute('aria-hidden');
      if (inert) el.inert = false;
    }
  };
}
