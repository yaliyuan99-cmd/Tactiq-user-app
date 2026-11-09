import { ButtonLink, EvidenceLabel } from '@/components';
import { ROUTES } from '@/app/routes';
import type { DeviceInfo } from '@/services/device/types';
import { BatteryNotReported, DeviceDetailsList } from './DeviceDetailsList';

export function DemoPanel({ device }: { device: DeviceInfo | null }) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-start md:gap-8">
      <div className="grid gap-5">
        <p className="text-pretty">
          The simulated ring follows the same squeeze, command window and tap rules as the bench firmware, so you can
          practise every command without hardware.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to={ROUTES.simulator}>Practise in the simulator</ButtonLink>
          <ButtonLink to={ROUTES.calibrate} variant="secondary">
            Calibrate
          </ButtonLink>
        </div>
      </div>
      {device && (
        <DeviceDetailsList
          items={[
            { term: 'Name', value: device.name },
            { term: 'Firmware', value: device.firmwareVersion ?? 'Not reported' },
            { term: 'Battery', value: <BatteryNotReported /> },
            { term: 'Evidence', value: <EvidenceLabel kind="simulated" /> },
          ]}
        />
      )}
    </div>
  );
}
