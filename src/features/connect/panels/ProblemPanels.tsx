import { Button, Callout } from '@/components';
import { DEVICE_NAME } from '@/domain/protocol';
import { DEVICE_ERRORS } from '@/services/device/deviceErrors';
import type { DeviceState } from '@/services/device/types';

interface ProblemPanelProps {
  readonly state: DeviceState;
  /** Clears the problem and returns to "Connect a ring". It never opens the Bluetooth window by itself. */
  readonly onTryAgain: () => void;
  readonly onUseDemo: () => void;
}

export function ReconnectingPanel({ state, onStop }: { state: DeviceState; onStop: () => void }) {
  const name = state.remembered?.name ?? DEVICE_NAME;
  return (
    <div className="grid gap-4">
      <p>The connection to {name} dropped. Tactiq is trying to reconnect once.</p>
      <p className="text-muted-foreground">Keep the ring switched on and close to this device.</p>
      <div>
        <Button variant="secondary" onClick={onStop}>
          Stop trying
        </Button>
      </div>
    </div>
  );
}

export function PermissionDeniedPanel({ state, onTryAgain, onUseDemo }: ProblemPanelProps) {
  const error = state.error ?? DEVICE_ERRORS.permission_denied;
  return (
    <div className="grid gap-5">
      <Callout kind="warning" title="Bluetooth is blocked for this site">
        {error.message}
      </Callout>
      <div>
        <h3 className="text-base">How to allow Bluetooth</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>
            Open the site settings for this page. In Chrome and Edge, select the icon at the left end of the address
            bar, then choose Site settings.
          </li>
          <li>Find the Bluetooth setting and change it from Block to Ask or Allow.</li>
          <li>On Android, also check that Chrome or Edge has the Nearby devices permission in your phone’s settings.</li>
          <li>Come back to this page, choose Try again, then choose Connect a ring.</li>
        </ol>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onTryAgain}>Try again</Button>
        <Button variant="secondary" onClick={onUseDemo}>
          Use Demo Mode instead
        </Button>
      </div>
    </div>
  );
}

export function ConnectionErrorPanel({ state, onTryAgain, onUseDemo }: ProblemPanelProps) {
  const error = state.error ?? DEVICE_ERRORS.unknown;
  return (
    <div className="grid gap-5">
      <Callout kind="danger" role="alert" title={error.message}>
        {error.hint}
      </Callout>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onTryAgain}>Try again</Button>
        <Button variant="secondary" onClick={onUseDemo}>
          Use Demo Mode instead
        </Button>
      </div>
    </div>
  );
}
