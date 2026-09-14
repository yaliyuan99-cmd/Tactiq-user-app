/**
 * The calibration page's controller: which screen is showing, the run in
 * progress, what each ring result means for the prompted point, and every
 * announcement. Rules live in calibrationFlow.ts, words in
 * calibrationWording.ts, ring logic in the practice core.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import type { CalibrationProfile } from '@/domain/models';
import {
  describeRingResult,
  evidenceForDevice,
  useRecordResult,
  useRing,
  useShortcutLabels,
  type RingResult,
} from '@/features/practice';
import { useDevice } from '@/services/device/DeviceProvider';
import type { FeedbackKind } from '@/services/feedback/types';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { useCalibration } from '@/services/ServicesProvider';
import {
  acceptedFor,
  attemptFromResult,
  missesInRun,
  nextPrompt,
  requiredPerPoint,
  resumability,
  runForRemaining,
  type CalibrationRun,
} from './calibrationFlow';
import {
  SQUEEZE_FIRST_MESSAGE,
  afterSampleAnnouncement,
  numberWord,
  progressText,
  promptSentence,
  repeatPromptMessage,
  resultsAnnouncement,
  sampleFeedback,
} from './calibrationWording';
import type { CalibrationPhase, CalibrationSession, FeedbackLine } from './calibrationSessionTypes';
import { useCalibrationVoice } from './useCalibrationVoice';
import { useRunRingUpkeep } from './useRunRingUpkeep';

const ASSERTIVE_KINDS: ReadonlySet<FeedbackKind> = new Set<FeedbackKind>(['reject', 'emergency', 'emergency_arming']);

interface LiveSession {
  phase: CalibrationPhase;
  run: CalibrationRun | null;
  closeWindow: () => void;
}

export function useCalibrationSession(): CalibrationSession {
  const calibration = useCalibration();
  const { preferences } = usePreferences();
  const { state: deviceState } = useDevice();
  const record = useRecordResult();
  const { mapping } = useShortcutLabels();
  const navigate = useNavigate();

  const [readAloud, setReadAloud] = useState(preferences.audioAnnouncements);
  const say = useCalibrationVoice(readAloud);
  const [phase, setPhase] = useState<CalibrationPhase>('start');
  const [run, setRun] = useState<CalibrationRun | null>(null);
  const [feedback, setFeedback] = useState<FeedbackLine | null>(null);
  const [returnedToStart, setReturnedToStart] = useState(false);
  // Ring events arrive outside React renders, so the handlers read the current phase and run from here.
  const live = useRef<LiveSession>({ phase: 'start', run: null, closeWindow: () => undefined });

  // Silent: this page announces every result itself, in calibration words, exactly once.
  const ring = useRing({ announce: false, onResult: (result) => handleResult(result), onGate: (armed) => handleGate(armed) });
  useRunRingUpkeep(phase === 'running', ring, say);

  const profile = calibration.get();
  const hand = preferences.hand;
  const prompt = phase === 'running' && profile && run ? nextPrompt(profile, run) : null;
  const resumable = resumability(profile, { hand, evidence: ring.isDemo ? 'simulated' : 'measured' });

  function enter(nextPhase: CalibrationPhase, nextRun: CalibrationRun | null): void {
    live.current.phase = nextPhase;
    live.current.run = nextRun;
    setPhase(nextPhase);
    setRun(nextRun);
  }

  /** In Demo Mode the page opens the command window for the user. Safe while a ring event is being delivered: the squeeze is scheduled, not immediate. */
  function openWindowForUser(): void {
    if (ring.isDemo) ring.squeeze();
  }

  function finishRun(lastFeedback: string | null, haptic?: FeedbackKind): void {
    const done = calibration.complete();
    enter('results', live.current.run);
    say({ ...resultsAnnouncement(done, lastFeedback), haptic });
  }

  function handleResult(result: RingResult): void {
    const currentRun = live.current.run;
    const current = calibration.get();
    if (live.current.phase !== 'running' || !currentRun || !current) return;
    const target = nextPrompt(current, currentRun);
    if (!target) return;
    record(result, { source: 'calibration', mode: 'calibration', targetContact: target });

    const attempt = attemptFromResult(result);
    if (attempt.kind === 'squeeze_first') {
      setFeedback({ text: SQUEEZE_FIRST_MESSAGE, tone: 'retry' });
      say({ text: SQUEEZE_FIRST_MESSAGE, assertive: true, haptic: 'reject' });
      openWindowForUser();
      return;
    }
    if (attempt.kind === 'ring_message') {
      const description = describeRingResult(result, mapping);
      setFeedback({ text: description.visibleMessage, tone: 'info' });
      say({ text: description.message, assertive: ASSERTIVE_KINDS.has(description.feedbackKind), haptic: description.feedbackKind });
      openWindowForUser();
      return;
    }

    const outcome = calibration.recordSample({
      contact: target,
      detectedContact: attempt.detectedContact,
      durationMs: attempt.durationMs,
    });
    const words = sampleFeedback({
      prompt: target,
      detectedContact: attempt.detectedContact,
      accepted: outcome.accepted,
      reason: outcome.reason,
      acceptedCount: acceptedFor(outcome.profile, target),
      required: requiredPerPoint(outcome.profile),
      misses: missesInRun(outcome.profile, currentRun, target),
      emergencyCancelled: attempt.emergencyCancelled,
    });
    const haptic: FeedbackKind = outcome.accepted ? 'confirm' : 'reject';
    setFeedback({ text: words.message, tone: words.tone });

    const next = nextPrompt(outcome.profile, currentRun);
    if (next === null) {
      finishRun(words.message, haptic);
      return;
    }
    // A rejected tap interrupts, unless the prompt moved on: that would cut off the new heading being read.
    say({ ...afterSampleAnnouncement(words, target, next), assertive: !outcome.accepted && next === target, haptic });
    openWindowForUser();
  }

  function handleGate(armed: boolean): void {
    if (live.current.phase !== 'running') return;
    if (ring.isDemo) {
      // No time limit on calibration: the window reopens whenever it closes.
      if (!armed) ring.squeeze();
      return;
    }
    // The bench ring keeps its own window length, so no seconds are claimed here.
    say({ text: armed ? 'Command window open.' : 'Command window closed.' });
  }

  function beginRun(target: CalibrationProfile, opening: string): void {
    const nextRun = runForRemaining(target);
    const first = nextPrompt(target, nextRun);
    setFeedback(null);
    setReturnedToStart(false);
    live.current.run = nextRun;
    if (!first) {
      finishRun(null);
      return;
    }
    enter('running', nextRun);
    say({ text: opening, spoken: `${opening} ${promptSentence(first)}` });
    openWindowForUser();
  }

  const start = () => {
    const deviceId = deviceState.mode === 'hardware' ? (deviceState.device?.id ?? null) : null;
    beginRun(calibration.start({ hand, evidence: evidenceForDevice(deviceState), deviceId }), 'Calibration started.');
  };

  const resume = () => {
    const current = calibration.get();
    if (current) beginRun(current, 'Calibration resumed.');
  };

  const repeatPoints = () => {
    const current = calibration.get();
    if (!current) return;
    const count = runForRemaining(current).points.length;
    beginRun(current, `Repeating ${count === 1 ? 'one point' : `${numberWord(count)} points`}.`);
  };

  const repeatPrompt = () => {
    const current = calibration.get();
    const currentRun = live.current.run;
    const point = current && currentRun ? nextPrompt(current, currentRun) : null;
    if (!current || !point) return;
    say({ text: repeatPromptMessage(current, point) });
    openWindowForUser();
  };

  function leaveRun(): void {
    enter('start', null);
    setFeedback(null);
    calibration.pause();
    ring.closeWindow();
  }

  const pause = () => {
    leaveRun();
    setReturnedToStart(true);
    say({ text: `Calibration paused. ${progressText(calibration.get())} accepted.` });
  };

  const stop = () => {
    leaveRun();
    navigate(ROUTES.dashboard);
  };

  useEffect(() => {
    live.current.closeWindow = ring.closeWindow;
  }, [ring.closeWindow]);

  // Leaving the page mid-run (for example through the navigation) keeps the taps and pauses the profile.
  useEffect(() => {
    const session = live.current;
    return () => {
      if (session.phase !== 'running') return;
      session.phase = 'start';
      calibration.pause();
      session.closeWindow();
    };
  }, [calibration]);

  return {
    phase,
    profile,
    run,
    prompt,
    feedback,
    ring,
    hand,
    resumable,
    returnedToStart,
    readAloud,
    setReadAloud,
    start,
    resume,
    repeatPoints,
    repeatPrompt,
    pause,
    stop,
  };
}
