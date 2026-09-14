import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { VIBRATION_PATTERNS, type AnnounceOptions, type FeedbackContextValue, type FeedbackKind } from './types';

/**
 * Kept in sync with KEEP_EXPOSED_ATTRIBUTE in src/components/modal.ts: modal
 * dialogs hide the rest of the page from assistive technology but must leave
 * the live regions exposed, or announcements would go silent while a dialog is open.
 */
const LIVE_REGION_ATTRIBUTE = 'data-live-announcer';

const ASSERTIVE_KINDS: ReadonlySet<FeedbackKind> = new Set<FeedbackKind>(['emergency', 'emergency_arming', 'reject']);

export const SPEECH_RATE = 1.05;

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function detectSpeech(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    window.speechSynthesis !== null &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

function detectVibration(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function scheduleFrame(callback: () => void): () => void {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame(id);
  }
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
}

/**
 * Turns ring events into what the user perceives: a live-region announcement
 * (always), speech (when audio announcements are on) and vibration (when
 * haptic feedback is on and the browser supports it).
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const [canSpeak] = useState(detectSpeech);
  const [canVibrate] = useState(detectVibration);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<{ polite: (() => void) | null; assertive: (() => void) | null }>({
    polite: null,
    assertive: null,
  });
  const prefsRef = useRef(preferences);

  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      pending.polite?.();
      pending.assertive?.();
      if (detectSpeech()) window.speechSynthesis.cancel();
    };
  }, []);

  const speakNow = useCallback(
    (text: string, force: boolean) => {
      if (!canSpeak || !text) return;
      if (!force && !prefsRef.current.audioAnnouncements) return;
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = SPEECH_RATE;
        const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';
        if (lang) utterance.lang = lang;
        synth.speak(utterance);
      } catch {}
    },
    [canSpeak],
  );

  const speak = useCallback((text: string) => speakNow(text, false), [speakNow]);

  const stopSpeaking = useCallback(() => {
    if (!canSpeak) return;
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }, [canSpeak]);

  const announce = useCallback(
    (message: string, options?: AnnounceOptions) => {
      const which = options?.assertive ? 'assertive' : 'polite';
      const region = which === 'assertive' ? assertiveRef.current : politeRef.current;
      if (region) {
        // Clear first, then set on the next frame, so an identical message is announced again.
        pendingRef.current[which]?.();
        region.textContent = '';
        pendingRef.current[which] = scheduleFrame(() => {
          pendingRef.current[which] = null;
          region.textContent = message;
        });
      }
      speakNow(message, options?.forceSpeech === true);
    },
    [speakNow],
  );

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!canVibrate || !prefsRef.current.hapticFeedback) return false;
      if (Array.isArray(pattern) ? pattern.length === 0 : pattern <= 0) return false;
      try {
        return navigator.vibrate(pattern);
      } catch {
        return false;
      }
    },
    [canVibrate],
  );

  const feedback = useCallback(
    (kind: FeedbackKind, message: string) => {
      announce(message, { assertive: ASSERTIVE_KINDS.has(kind) });
      vibrate(VIBRATION_PATTERNS[kind]);
    },
    [announce, vibrate],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({ announce, feedback, speak, stopSpeaking, vibrate, canSpeak, canVibrate }),
    [announce, feedback, speak, stopSpeaking, vibrate, canSpeak, canVibrate],
  );

  const regions = (
    <div {...{ [LIVE_REGION_ATTRIBUTE]: '' }} className="sr-only">
      <div ref={politeRef} role="status" aria-live="polite" aria-atomic="true" data-testid="live-region-polite" />
      <div ref={assertiveRef} role="alert" aria-live="assertive" aria-atomic="true" data-testid="live-region-assertive" />
    </div>
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' ? createPortal(regions, document.body) : regions}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}
