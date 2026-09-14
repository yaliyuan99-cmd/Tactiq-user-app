import { RadioGroupField, type RadioOption } from '@/components';
import type { DeviceMode } from '@/services/device/types';

const MODE_OPTIONS: readonly RadioOption<DeviceMode>[] = [
  {
    value: 'demo',
    label: 'Demo Mode (simulated ring)',
    description: 'Works in any browser. Every result is labelled Simulated.',
  },
  {
    value: 'hardware',
    label: 'Bluetooth ring (bench prototype)',
    description: 'Needs Chrome or Edge on desktop or Android, and a flashed Tactiq bench ring.',
  },
];

export interface ModeChoiceProps {
  readonly mode: DeviceMode;
  readonly connected: boolean;
  readonly onChange: (mode: DeviceMode) => void;
}

export function ModeChoice({ mode, connected, onChange }: ModeChoiceProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-card sm:p-6">
      <RadioGroupField<DeviceMode>
        label="How do you want to use Tactiq?"
        options={MODE_OPTIONS}
        value={mode}
        onChange={onChange}
        hint={connected ? 'Switching to Demo Mode disconnects the ring.' : undefined}
      />
    </div>
  );
}
