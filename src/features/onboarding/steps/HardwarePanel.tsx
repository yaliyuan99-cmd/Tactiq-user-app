import { Bluetooth } from 'lucide-react';
import { Button, Callout, StatusPill } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import type { DeviceCapabilities, DeviceState } from '@/services/device/types';
import {
  CONNECT_LABEL,
  CONNECT_OPTIONAL_NOTE,
  CONNECT_PERMISSION_NOTE,
  UNSUPPORTED_TITLE,
  USE_DEMO_LABEL,
} from '../onboardingCopy';
import { hardwarePanelFor, isConnecting, unavailableReason } from './deviceChoice';

export interface HardwarePanelProps {
  readonly state: DeviceState;
  readonly capabilities: DeviceCapabilities;
  readonly onUseDemo: () => void;
  readonly onConnect: () => void;
}

/** What a Bluetooth ring needs from here: either why this browser cannot connect, or the connect button and its status. */
export function HardwarePanel({ state, capabilities, onUseDemo, onConnect }: HardwarePanelProps) {
  if (hardwarePanelFor(capabilities) === 'unavailable') {
    return (
      <div className="grid gap-4">
        <Callout kind="warning" title={UNSUPPORTED_TITLE}>
          <p>{unavailableReason(capabilities, state)}</p>
        </Callout>
        <p>Demo Mode works in this browser, with the same commands on a simulated ring.</p>
        <div>
          <Button variant="secondary" onClick={onUseDemo}>
            {USE_DEMO_LABEL}
          </Button>
        </div>
      </div>
    );
  }

  const view = describeDeviceState(state);
  const busy = isConnecting(state);
  const connected = state.status === 'connected';

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">Status</span>
          <StatusPill status={view.kind} label={view.label} />
        </p>
        <p>{view.description}</p>
        {state.error && !connected && <p className="text-muted-foreground">{state.error.hint}</p>}
      </div>
      {!connected && (
        <div className="grid gap-2">
          <div>
            <Button variant="secondary" busy={busy} leadingIcon={<Bluetooth className="h-4 w-4" />} onClick={onConnect}>
              {CONNECT_LABEL}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{CONNECT_PERMISSION_NOTE}</p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{CONNECT_OPTIONAL_NOTE}</p>
    </div>
  );
}
