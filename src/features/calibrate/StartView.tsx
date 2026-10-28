import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, Callout, ConfirmDialog, SwitchField } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { CalibrationPanel } from './CalibrationPanel';
import {
  CONNECT_RING_LABEL,
  RESTART_DESCRIPTION_LEAD,
  RING_OFFLINE_DESCRIPTION,
  START_HEADINGS,
  SWITCH_TO_DEMO_LABEL,
  WHAT_HAPPENS_HEADING,
  WHAT_HAPPENS_STEPS,
} from './calibrationCopy';
import { remainingPoints } from './calibrationFlow';
import { replacesStoredTaps, startFreshLabel } from './calibrationScreenState';
import { pointPhrase, progressText } from './calibrationWording';
import { LastCalibrationPanel } from './LastCalibrationPanel';
import type { CalibrationSession } from './calibrationSessionTypes';

export const START_HEADING_ID = 'calibrate-start-heading';

const LINK_CLASSES = 'font-medium text-primary-strong underline';

/**
 * The screen before a run. It is in exactly one of four states (see
 * calibrationScreenState.ts), and each state gets one description and one
 * next action — never a warning about a missing ring beside advice that
 * assumes one.
 */
export function StartView({ session }: { session: CalibrationSession }) {
  const { profile, startState, returnedToStart } = session;
  const { canSpeak } = useFeedback();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  useEffect(() => {
    if (returnedToStart) headingRef.current?.focus();
  }, [returnedToStart]);

  const offline = startState.kind === 'ring_offline';
  const freshLabel = startFreshLabel(profile);
  // Replacing an unfinished profile loses its taps, so ask first.
  const startFresh = () => (replacesStoredTaps(profile) ? setConfirmingRestart(true) : session.start());
  const first = remainingPoints(profile)[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <CalibrationPanel ref={headingRef} headingId={START_HEADING_ID} heading={START_HEADINGS[startState.kind]}>
        {offline ? (
          <>
            <p className="mb-4 text-lg">{RING_OFFLINE_DESCRIPTION}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to={ROUTES.connect}>{CONNECT_RING_LABEL}</ButtonLink>
              <Button variant="secondary" onClick={session.switchToDemo}>
                {SWITCH_TO_DEMO_LABEL}
              </Button>
            </div>
          </>
        ) : (
          <>
            {startState.kind === 'resume' && (
              <p className="mb-4 text-lg">
                {progressText(profile)} accepted so far.{' '}
                {first ? `Resuming carries on from the ${pointPhrase(first)}.` : 'Resume to finish.'}
              </p>
            )}
            {startState.kind === 'restart' && (
              <Callout kind="info" className="mb-5">
                {`${startState.reason} ${RESTART_DESCRIPTION_LEAD}`}
              </Callout>
            )}

            <p className="mb-3">
              Hand: <strong>{session.hand === 'left' ? 'Left hand' : 'Right hand'}</strong>.{' '}
              <Link to={`${ROUTES.settings}#hand`} className={LINK_CLASSES}>
                Change hand in Settings
              </Link>
            </p>

            <SwitchField
              label="Read prompts aloud"
              description={
                canSpeak
                  ? 'Speaks each prompt and result in your browser’s voice. Screen readers announce them either way.'
                  : 'This browser cannot speak aloud. Prompts and results are still shown and announced to screen readers.'
              }
              checked={session.readAloud && canSpeak}
              onChange={session.setReadAloud}
              disabled={!canSpeak}
              containerClassName="mb-5"
            />

            <div className="flex flex-wrap gap-3">
              {startState.kind === 'resume' ? (
                <>
                  <Button onClick={session.resume}>Resume calibration</Button>
                  <Button variant="secondary" onClick={startFresh}>
                    {freshLabel}
                  </Button>
                </>
              ) : (
                <Button onClick={startFresh}>{freshLabel}</Button>
              )}
            </div>

            <h3 className="mt-7">{WHAT_HAPPENS_HEADING}</h3>
            <ol className="mt-2 grid list-decimal gap-1.5 pl-6">
              {WHAT_HAPPENS_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </>
        )}
      </CalibrationPanel>

      {profile && <LastCalibrationPanel profile={profile} />}

      <ConfirmDialog
        open={confirmingRestart}
        onCancel={() => setConfirmingRestart(false)}
        onConfirm={() => {
          setConfirmingRestart(false);
          session.start();
        }}
        title="Start calibration again?"
        description={`This replaces your unfinished calibration (${progressText(profile)} accepted).`}
        confirmLabel="Start again"
        destructive
      />
    </div>
  );
}
