import { useEffect, useId, useRef, useState } from 'react';
import { Button, Callout, ConfirmDialog, EvidenceLabel, ProgressBar } from '@/components';
import { getContact } from '@/domain/contacts';
import { PracticeSurface } from '@/features/practice';
import { CalibrationPanel } from './CalibrationPanel';
import { acceptedTotal, misreadContact, missesInRun, requiredPerPoint, requiredTotal, sampleNumber } from './calibrationFlow';
import { RUN_RING_OFFLINE_TITLE, RUN_RING_SENTENCES } from './calibrationCopy';
import { missesSentence, pointCommandSentence, progressText, promptHeading } from './calibrationWording';
import { FeedbackMessage } from './FeedbackMessage';
import type { CalibrationSession } from './calibrationSessionTypes';

export const PROMPT_HEADING_ID = 'calibrate-prompt-heading';

/**
 * One prompt at a time: the point, how to find it, progress, the last result,
 * the controls and the ring. The ring's own state has exactly one sentence
 * (see calibrationScreenState.ts), so a run whose ring has gone away says so
 * instead of still asking for a squeeze.
 */
export function RunningView({ session }: { session: CalibrationSession }) {
  const { profile, run, prompt, ring, feedback, runRingState } = session;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const repeatHintId = useId();
  const [confirmingStop, setConfirmingStop] = useState(false);

  // Each new prompt takes focus, so a screen reader reads it and the next Tab starts from here.
  useEffect(() => {
    headingRef.current?.focus();
  }, [prompt]);

  if (!profile || !run || !prompt) return null;

  const contact = getContact(prompt);
  const position = run.points.indexOf(prompt) + 1;
  const misses = missesInRun(profile, run, prompt);

  return (
    <div className="grid grid-cols-1 gap-6">
      <CalibrationPanel
        ref={headingRef}
        headingId={PROMPT_HEADING_ID}
        eyebrow={`Point ${position} of ${run.points.length}`}
        heading={promptHeading(prompt)}
      >
        <p className="text-lg">{contact.howToFind}</p>
        <p className="mt-1 text-sm text-muted-foreground">{pointCommandSentence(prompt)}</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-8">
          <p className="text-lg font-semibold">
            Sample {sampleNumber(profile, prompt)} of {requiredPerPoint(profile)}
          </p>
          <div className="grid gap-1.5">
            <ProgressBar
              label="Calibration progress"
              value={acceptedTotal(profile)}
              max={requiredTotal(profile)}
              valueText={progressText(profile)}
            />
            <EvidenceLabel kind={profile.evidence} />
          </div>
        </div>
        {misses > 0 && <p className="mt-3 text-sm text-muted-foreground">{missesSentence(misses)}</p>}

        {feedback && <FeedbackMessage text={feedback.text} tone={feedback.tone} className="mt-4" />}

        {runRingState === 'ring_offline' ? (
          <Callout kind="warning" role="status" title={RUN_RING_OFFLINE_TITLE} className="mt-4">
            <p>{RUN_RING_SENTENCES.ring_offline}</p>
          </Callout>
        ) : (
          <p className="mt-4">{RUN_RING_SENTENCES[runRingState]}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={session.repeatPrompt} aria-describedby={repeatHintId}>
            Repeat this point
          </Button>
          <Button variant="secondary" onClick={session.pause}>
            Pause
          </Button>
          <Button variant="ghost" onClick={() => setConfirmingStop(true)}>
            Stop
          </Button>
        </div>
        <p id={repeatHintId} className="mt-2 text-sm text-muted-foreground">
          Repeat this point says the prompt again
          {runRingState === 'window_managed' ? ' and reopens the command window' : ''}. Taps already accepted are kept.
        </p>
      </CalibrationPanel>

      <PracticeSurface
        ring={ring}
        hand={session.hand}
        targetContact={prompt}
        detectedContact={misreadContact(profile, run, prompt)}
        showEmergencyHold={false}
      />

      <ConfirmDialog
        open={confirmingStop}
        onCancel={() => setConfirmingStop(false)}
        onConfirm={() => {
          setConfirmingStop(false);
          session.stop();
        }}
        title="Stop calibration?"
        description="Taps so far are kept, and you can resume later."
        confirmLabel="Stop calibration"
        cancelLabel="Keep calibrating"
      />
    </div>
  );
}
