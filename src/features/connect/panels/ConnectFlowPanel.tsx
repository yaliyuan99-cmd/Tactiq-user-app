import { type RefObject } from 'react';
import { Check } from 'lucide-react';
import { Button, Callout } from '@/components';
import { DEVICE_NAME } from '@/domain/protocol';
import { useDevice } from '@/services/device/DeviceProvider';
import { cn } from '@/lib/cn';
import { lastConnectedText, type ConnectFlowPhase } from '../connectLogic';
import { ForgetRingControl } from './ForgetRingControl';

export interface ConnectFlowPanelProps {
  readonly phase: ConnectFlowPhase;
  readonly connectButtonRef?: RefObject<HTMLButtonElement>;
}

const STEPS: readonly { readonly phase: ConnectFlowPhase; readonly label: string }[] = [
  { phase: 'ready', label: 'Switch on the ring' },
  { phase: 'scanning', label: 'Choose it in the Bluetooth window' },
  { phase: 'connecting', label: 'Wait for the link' },
];

/** Where this attempt has got to. Marked by shape and by words, so not by colour alone. */
function FlowSteps({ phase }: { phase: ConnectFlowPhase }) {
  const current = STEPS.findIndex((step) => step.phase === phase);
  return (
    <ol role="list" aria-label="Steps to connect" className="grid gap-2 sm:grid-cols-3">
      {STEPS.map((step, index) => (
        <li
          key={step.phase}
          aria-current={index === current ? 'step' : undefined}
          className={cn(
            'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
            index === current ? 'border-primary bg-secondary font-medium' : 'border-border',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-full border font-semibold tabular-nums',
              index < current ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong',
            )}
          >
            {index < current ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );
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
      <FlowSteps phase={phase} />
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
