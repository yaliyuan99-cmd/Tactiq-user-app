import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface HandLegendProps {
  /** Also explains the target and "detected here" markings used in practice and calibration. */
  readonly showStates?: boolean;
  readonly className?: string;
}

function Item({ swatch, children }: { swatch: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        {swatch}
      </span>
      <span>{children}</span>
    </li>
  );
}

/** Key to the markings on HandMap. Every marking is explained in words. */
export function HandLegend({ showStates = false, className }: HandLegendProps) {
  return (
    <ul className={cn('flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground', className)}>
      <Item swatch={<span className="h-3.5 w-3.5 rounded-full bg-foreground" />}>Fixed command</Item>
      <Item swatch={<span className="h-3.5 w-3.5 rounded-full bg-primary" />}>Shortcut you can customise</Item>
      <Item
        swatch={
          <>
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary" />
          </>
        }
      >
        Dashed ring: hold five seconds for Emergency
      </Item>
      {showStates && (
        <>
          <Item swatch={<span className="h-4 w-4 rounded-full border-[3px] border-primary-strong" />}>Solid ring: target</Item>
          <Item swatch={<span className="h-4 w-4 rounded-full border-[3px] border-dashed border-destructive" />}>
            Dashed red ring: detected here
          </Item>
        </>
      )}
    </ul>
  );
}
