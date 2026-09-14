/**
 * How the calibration page speaks. The page announces everything itself
 * (useRing runs with `announce: false`), so each tap produces exactly one
 * message.
 *
 * "Read prompts aloud" decides speech for this page:
 * - on: every message is spoken with the browser's voice, even when Audio
 *   announcements is off in Settings. Spoken messages also carry the next
 *   prompt, which screen-reader users hear from the focused heading instead.
 * - off: messages go to the live region only. If Audio announcements is on
 *   in Settings, the speech it would start is stopped straight away, so the
 *   switch means what it says.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { VIBRATION_PATTERNS, type FeedbackKind } from '@/services/feedback/types';
import { usePreferences } from '@/services/preferences/PreferencesProvider';

export interface CalibrationMessage {
  /** Announced in the live region (and spoken when reading aloud, unless `spoken` is given). */
  readonly text: string;
  /** Spoken instead of `text` when reading aloud, usually `text` plus the next prompt. */
  readonly spoken?: string;
  /** Interrupts the screen reader. Only for rejected taps and emergency-hold messages. */
  readonly assertive?: boolean;
  /** Vibrates with the pattern that stands in for this ring haptic, when haptic feedback is on. */
  readonly haptic?: FeedbackKind;
}

export type Say = (message: CalibrationMessage) => void;

export function useCalibrationVoice(readAloud: boolean): Say {
  const { announce, stopSpeaking, vibrate } = useFeedback();
  const { preferences } = usePreferences();
  const latest = useRef({ readAloud, audioAnnouncements: preferences.audioAnnouncements });

  useEffect(() => {
    latest.current = { readAloud, audioAnnouncements: preferences.audioAnnouncements };
  }, [readAloud, preferences.audioAnnouncements]);

  return useCallback<Say>(
    ({ text, spoken, assertive = false, haptic }) => {
      const { readAloud: aloud, audioAnnouncements } = latest.current;
      if (aloud) {
        announce(spoken ?? text, { assertive, forceSpeech: true });
      } else {
        announce(text, { assertive });
        if (audioAnnouncements) stopSpeaking();
      }
      if (haptic) vibrate(VIBRATION_PATTERNS[haptic]);
    },
    [announce, stopSpeaking, vibrate],
  );
}
