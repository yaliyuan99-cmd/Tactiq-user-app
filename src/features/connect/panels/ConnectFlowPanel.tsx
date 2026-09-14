import { type RefObject } from 'react';
import { Button, Callout } from '@/components';
import { DEVICE_NAME } from '@/domain/protocol';
import { useDevice } from '@/services/device/DeviceProvider';
import { lastConnectedText, type ConnectFlowPhase } from '../connectLogic';
import { ForgetRingControl } from './ForgetRingControl';

export interface ConnectFlowPanelProps {
  readonly phase: ConnectFlowPhase;
  readonly connectButtonRef?: RefObject<HTMLButtonElement>;
}

/**
 * Ready, scanning and connecting share this layout. The connect button stays
 * the same element throughout — it only turns busy — so keyboard focus is
 * never lost while the browser's Bluetooth window is open.
 *
 * This button is the only control on the page that starts a Bluetooth
 * permission request, and only when it is chosen.
 */
export function ConnectFlowPanel({ phase, connectButtonRef }: ConnectFlowPanelProps) {
  const { state, connect, disconnect } = useDevice();
  const { remembered, error } = state;
  const busy = phase !== 'ready';

  let intro: string;
  let buttonLabel: string;
  if (phase === 'scanning') {
    intro = `Choose ${DEVICE_NAME} in your browser’s Bluetooth window.`;
    buttonLabel = 'Waiting for the Bluetooth window…';
  } else if (phase === 'connecting') {
    intro = `Connecting to ${remembered?.name ?? DEVICE_NAME}. Keep the ring switched on and close to this device.`;
    buttonLabel = 'Connecting…';
  } else {
    intro = `Switch on the bench ring and keep it close. Your browser’s Bluetooth window will open so you can choose ${
      remembered?.name ?? DEVICE_NAME
    }.`;
    buttonLabel = remembered ? `Reconnect to ${remembered.name}` : 'Connect a ring';
  }

  return (
    <div className="grid gap-4">
      {phase === 'ready' && remembered && <p className="font-medium">{lastConnectedText(remembered)}</p>}
      <p>{intro}</p>
      {phase === 'ready' && error && (
        <Callout kind="warning" title={error.message}>
          {error.hint}
        </Callout>
      )}
      <div className="flex flex-wrap gap-3">
        <Button ref={connectButtonRef} busy={busy} onClick={() => void connect()}>
          {buttonLabel}
        </Button>
        {busy ? (
          <Button variant="secondary" onClick={() => void disconnect()}>
            Cancel
          </Button>
        ) : (
          remembered && <ForgetRingControl name={remembered.name} announceResult />
        )}
      </div>
      {phase === 'ready' && (
        <p className="text-sm text-muted-foreground">
          Your browser asks for Bluetooth permission only when you choose this button.
        </p>
      )}
    </div>
  );
}
