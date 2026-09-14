import { RadioGroupField } from '@/components';
import { cn } from '@/lib/cn';
import { SIMULATOR_MODE_OPTIONS, type SimulatorMode } from './simulatorMode';

export interface ModeSwitchProps {
  readonly mode: SimulatorMode;
  readonly onChange: (mode: SimulatorMode) => void;
  readonly className?: string;
}

/** Guided or free practice. Native radios: arrow keys move between the two. */
export function ModeSwitch({ mode, onChange, className }: ModeSwitchProps) {
  return (
    <RadioGroupField
      label="Practice mode"
      name="simulator-mode"
      options={SIMULATOR_MODE_OPTIONS}
      value={mode}
      onChange={onChange}
      className={cn('sm:[&>div]:grid-cols-2', className)}
    />
  );
}
