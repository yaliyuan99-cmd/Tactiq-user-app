import { Hand, List } from 'lucide-react';
import { SegmentedRadioGroup, type SegmentedOption } from '@/components';
import type { PracticeView } from './practiceView';

export interface ViewSwitchProps {
  readonly value: PracticeView;
  readonly onChange: (view: PracticeView) => void;
  readonly className?: string;
}

const OPTIONS: readonly SegmentedOption<PracticeView>[] = [
  { value: 'hand', label: 'Hand view', Icon: Hand },
  { value: 'list', label: 'List view', Icon: List },
];

/**
 * A compact two-option radio group. Native radios, so arrow keys move between
 * the options and the choice is announced without extra code. Its labels say
 * what it does, so the legend is for screen readers.
 */
export function ViewSwitch({ value, onChange, className }: ViewSwitchProps) {
  return (
    <SegmentedRadioGroup
      legend="Show the contact points as"
      legendHidden
      options={OPTIONS}
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}
