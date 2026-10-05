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

function speechApi(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.speechSynthesis === 'undefined' || window.speechSynthesis === null) return null;
  if (typeof window.SpeechSynthesisUtterance !== 'function') return null;
  return window.speechSynthesis;
}

function detectSpeech(): boolean {
  return speechApi() !== null;
}

/** How many voices the browser lists, or null when it does not list any (nothing to go on). */
function voiceCount(synth: SpeechSynthesis): number | null {
  if (typeof synth.getVoices !== 'function') return null;
  try {
    return synth.getVoices().length;
  } catch {
    return null;
  }
}

/**
 * Voices load asynchronously — headless Chromium listed its first voice about
 * 1.2 s in — so an empty list is only acted on once the browser has had this
 * long. voiceschanged keeps the answer right either way, in both directions.
 */
export const VOICE_CHECK_MS = 2500;

/** Announced when the browser finishes speaking something the user asked to hear, and when it does not. */
export const SPEECH_FINISHED = 'The browser finished speaking.';
export const SPEECH_REFUSED = 'The browser did not speak this time.';

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
  const [canSpeak, setCanSpeak] = useState(detectSpeech);
  const [canVibrate] = useState(detectVibration);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<AnnouncementBatch>({ polite: null, assertive: null, spoken: null, cancel: null });
  const prefsRef = useRef(preferences);

  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  /*
   * A browser can offer the whole speech API and have no voice installed
   * (headless Chromium, many Linux builds, some Android WebViews). speak()
   * then produces silence, so "speech is available" has to mean a voice can
   * actually be used: the list is checked once it has loaded, and an empty one
   * turns speech off so the interface says so instead of offering a control
   * that does nothing. Browsers that do not list voices are left alone.
   */
  useEffect(() => {
    const synth = speechApi();
    // A browser that does not list its voices tells us nothing: speech stays on.
    if (!synth || voiceCount(synth) === null) return undefined;
    const update = () => setCanSpeak((voiceCount(synth) ?? 1) > 0);
    synth.addEventListener('voiceschanged', update);
    // An empty list usually means "not loaded yet", so it is only believed after a wait.
    const timer = voiceCount(synth) === 0 ? setTimeout(update, VOICE_CHECK_MS) : null;
    return () => {
      if (timer !== null) clearTimeout(timer);
      synth.removeEventListener('voiceschanged', update);
    };
  }, []);

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

  /**
   * Speaks one message. `onOutcome` is for speech the user asked for and must
   * be told about: it reports true once the browser has finished speaking and
   * false when speech failed or was never possible. Our own cancellations are
   * not failures, so they report nothing.
   */
  const utter = useCallback(
    (text: string, interrupt: boolean, onOutcome?: (spoken: boolean) => void) => {
      if (!text) return;
      if (!canSpeak) {
        onOutcome?.(false);
        return;
      }
      try {
        const synth = window.speechSynthesis;
        if (interrupt) synth.cancel();
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = SPEECH_RATE;
        const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';
        if (lang) utterance.lang = lang;
        if (onOutcome) {
          utterance.onend = () => onOutcome(true);
          utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            if (event.error === 'canceled' || event.error === 'interrupted') return;
            onOutcome(false);
          };
        }
        synth.speak(utterance);
      } catch {
        onOutcome?.(false);
      }
    },
    [canSpeak],
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

  /**
   * Speech the user asked to hear. Whether it worked is announced in words, so
   * someone who cannot hear the voice — or whose browser has none — is not left
   * guessing at a control that appears to do nothing. With audio announcements
   * off nothing is attempted: the interface says that is why.
   */
  const speak = useCallback(
    (text: string) => {
      if (!prefsRef.current.audioAnnouncements) return;
      utter(text, true, (spoken) => announce(spoken ? SPEECH_FINISHED : SPEECH_REFUSED));
    },
    [announce, utter],
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
