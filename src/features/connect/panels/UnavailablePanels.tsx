import { Button, Callout } from '@/components';
import { INSECURE_CONTEXT_REASON, WEB_BLUETOOTH_UNAVAILABLE_REASON } from '@/services/device/capabilities';
import type { DeviceCapabilities } from '@/services/device/types';

interface UnavailablePanelProps {
  readonly capabilities: DeviceCapabilities;
  readonly onUseDemo: () => void;
}

function SupportedBrowsers() {
  return (
    <div>
      <h3 className="text-base">Browsers that can connect</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Google Chrome on a desktop or laptop computer</li>
        <li>Microsoft Edge on a desktop or laptop computer</li>
        <li>Chrome or Edge on an Android phone</li>
      </ul>
      <p className="mt-2 text-muted-foreground">Safari and Firefox do not offer Web Bluetooth, so they cannot connect a ring.</p>
    </div>
  );
}

function UseDemoAction({ onUseDemo }: { onUseDemo: () => void }) {
  return (
    <div className="grid gap-2">
      <p>Demo Mode works in this browser, with the same commands on a simulated ring.</p>
      <div>
        <Button onClick={onUseDemo}>Use Demo Mode instead</Button>
      </div>
    </div>
  );
}

export function UnsupportedBrowserPanel({ capabilities, onUseDemo }: UnavailablePanelProps) {
  return (
    <div className="grid gap-5">
      <Callout kind="warning" title="This browser cannot connect to a ring">
        {capabilities.reason ?? WEB_BLUETOOTH_UNAVAILABLE_REASON}
      </Callout>
      <SupportedBrowsers />
      <UseDemoAction onUseDemo={onUseDemo} />
    </div>
  );
}

export function InsecureContextPanel({ capabilities, onUseDemo }: UnavailablePanelProps) {
  return (
    <div className="grid gap-5">
      <Callout kind="warning" title="This page is not secure enough for Bluetooth">
        {capabilities.reason ?? INSECURE_CONTEXT_REASON}
      </Callout>
      <div>
        <h3 className="text-base">How to fix it</h3>
        <p className="mt-2">
          Browsers only allow Bluetooth on pages opened over a secure connection. Open Tactiq from its address that
          starts with <code className="font-mono-label">https://</code>, or from <code className="font-mono-label">localhost</code>{' '}
          on your own computer, and return to this page.
        </p>
      </div>
      <SupportedBrowsers />
      <UseDemoAction onUseDemo={onUseDemo} />
    </div>
  );
}
