import { BatteryMedium, Wifi } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PHONE_ITEMS, type PhoneState } from './tryItModel';

export interface MockPhoneProps {
  readonly phone: PhoneState;
  readonly className?: string;
}

/** A drawing of a phone. Whatever shows it also says what happened in words, so it is not read twice. */
export function MockPhone({ phone, className }: MockPhoneProps) {
  const openItem = phone.open === null ? null : PHONE_ITEMS[phone.open];
  return (
    <div
      aria-hidden="true"
      className={cn(
        'mx-auto w-full max-w-[15rem] rounded-[2rem] border-[5px] border-border-strong bg-background p-3 shadow-card',
        className,
      )}
    >
      <div className="flex items-center justify-between px-1 pb-2 text-xs text-muted-foreground">
        <span>Example</span>
        <span className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          <BatteryMedium className="h-3.5 w-3.5" />
        </span>
      </div>
      {openItem ? (
        <div className="min-h-44 rounded-xl border-2 border-primary p-3">
          <p className="font-semibold">{openItem.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{openItem.detail}</p>
        </div>
      ) : (
        <ul className="grid min-h-44 gap-1.5">
          {PHONE_ITEMS.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                'rounded-lg border-2 px-2.5 py-1.5 text-sm transition-colors duration-[var(--dur-tap)]',
                index === phone.focus ? 'border-primary bg-secondary font-semibold' : 'border-transparent bg-muted',
              )}
            >
              {item.title}
              {item.id === 'music' && phone.playing ? ' (playing)' : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
