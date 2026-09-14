/**
 * The practice surface can show the contact points as the hand drawing or as
 * a list. The last choice is remembered for this browser tab only.
 */
import type { ContactKey } from '@/domain/contacts';
import type { RingResult } from './ringResults';

export type PracticeView = 'hand' | 'list';

export const PRACTICE_VIEW_STORAGE_KEY = 'tactiq.practiceView';
export const DEFAULT_PRACTICE_VIEW: PracticeView = 'hand';

export function isPracticeView(value: unknown): value is PracticeView {
  return value === 'hand' || value === 'list';
}

/**
 * Below this width the hand drawing is too narrow for its 44 px points to sit apart, so the list is the
 * better first view. A stored choice always wins.
 */
export const NARROW_VIEWPORT_QUERY = '(max-width: 479px)';

/** The remembered view, or null when nothing (or nothing valid) is stored or storage is blocked. */
export function readStoredPracticeView(): PracticeView | null {
  try {
    const stored = window.sessionStorage.getItem(PRACTICE_VIEW_STORAGE_KEY);
    return isPracticeView(stored) ? stored : null;
  } catch {
    return null;
  }
}

function isNarrowViewport(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
  } catch {
    return false;
  }
}

/** The view to start with: the remembered one, else the list on a narrow screen, else the hand drawing. */
export function initialPracticeView(): PracticeView {
  return readStoredPracticeView() ?? (isNarrowViewport() ? 'list' : DEFAULT_PRACTICE_VIEW);
}

export function storePracticeView(view: PracticeView): void {
  try {
    window.sessionStorage.setItem(PRACTICE_VIEW_STORAGE_KEY, view);
  } catch {}
}

/** The contact a result was detected on, if any (a press on a closed window still names its contact). */
export function resultContact(result: RingResult | null): ContactKey | null {
  return result ? result.contact : null;
}
