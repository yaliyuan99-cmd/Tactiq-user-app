import { StatusPill } from '@/components';
import type { DeviceStatusView } from '@/lib/deviceStatus';

/**
 * The current device status. The pill is not a live region: status changes
 * are announced once by the page, so they are not read twice.
 */
export function StatusSection({ view }: { view: DeviceStatusView }) {
  return (
    <section
      aria-labelledby="connect-status-heading"
      className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="connect-status-heading" className="text-lg">
          Current status
        </h2>
        <StatusPill status={view.kind} label={view.label} />
      </div>
      <p className="mt-2">{view.description}</p>
    </section>
  );
}
