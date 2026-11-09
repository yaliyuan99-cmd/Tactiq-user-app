import { Crosshair, Shuffle } from 'lucide-react';
import { SegmentedRadioGroup, type SegmentedOption } from '@/components';
import { SIMULATOR_MODE_OPTIONS, type SimulatorMode } from './simulatorMode';

export interface ModeSwitchProps {
  readonly mode: SimulatorMode;
  readonly onChange: (mode: SimulatorMode) => void;
  readonly className?: string;
}

const ICONS = { guided: Crosshair, free: Shuffle } as const;

const OPTIONS: readonly SegmentedOption<SimulatorMode>[] = SIMULATOR_MODE_OPTIONS.map(({ value, label }) => ({
  value,
  label,
  Icon: ICONS[value],
}));

/** Guided or free practice. Native radios: arrow keys move between the two. */
export function ModeSwitch({ mode, onChange, className }: ModeSwitchProps) {
  const description = SIMULATOR_MODE_OPTIONS.find((option) => option.value === mode)?.description;
  return (
    <div className={className}>
      <SegmentedRadioGroup legend="Practice mode" legendHidden options={OPTIONS} value={mode} onChange={onChange} />
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
