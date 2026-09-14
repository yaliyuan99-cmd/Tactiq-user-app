import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { Button, ButtonLink, Callout, ConfirmDialog, SwitchField } from '@/components';
import { CALIBRATION_SAMPLES_PER_CONTACT } from '@/domain/timing';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { CalibrationPanel } from './CalibrationPanel';
import { MAX_MISSES_PER_POINT, remainingPoints } from './calibrationFlow';
import { numberWord, pointPhrase, progressText } from './calibrationWording';
import { LastCalibrationPanel } from './LastCalibrationPanel';
import type { CalibrationSession } from './calibrationSessionTypes';

export const START_HEADING_ID = 'calibrate-start-heading';

const LINK_CLASSES = 'font-medium text-primary-strong underline';

function timesWords(n: number): string {
  if (n === 1) return 'once';
  if (n === 2) return 'twice';
  return `${numberWord(n)} times`;
}

/** Before a run: Start or Resume first, with the hand and speech settings, then what will happen. Also shown after Pause. */
export function StartView({ session }: { session: CalibrationSession }) {
  const { profile, resumable, ring, returnedToStart } = session;
  const { canSpeak } = useFeedback();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  useEffect(() => {
    if (returnedToStart) headingRef.current?.focus();
  }, [returnedToStart]);

  const canResume = resumable.kind === 'resume';
  const hardwareOffline = !ring.isDemo && !ring.canReceive;
  // Replacing an unfinished profile loses its taps, so ask first.
  const replacesTaps = profile !== null && profile.status !== 'complete' && profile.samples.length > 0;
  const startFresh = () => (replacesTaps ? setConfirmingRestart(true) : session.start());
  const remaining = remainingPoints(profile);
  const first = remaining[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <CalibrationPanel
        ref={headingRef}
        headingId={START_HEADING_ID}
        heading={canResume ? 'Pick up where you left off' : 'Ready to calibrate'}
      >
        {canResume && (
          <p className="mb-4 text-lg">
            {progressText(profile)} accepted so far.{' '}
            {first ? `Resuming carries on from the ${pointPhrase(first)}.` : 'Resume to finish.'}
          </p>
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

        {resumable.kind === 'blocked' && (
          <Callout kind="info" className="mb-5">
            {resumable.reason}
          </Callout>
        )}

        {hardwareOffline ? (
          <Callout kind="warning" title="No ring is connected">
            <p>Connect the bench ring to calibrate with it, or switch back to Demo Mode on the Connect page.</p>
            <ButtonLink to={ROUTES.connect} className="mt-3">
              Connect a ring
            </ButtonLink>
          </Callout>
        ) : (
          <div className="flex flex-wrap gap-3">
            {canResume ? (
              <>
                <Button onClick={session.resume}>Resume calibration</Button>
                <Button variant="secondary" onClick={startFresh}>
                  Start again
                </Button>
              </>
            ) : (
              <Button onClick={startFresh}>Start calibration</Button>
            )}
          </div>
        )}

        <h3 className="mt-7">What happens</h3>
        <ol className="mt-2 grid list-decimal gap-1.5 pl-6">
          <li>We name a point and say how to find it.</li>
          <li>You tap it {timesWords(CALIBRATION_SAMPLES_PER_CONTACT)}.</li>
          <li>
            We move to the next point. If a point has not registered after {numberWord(MAX_MISSES_PER_POINT)} tries, we
            move on and mark it to repeat.
          </li>
          <li>You can pause or stop at any time. Your taps are kept.</li>
        </ol>
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
