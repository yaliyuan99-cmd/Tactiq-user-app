import { useEffect, useRef, useState, type RefObject } from 'react';

/** The content width of an element, or null until it has been measured. */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T>, number | null] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[entries.length - 1]?.contentRect.width;
      if (typeof next === 'number' && next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
