import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Moves focus to an element after the next render, once any error text,
 * aria-invalid state or newly shown message is in the DOM, so a screen reader
 * reads the updated element rather than its previous state.
 */
export function useFocusRequest(): (target: RefObject<HTMLElement>) => void {
  const pending = useRef<RefObject<HTMLElement> | null>(null);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    target.current?.focus();
  }, [request]);

  return useCallback((target: RefObject<HTMLElement>) => {
    pending.current = target;
    setRequest((count) => count + 1);
  }, []);
}
