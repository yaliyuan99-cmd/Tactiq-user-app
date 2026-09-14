import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { StatusPill } from '@/components';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';

/** The device state pill in the top bar; opens Connect. */
export function DeviceStatusLink() {
  const { state } = useDevice();
  const view = describeDeviceState(state);
  return (
    <Link
      to={ROUTES.connect}
      aria-label={`Device: ${view.label}. Open connection settings`}
      className="group target-44 inline-flex items-center justify-center rounded-full no-underline"
    >
      <StatusPill status={view.kind} label={view.label} className="group-hover:bg-secondary" />
    </Link>
  );
}
