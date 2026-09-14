/**
 * Focus management for client-side navigation.
 *
 * <RouteFocusProvider> sits once around the routes. <RouteFocus/> is rendered
 * by <RoutePage> right after each page, inside the page's Suspense boundary,
 * so its effect runs in the same commit as the page — after the lazy chunk has
 * loaded, the h1 exists and usePageTitle has set document.title. Redirects and
 * loading states never render it.
 *
 * - First page of the app load: nothing moves (the browser's own focus stays).
 * - Pathname changed: focus the location hash target if there is one,
 *   otherwise #page-title; then announce the page title politely.
 * - Only the hash changed: scroll to the target without moving focus.
 * - Only the search changed (filters, tabs): nothing.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { PAGE_TITLE_ID } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { hashTarget, pageTitleFromDocumentTitle } from './pageTitle';

interface RouteFocusContextValue {
  readonly pageShown: (pathname: string, hash: string) => void;
}

const RouteFocusContext = createContext<RouteFocusContextValue | null>(null);

interface ShownLocation {
  readonly pathname: string;
  readonly hash: string;
}

function scrollToElement(element: HTMLElement, behavior: ScrollBehavior): void {
  if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ behavior, block: 'start' });
}

export function RouteFocusProvider({ children }: { children: ReactNode }) {
  const { announce } = useFeedback();
  const { prefersReducedMotion } = usePreferences();
  const lastShown = useRef<ShownLocation | null>(null);
  const reducedMotion = useRef(prefersReducedMotion);

  useEffect(() => {
    reducedMotion.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  const pageShown = useCallback(
    (pathname: string, hash: string) => {
      const previous = lastShown.current;
      lastShown.current = { pathname, hash };
      if (previous === null) return;
      const behavior: ScrollBehavior = reducedMotion.current ? 'auto' : 'smooth';

      if (previous.pathname === pathname) {
        if (hash !== previous.hash) {
          const target = hashTarget(hash);
          if (target) scrollToElement(target, behavior);
        }
        return;
      }

      const target = hashTarget(hash);
      if (target) {
        // Same approach as SkipLink: make the section focusable so keyboard and
        // screen reader users continue from where the link pointed.
        if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        scrollToElement(target, behavior);
      } else {
        document.getElementById(PAGE_TITLE_ID)?.focus({ preventScroll: false });
      }
      const title = pageTitleFromDocumentTitle(document.title);
      if (title) announce(title);
    },
    [announce],
  );

  const value = useMemo<RouteFocusContextValue>(() => ({ pageShown }), [pageShown]);
  return <RouteFocusContext.Provider value={value}>{children}</RouteFocusContext.Provider>;
}

/** Marks "a page has rendered for this location". Render it after the page, inside its Suspense boundary. */
export function RouteFocus() {
  const context = useContext(RouteFocusContext);
  const { pathname, hash } = useLocation();
  useEffect(() => {
    context?.pageShown(pathname, hash);
  }, [context, pathname, hash]);
  return null;
}
