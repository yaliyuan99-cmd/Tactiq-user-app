import { useEffect, useRef, useState, type RefObject } from 'react';

export type RevealState = 'waiting' | 'shown';

/**
 * 'waiting' until the element first comes into view, then 'shown' for good.
 * Pair it with `data-reveal` (see theme.css), which only moves the element:
 * it is never hidden, so a page that never scrolls, or never runs this, is
 * still complete. Without IntersectionObserver it starts shown.
 */
export function useReveal<T extends Element>(): { ref: RefObject<T>; state: RevealState } {
  const ref = useRef<T>(null);
  const [state, setState] = useState<RevealState>(() =>
    typeof IntersectionObserver === 'function' ? 'waiting' : 'shown',
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || state === 'shown' || typeof IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('shown');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [state]);

  return { ref, state };
}
