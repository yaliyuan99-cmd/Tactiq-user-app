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

/**
 * Animation frames do not run in hidden or background tabs, so a timeout of
 * this many milliseconds writes the announcement if no frame has come first.
 */
export const ANNOUNCE_FALLBACK_MS = 50;

type Politeness = 'polite' | 'assertive';

/** Runs the callback once, on the next animation frame or after the fallback timeout, whichever fires first. */
function scheduleSoon(callback: () => void): () => void {
  let done = false;
  let frameId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    done = true;
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    if (timeoutId !== null) clearTimeout(timeoutId);
    frameId = null;
    timeoutId = null;
  };
  const fire = () => {
    if (done) return;
    cancel();
    callback();
  };
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function' &&
    typeof window.cancelAnimationFrame === 'function'
  ) {
    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      fire();
    });
  }
  timeoutId = setTimeout(() => {
    timeoutId = null;
    fire();
  }, ANNOUNCE_FALLBACK_MS);
  return cancel;
}

interface PendingMessage {
  text: string;
  /** Set for feedback(): a later feedback of the same kind in the same batch replaces this one. */
  readonly kind: FeedbackKind | null;
}

/** Everything announced before the next write. One write per region, however many callers announced. */
interface AnnouncementBatch {
  polite: PendingMessage[] | null;
  assertive: PendingMessage[] | null;
  /** Messages already spoken in this batch: the first interrupts earlier speech, later ones queue behind it. */
  spoken: Set<string> | null;
  cancel: (() => void) | null;
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
  const batchRef = useRef<AnnouncementBatch>({ polite: null, assertive: null, spoken: null, cancel: null });
  const prefsRef = useRef(preferences);

  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    const batch = batchRef.current;
    return () => {
      batch.cancel?.();
      batch.cancel = null;
      batch.polite = null;
      batch.assertive = null;
      batch.spoken = null;
      if (detectSpeech()) window.speechSynthesis.cancel();
    };
  }, []);

  const utter = useCallback(
    (text: string, interrupt: boolean) => {
      if (!canSpeak || !text) return;
      try {
        const synth = window.speechSynthesis;
        if (interrupt) synth.cancel();
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = SPEECH_RATE;
        const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';
        if (lang) utterance.lang = lang;
        synth.speak(utterance);
      } catch {}
    },
    [canSpeak],
  );

  const speak = useCallback(
    (text: string) => {
      if (prefsRef.current.audioAnnouncements) utter(text, true);
    },
    [utter],
  );

  const stopSpeaking = useCallback(() => {
    if (!canSpeak) return;
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }, [canSpeak]);

  /**
   * Queues a message for its live region. Everything queued before the next
   * animation frame (or the fallback timeout) is written once, in order,
   * separated by spaces, so two callers announcing together are both heard (a
   * page's own message and the route title, say). Exact repeats are dropped.
   * The one exception is feedback of the same kind: a feature that rewords a
   * ring outcome (a lesson's "Correct. Confirm, on the index fingertip." for
   * the ring's "Confirm.") sends it with the same kind in the same tick, and
   * it replaces the earlier words rather than being read after them.
   */
  const enqueue = useCallback(
    (message: string, assertive: boolean, forceSpeech: boolean, kind: FeedbackKind | null) => {
      const which: Politeness = assertive ? 'assertive' : 'polite';
      const batch = batchRef.current;
      const regionFor = (politeness: Politeness) =>
        politeness === 'assertive' ? assertiveRef.current : politeRef.current;

      if (!batch.cancel) {
        batch.cancel = scheduleSoon(() => {
          const pending = { polite: batch.polite, assertive: batch.assertive };
          batch.cancel = null;
          batch.polite = null;
          batch.assertive = null;
          batch.spoken = null;
          for (const politeness of ['polite', 'assertive'] as const) {
            const messages = pending[politeness];
            const region = regionFor(politeness);
            if (messages && region) region.textContent = [...new Set(messages.map((m) => m.text))].join(' ');
          }
        });
      }

      let pending = batch[which];
      if (!pending) {
        // Clear now and write once the batch runs, so an identical message is announced again.
        pending = [];
        batch[which] = pending;
        const region = regionFor(which);
        if (region) region.textContent = '';
      }

      if (message.trim() === '') return;
      const superseded = kind === null ? undefined : pending.find((m) => m.kind === kind);
      const replacedText = superseded?.text;
      if (superseded) superseded.text = message;
      else if (!pending.some((m) => m.text === message)) pending.push({ text: message, kind });

      if (!forceSpeech && !prefsRef.current.audioAnnouncements) return;
      // Each message is spoken once; the merged text is never spoken. The first message of a batch
      // interrupts earlier speech and later ones queue behind it, unless they replace words just spoken.
      if (!batch.spoken || (replacedText !== undefined && batch.spoken.has(replacedText))) {
        batch.spoken = new Set([message]);
        utter(message, true);
      } else if (!batch.spoken.has(message)) {
        batch.spoken.add(message);
        utter(message, false);
      }
    },
    [utter],
  );

  const announce = useCallback(
    (message: string, options?: AnnounceOptions) =>
      enqueue(message, options?.assertive === true, options?.forceSpeech === true, null),
    [enqueue],
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
      enqueue(message, ASSERTIVE_KINDS.has(kind), false, kind);
      vibrate(VIBRATION_PATTERNS[kind]);
    },
    [enqueue, vibrate],
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
