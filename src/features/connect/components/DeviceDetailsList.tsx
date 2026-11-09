import { type ReactNode } from 'react';
import { BATTERY_UNAVAILABLE_NOTE } from '@/domain/protocol';
import { splitBatteryNote } from '../connectLogic';

export interface DeviceDetail {
  readonly term: string;
  readonly value: ReactNode;
}

/** A description list of device facts: label above value on narrow screens, side by side from 640 px. */
export function DeviceDetailsList({ items }: { items: readonly DeviceDetail[] }) {
  return (
    <dl className="grid gap-x-6 divide-y divide-border rounded-lg bg-muted px-4 py-1 sm:grid-cols-[minmax(6rem,auto)_1fr]">
      {items.map((item) => (
        <div key={item.term} className="grid gap-0.5 py-2.5 sm:col-span-2 sm:grid-cols-subgrid sm:items-baseline">
          <dt className="text-sm text-muted-foreground">{item.term}</dt>
          <dd className="min-w-0 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The battery is never a number: the bench firmware only sends a fixed placeholder. */
export function BatteryNotReported() {
  const { lead, rest } = splitBatteryNote(BATTERY_UNAVAILABLE_NOTE);
  return (
    <>
      <span className="font-medium">{lead}</span>
      <span className="text-muted-foreground">{rest}</span>
    </>
  );
}
