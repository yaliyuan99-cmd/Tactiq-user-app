import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { StatusPill } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import { useShellSection } from './ShellSection';

/** The mode pill: names the current device state and opens the connection screen. */
export function DeviceStatusLink() {
  const { state } = useDevice();
  const section = useShellSection();
  const view = describeDeviceState(state);
  return (
    <Link
      to={section.path(ROUTES.connect)}
      aria-label={`Device: ${view.label}. Open connection settings`}
      className="group target-44 inline-flex shrink-0 items-center justify-center rounded-full no-underline"
    >
      <StatusPill status={view.kind} label={view.label} className="group-hover:bg-secondary" />
    </Link>
  );
}
