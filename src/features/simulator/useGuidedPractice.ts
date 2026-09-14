/**
 * Guided practice state: the target, the feedback for the last attempt and
 * the session score. Results are judged against the target that was last
 * announced; after a correct answer that is already the next target, while
 * the screen keeps the finished one for a short pause.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommandToken, ShortcutMapping } from '@/domain/commands';
import type { ContactKey } from '@/domain/contacts';
import type { RingResult } from '@/features/practice/ringResults';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import {
  ADVANCE_DELAY_MS,
  EMPTY_SCORE,
  addToScore,
  correctAnnouncement,
  evaluateGuided,
  newTargetAnnouncement,
  pickGuidedTarget,
  promptAnnouncement,
  type GuidedEvaluation,
  type GuidedScore,
  type GuidedVerdict,
  type RandomSource,
} from './guided';

export interface GuidedFeedback {
  readonly verdict: GuidedVerdict;
  readonly message: string;
  /** Where a wrong attempt landed, for the map. */
  readonly detectedContact: ContactKey | null;
}

export interface GuidedResult {
  /** The target the result was judged against. */
  readonly target: CommandToken;
  readonly evaluation: GuidedEvaluation;
}

export interface GuidedPractice {
  /** The target on screen. */
  readonly target: CommandToken;
  /** True during the short pause after a correct answer, before the next target appears. */
  readonly advancing: boolean;
  readonly includeEmergency: boolean;
  readonly feedback: GuidedFeedback | null;
  readonly score: GuidedScore;
  readonly setIncludeEmergency: (include: boolean) => void;
  /** Announces the current target again (and speaks it when audio announcements are on). */
  readonly repeatPrompt: () => void;
  /** Replaces the target with a different one and announces it. */
  readonly skip: () => void;
  /** Judges one ring result, updates feedback and score, and announces what the guided words add. */
  readonly handleResult: (result: RingResult) => GuidedResult;
}

export interface UseGuidedPracticeOptions {
  readonly mapping: ShortcutMapping;
  readonly random?: RandomSource;
}

export function useGuidedPractice({ mapping, random = Math.random }: UseGuidedPracticeOptions): GuidedPractice {
  const { announce } = useFeedback();
  const [target, setTarget] = useState<CommandToken>(() => pickGuidedTarget(null, false, random));
  const [advancing, setAdvancing] = useState(false);
  const [includeEmergency, setIncludeEmergencyState] = useState(false);
  const [feedback, setFeedback] = useState<GuidedFeedback | null>(null);
  const [score, setScore] = useState<GuidedScore>(EMPTY_SCORE);

  /** The target attempts are judged against. Ahead of `target` during the pause. */
  const activeRef = useRef<CommandToken>(target);
  const includeRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ mapping, random, announce });

  useEffect(() => {
    latest.current = { mapping, random, announce };
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const showNewTarget = useCallback(
    (next: CommandToken) => {
      clearTimer();
      activeRef.current = next;
      setTarget(next);
      setAdvancing(false);
      setFeedback(null);
    },
    [clearTimer],
  );

  const repeatPrompt = useCallback(() => {
    latest.current.announce(promptAnnouncement(activeRef.current));
  }, []);

  const skip = useCallback(() => {
    const next = pickGuidedTarget(activeRef.current, includeRef.current, latest.current.random);
    showNewTarget(next);
    latest.current.announce(newTargetAnnouncement(next));
  }, [showNewTarget]);

  const setIncludeEmergency = useCallback(
    (include: boolean) => {
      includeRef.current = include;
      setIncludeEmergencyState(include);
      if (include || activeRef.current !== 'emergency') return;
      const next = pickGuidedTarget('emergency', false, latest.current.random);
      showNewTarget(next);
      latest.current.announce(`Emergency hold removed from the targets. ${newTargetAnnouncement(next)}`);
    },
    [showNewTarget],
  );

  const handleResult = useCallback(
    (result: RingResult): GuidedResult => {
      const current = activeRef.current;
      const { mapping: shortcuts, random: nextRandom, announce: say } = latest.current;
      const evaluation = evaluateGuided(current, result, shortcuts);
      setScore((previous) => addToScore(previous, evaluation.verdict));
      setFeedback({
        verdict: evaluation.verdict,
        message: evaluation.visibleMessage,
        detectedContact: evaluation.detectedContact,
      });

      if (evaluation.verdict === 'correct') {
        const next = pickGuidedTarget(current, includeRef.current, nextRandom);
        // Said in the same moment as the ring's own words, so it replaces them rather than following them.
        const announcement = correctAnnouncement(evaluation, next);
        if (announcement) say(announcement.message, { assertive: announcement.assertive });
        clearTimer();
        activeRef.current = next;
        setAdvancing(true);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setTarget(next);
          setAdvancing(false);
        }, ADVANCE_DELAY_MS);
      } else if (evaluation.announcement) {
        say(evaluation.announcement.message, { assertive: evaluation.announcement.assertive });
      }

      return { target: current, evaluation };
    },
    [clearTimer],
  );

  return {
    target,
    advancing,
    includeEmergency,
    feedback,
    score,
    setIncludeEmergency,
    repeatPrompt,
    skip,
    handleResult,
  };
}
