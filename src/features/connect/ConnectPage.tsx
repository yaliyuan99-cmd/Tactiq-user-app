import { useRef } from 'react';
import { PageHeader } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import { usePageTitle } from '@/lib/usePageTitle';
import { useDevice } from '@/services/device/DeviceProvider';
import { ConnectionLog } from './components/ConnectionLog';
import { DemoPanel } from './components/DemoPanel';
import { ModeChoice } from './components/ModeChoice';
import { StatusSection } from './components/StatusSection';
import { TechnicalDetails } from './components/TechnicalDetails';
import { Troubleshooting } from './components/Troubleshooting';
import { deviceSectionTitle, panelFor, statusAnnouncement, statusKey } from './connectLogic';
import { HardwarePanel } from './panels/HardwarePanel';
import { useAnnounceOnChange, useRecoverFocusOnChange } from './useConnectPageEffects';

export default function ConnectPage() {
  usePageTitle('Connect your ring');
  const { state, capabilities, events, setMode } = useDevice();
  const panel = panelFor(state, capabilities);
  const view = describeDeviceState(state);
  const deviceHeadingRef = useRef<HTMLHeadingElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  useAnnounceOnChange(statusKey(state), statusAnnouncement(state, panel));
  // A replaced panel takes its focused control with it: land on the connect button when it is there, else the heading.
  useRecoverFocusOnChange(`${panel}:${state.remembered?.id ?? ''}`, () =>
    panel === 'ready' ? connectButtonRef.current : deviceHeadingRef.current,
  );

  return (
    <>
      <PageHeader
        title="Connect your ring"
        lede="Use Demo Mode to practise with a simulated ring, or connect a Tactiq bench prototype over Bluetooth."
      />
      <div className="grid gap-6">
        <StatusSection view={view} />
        <ModeChoice mode={state.mode} connected={state.mode === 'hardware' && state.status === 'connected'} onChange={setMode} />

        <section
          aria-labelledby="connect-device-heading"
          className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-card sm:p-6"
        >
          <h2 id="connect-device-heading" ref={deviceHeadingRef} tabIndex={-1} className="mb-4">
            {deviceSectionTitle(state.mode)}
          </h2>
          {panel === 'demo' ? (
            <DemoPanel device={state.device} />
          ) : (
            <HardwarePanel panel={panel} connectButtonRef={connectButtonRef} />
          )}
        </section>

        <div className="grid gap-3">
          {state.mode === 'hardware' && <ConnectionLog events={events} />}
          <TechnicalDetails />
        </div>

        <Troubleshooting />
      </div>
    </>
  );
}
