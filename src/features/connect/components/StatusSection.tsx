import { StatusPill } from '@/components';
import type { DeviceStatusView } from '@/lib/deviceStatus';
import { ConnectionDiagram } from './ConnectionDiagram';

/**
 * The current device status. The pill is not a live region: status changes
 * are announced once by the page, so they are not read twice.
 */
export function StatusSection({ view }: { view: DeviceStatusView }) {
  return (
    <section
      aria-labelledby="connect-status-heading"
      className="hero-band grid gap-6 rounded-lg p-5 sm:p-7 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="connect-status-heading" className="text-lg">
            Current status
          </h2>
          <StatusPill status={view.kind} label={view.label} />
        </div>
        <p className="mt-3 text-lg text-pretty">{view.description}</p>
      </div>
      <ConnectionDiagram kind={view.kind} />
    </section>
  );
}
