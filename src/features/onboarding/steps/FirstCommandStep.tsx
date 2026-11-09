import { useState } from 'react';
import { Callout, EvidenceLabel } from '@/components';
import { PRACTICE_PANEL_CLASSES, PracticeSurface, useRing, useShortcutLabels } from '@/features/practice';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { firstCommandOutcome, type FirstCommandOutcome } from '../firstCommand';
import {
  FIRST_COMMAND_CONTACT,
  FIRST_COMMAND_DEMO_NOTE,
  FIRST_COMMAND_DONE,
  FIRST_COMMAND_DONE_TITLE,
  FIRST_COMMAND_HARDWARE_NOTE,
  FIRST_COMMAND_LEDE,
  FIRST_COMMAND_NO_ATTEMPT,
  FIRST_COMMAND_OFFLINE,
  FIRST_COMMAND_SKIPPABLE,
  FIRST_COMMAND_STEPS,
  LAST_ATTEMPT_LABEL,
} from '../onboardingCopy';
import { StepLede } from './StepSection';

export const FIRST_COMMAND_HEADING_ID = 'first-command-heading';

export interface FirstCommandStepProps {
  /** True once the command has been run at least once. Kept by the flow, so it survives moving back and forth. */
  readonly done: boolean;
  readonly onDone: () => void;
}

/**
 * Step 3: one real command, on the ring surface the rest of the app uses.
 *
 * The surface announces every outcome itself, so this step replaces those
 * words (same feedback kind, same tick) instead of announcing a second time.
 * The surface stays on screen after a success, so nothing that had focus
 * disappears and the user can run the command again as often as they like.
 */
export function FirstCommandStep({ done, onDone }: FirstCommandStepProps) {
  const { preferences } = usePreferences();
  const { feedback } = useFeedback();
  const { mapping } = useShortcutLabels();
  const [outcome, setOutcome] = useState<FirstCommandOutcome | null>(null);

  const ring = useRing({
    onResult: (result) => {
      const next = firstCommandOutcome(result, mapping);
      setOutcome(next);
      if (next.announcement) feedback(next.feedbackKind, next.announcement);
      if (next.verdict === 'correct') onDone();
    },
  });

  const ringOffline = !ring.isDemo && !ring.canReceive;

  return (
    <>
      <StepLede>{FIRST_COMMAND_LEDE}</StepLede>

      <div className="grid gap-4">
        <ol role="list" className="step-list max-w-prose">
          {FIRST_COMMAND_STEPS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p className="max-w-prose">{ring.isDemo ? FIRST_COMMAND_DEMO_NOTE : FIRST_COMMAND_HARDWARE_NOTE}</p>
        <p>
          <EvidenceLabel
            kind={ring.isDemo ? 'simulated' : 'measured'}
            detail={ring.isDemo ? 'no phone is involved' : 'unvalidated bench prototype'}
          />
        </p>
      </div>

      {ringOffline && (
        <Callout kind="warning" title="No ring is connected">
          <p>{FIRST_COMMAND_OFFLINE}</p>
        </Callout>
      )}

      <section
        aria-labelledby={FIRST_COMMAND_HEADING_ID}
        className={`min-w-0 ${PRACTICE_PANEL_CLASSES}`}
      >
        <h2 id={FIRST_COMMAND_HEADING_ID} className="mb-4">
          Squeeze and tap
        </h2>
        <PracticeSurface
          ring={ring}
          hand={preferences.hand}
          targetContact={FIRST_COMMAND_CONTACT}
          detectedContact={outcome?.detectedContact ?? null}
          showEmergencyHold={false}
          disabled={ringOffline}
        />
        <div className="mt-4 border-t border-border pt-4">
          <p className="font-mono-label text-muted-foreground">{LAST_ATTEMPT_LABEL}</p>
          <p className="mt-1">{outcome ? outcome.message : FIRST_COMMAND_NO_ATTEMPT}</p>
        </div>
      </section>

      {/* Below the surface, so success does not push the hand away from under the finger that just tapped it. */}
      {done && (
        <Callout kind="success" title={FIRST_COMMAND_DONE_TITLE}>
          <p>{FIRST_COMMAND_DONE}</p>
        </Callout>
      )}

      <p className="max-w-prose text-muted-foreground">{FIRST_COMMAND_SKIPPABLE}</p>
    </>
  );
}
