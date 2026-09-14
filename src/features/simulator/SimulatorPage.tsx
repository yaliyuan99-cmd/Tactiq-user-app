import { useRef } from 'react';
import { EvidenceLabel, PageHeader } from '@/components';
import { PracticeSurface, evidenceForDevice, useRing, useShortcutLabels, type HistoryEvidence } from '@/features/practice';
import { describeDeviceState } from '@/lib/deviceStatus';
import { usePageTitle } from '@/lib/usePageTitle';
import { useDevice } from '@/services/device/DeviceProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { AttemptLog } from './AttemptLog';
import { contactForTarget, type RandomSource } from './guided';
import { GuidedPromptCard } from './GuidedPromptCard';
import { HardwareNotice } from './HardwareNotice';
import { ModeSwitch } from './ModeSwitch';
import { SESSION_LOG_CLEARED } from './sessionLog';
import { CARD_CLASSES, SIMULATOR_HEADING_IDS } from './simulatorIds';
import type { SimulatorMode } from './simulatorMode';
import { useGuidedPractice } from './useGuidedPractice';
import { useSimulatorMode } from './useSimulatorMode';
import { useSimulatorSession } from './useSimulatorSession';
import { WhatWouldHappenPanel } from './WhatWouldHappenPanel';

export const SIMULATOR_LEDE =
  'Practise the nine commands with a simulated ring. Squeeze to open the command window, then tap a point.';

export const DEMO_MODE_ANNOUNCEMENT = 'Demo Mode is on. The simulated ring is ready.';

export interface SimulatorPageProps {
  /** Chooses guided targets. Defaults to Math.random; tests pass their own. */
  readonly random?: RandomSource;
}

function evidenceNote(evidence: HistoryEvidence, waitingForRing: boolean): string {
  if (evidence === 'measured') {
    return 'Attempts come from your connected ring, so new records are labelled Measured. Shortcut outcomes are still simulated.';
  }
  if (waitingForRing) return 'Nothing here is measured. No attempts can arrive until a ring connects.';
  return 'Every result here comes from the simulated ring. It shows your practice, not how a ring would perform.';
}

export default function SimulatorPage({ random }: SimulatorPageProps) {
  usePageTitle('Simulator');
  const { preferences } = usePreferences();
  const { state, setMode: setDeviceMode } = useDevice();
  const { announce } = useFeedback();
  const { mapping } = useShortcutLabels();
  const [mode, setMode] = useSimulatorMode();
  const guided = useGuidedPractice({ mapping, random });
  const session = useSimulatorSession({ mode, guided, mapping });
  const ring = useRing({ onResult: session.onResult });
  const ringHeadingRef = useRef<HTMLHeadingElement>(null);

  const evidence = evidenceForDevice(state);
  const waitingForRing = state.mode === 'hardware' && state.status !== 'connected';
  const isGuided = mode === 'guided';

  const changeMode = (next: SimulatorMode) => {
    if (next === mode) return;
    setMode(next);
    // The radio says which mode is on; the new target is the one thing it cannot say.
    if (next === 'guided') guided.repeatPrompt();
  };

  const switchToDemo = () => {
    // The notice (and this button) goes away, so focus moves to where practice continues.
    ringHeadingRef.current?.focus();
    setDeviceMode('demo');
    announce(DEMO_MODE_ANNOUNCEMENT);
  };

  const clearLog = () => {
    session.clearLog();
    announce(SESSION_LOG_CLEARED);
  };

  return (
    <>
      <PageHeader title="Simulator" lede={SIMULATOR_LEDE} />

      <div className="mb-8 grid gap-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <EvidenceLabel kind={evidence} />
          <span className="text-muted-foreground">{evidenceNote(evidence, waitingForRing)}</span>
        </p>
        {waitingForRing && <HardwareNotice status={describeDeviceState(state).description} onSwitchToDemo={switchToDemo} />}
        <ModeSwitch mode={mode} onChange={changeMode} />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-6 xl:grid-rows-[auto_1fr] xl:items-start">
        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          {isGuided ? (
            <GuidedPromptCard guided={guided} evidence={evidence} />
          ) : (
            <WhatWouldHappenPanel token={session.lastCommand} mapping={mapping} />
          )}
        </div>

        <section
          aria-labelledby={SIMULATOR_HEADING_IDS.ring}
          className={`${CARD_CLASSES} min-w-0 xl:col-start-1 xl:row-span-2 xl:row-start-1`}
        >
          <h2 id={SIMULATOR_HEADING_IDS.ring} ref={ringHeadingRef} tabIndex={-1} className="mb-4">
            Squeeze and tap
          </h2>
          <PracticeSurface
            ring={ring}
            hand={preferences.hand}
            targetContact={isGuided && !guided.advancing ? contactForTarget(guided.target) : null}
            detectedContact={isGuided ? (guided.feedback?.detectedContact ?? null) : null}
          />
        </section>

        <AttemptLog
          entries={session.log}
          onClear={clearLog}
          className="min-w-0 xl:col-start-2 xl:row-start-2"
        />
      </div>
    </>
  );
}
