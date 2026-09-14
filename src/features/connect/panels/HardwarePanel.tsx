import { type RefObject } from 'react';
import { useDevice } from '@/services/device/DeviceProvider';
import type { ConnectPanel } from '../connectLogic';
import { ConnectedPanel } from './ConnectedPanel';
import { ConnectFlowPanel } from './ConnectFlowPanel';
import { ConnectionErrorPanel, PermissionDeniedPanel, ReconnectingPanel } from './ProblemPanels';
import { InsecureContextPanel, UnsupportedBrowserPanel } from './UnavailablePanels';

export interface HardwarePanelProps {
  readonly panel: Exclude<ConnectPanel, 'demo'>;
  readonly connectButtonRef: RefObject<HTMLButtonElement>;
}

/** One panel per hardware state; each has plain copy and a next action. */
export function HardwarePanel({ panel, connectButtonRef }: HardwarePanelProps) {
  const { state, capabilities, setMode, disconnect } = useDevice();
  const switchToDemo = () => setMode('demo');
  // Clearing the problem returns to the connect button; only that button opens the Bluetooth window.
  const tryAgain = () => void disconnect();

  switch (panel) {
    case 'insecure_context':
      return <InsecureContextPanel capabilities={capabilities} onUseDemo={switchToDemo} />;
    case 'unsupported':
      return <UnsupportedBrowserPanel capabilities={capabilities} onUseDemo={switchToDemo} />;
    case 'ready':
    case 'scanning':
    case 'connecting':
      return <ConnectFlowPanel phase={panel} connectButtonRef={connectButtonRef} />;
    case 'connected':
      return <ConnectedPanel />;
    case 'reconnecting':
      return <ReconnectingPanel state={state} onStop={() => void disconnect()} />;
    case 'permission_denied':
      return <PermissionDeniedPanel state={state} onTryAgain={tryAgain} onUseDemo={switchToDemo} />;
    case 'error':
      return <ConnectionErrorPanel state={state} onTryAgain={tryAgain} onUseDemo={switchToDemo} />;
  }
}
