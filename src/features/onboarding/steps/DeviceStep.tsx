import { useEffect, useRef } from 'react';
import { EvidenceLabel, RadioGroupField, type RadioOption } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import type { DeviceMode } from '@/services/device/types';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import {
  DEMO_OPTION_DESCRIPTION,
  DEMO_OPTION_LABEL,
  DEVICE_LEDE,
  DEVICE_QUESTION,
  HARDWARE_OPTION_DESCRIPTION,
  HARDWARE_OPTION_LABEL,
} from '../onboardingCopy';
import { connectionAnnouncement, modeAnnouncement } from './deviceChoice';
import { HardwarePanel } from './HardwarePanel';
import { StepLede } from './StepSection';

const MODE_OPTIONS: readonly RadioOption<DeviceMode>[] = [
  { value: 'demo', label: DEMO_OPTION_LABEL, description: DEMO_OPTION_DESCRIPTION },
  { value: 'hardware', label: HARDWARE_OPTION_LABEL, description: HARDWARE_OPTION_DESCRIPTION },
];

function statusKey(mode: DeviceMode, status: string): string {
  return `${mode}:${status}`;
}

export function DeviceStep() {
  const { state, capabilities, setMode, connect } = useDevice();
  const { announce } = useFeedback();
  const groupRef = useRef<HTMLDivElement>(null);
  const pendingMode = useRef<DeviceMode | null>(null);
  const focusDemoOption = useRef(false);
  const shownStatus = useRef(statusKey(state.mode, state.status));

  // One announcement per change: the mode the user picked, or a connection status change within Bluetooth mode.
  useEffect(() => {
    const key = statusKey(state.mode, state.status);
    const previous = shownStatus.current;
    shownStatus.current = key;
    if (pendingMode.current === state.mode) {
      pendingMode.current = null;
      announce(modeAnnouncement(state.mode, capabilities, state));
      if (focusDemoOption.current) {
        focusDemoOption.current = false;
        groupRef.current?.querySelector<HTMLInputElement>('input[value="demo"]')?.focus();
      }
      return;
    }
    if (key !== previous && state.mode === 'hardware' && previous.startsWith('hardware:')) {
      announce(connectionAnnouncement(describeDeviceState(state)));
    }
  }, [state, capabilities, announce]);

  const choose = (mode: DeviceMode, focusDemo = false) => {
    pendingMode.current = mode;
    focusDemoOption.current = focusDemo;
    setMode(mode);
  };

  return (
    <>
      <StepLede>{DEVICE_LEDE}</StepLede>
      <div className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-card sm:p-6">
        <div ref={groupRef}>
          <RadioGroupField<DeviceMode>
            label={DEVICE_QUESTION}
            options={MODE_OPTIONS}
            value={state.mode}
            onChange={(mode) => choose(mode)}
          />
        </div>
        {state.mode === 'demo' ? (
          <div className="grid gap-1.5">
            <EvidenceLabel kind="simulated" />
            <p>{describeDeviceState(state).description}</p>
          </div>
        ) : (
          <HardwarePanel
            state={state}
            capabilities={capabilities}
            onUseDemo={() => choose('demo', true)}
            onConnect={() => void connect()}
          />
        )}
      </div>
    </>
  );
}
