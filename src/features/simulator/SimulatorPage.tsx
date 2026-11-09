import { useRef } from 'react';
import { EvidenceLabel, PageHeader } from '@/components';
import { usePhoneDemo } from '@/components/product/usePhoneDemo';
import { PRACTICE_PANEL_CLASSES, PracticeSurface, evidenceForDevice, useRing, useShortcutLabels, type HistoryEvidence } from '@/features/practice';
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
import { SIMULATOR_HEADING_IDS } from './simulatorIds';
import type { SimulatorMode } from './simulatorMode';
import { useGuidedPractice } from './useGuidedPractice';
import { useSimulatorMode } from './useSimulatorMode';
import { useSimulatorSession } from './useSimulatorSession';
import { WhatWouldHappenPanel } from './WhatWouldHappenPanel';

export const SIMULATOR_LEDE =
  'Practise the nine commands. Squeeze to open the command window, then tap a point.';

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
  const phoneDemo = usePhoneDemo();
  const ring = useRing({
    onResult: (result) => {
      session.onResult(result);
      if (mode === 'free' && result.kind === 'command') phoneDemo.run(result.token);
    },
  });
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
      <PageHeader title="Simulator" lede={SIMULATOR_LEDE} actions={<ModeSwitch mode={mode} onChange={changeMode} />} />

      <div className="mb-6 grid gap-4">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <EvidenceLabel kind={evidence} />
          <span className="text-sm text-muted-foreground">{evidenceNote(evidence, waitingForRing)}</span>
        </p>
        {waitingForRing && <HardwareNotice status={describeDeviceState(state).description} onSwitchToDemo={switchToDemo} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)] lg:items-start">
        {/* Beside the stage from the large breakpoint up, so the target stays in view while you practise. */}
        <div className="min-w-0 lg:sticky lg:top-4 lg:col-start-2 lg:row-start-1">
          {isGuided ? (
            <GuidedPromptCard guided={guided} evidence={evidence} showHoldButton={ring.canOperate} />
          ) : (
            <WhatWouldHappenPanel token={session.lastCommand} mapping={mapping} phone={phoneDemo.phone} spoken={phoneDemo.spoken} />
          )}
        </div>

        <section
          aria-labelledby={SIMULATOR_HEADING_IDS.ring}
          className={`${PRACTICE_PANEL_CLASSES} min-w-0 lg:col-start-1 lg:row-start-1`}
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

        <AttemptLog entries={session.log} onClear={clearLog} className="min-w-0 lg:col-span-2" />
      </div>
    </>
  );
}
