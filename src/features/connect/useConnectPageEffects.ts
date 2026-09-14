import { useEffect, useRef } from 'react';
import { useFeedback } from '@/services/feedback/FeedbackProvider';

/**
 * Announces `message` politely whenever `key` changes — never on the first
 * render, and not again while the key stays the same.
 */
export function useAnnounceOnChange(key: string, message: string): void {
  const { announce } = useFeedback();
  const previousKey = useRef(key);
  useEffect(() => {
    if (previousKey.current === key) return;
    previousKey.current = key;
    announce(message);
  }, [key, message, announce]);
}

/**
 * When `key` changes and the control that had focus has gone (the panel it
 * lived in was replaced), focus moves to the element `getTarget` returns, so
 * keyboard and screen reader users are not dropped at the top of the
 * document. Focus that is still on a live control is never moved.
 */
export function useRecoverFocusOnChange(key: string, getTarget: () => HTMLElement | null): void {
  const previousKey = useRef(key);
  const targetRef = useRef(getTarget);
  useEffect(() => {
    targetRef.current = getTarget;
  });
  useEffect(() => {
    if (previousKey.current === key) return;
    previousKey.current = key;
    const active = document.activeElement;
    if (active === null || active === document.body) targetRef.current()?.focus();
  }, [key]);
}
