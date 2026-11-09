import { cn } from '@/lib/cn';

/**
 * An eight-dot braille cell: two columns of four, numbered the braille way
 * (1–3 and 7 down the left, 4–6 and 8 down the right). Tactiq's mark is the
 * letter t, dots 2, 3, 4 and 5. Decorative only.
 */
const POSITIONS: Readonly<Record<number, readonly [number, number]>> = {
  1: [0, 0],
  2: [0, 1],
  3: [0, 2],
  7: [0, 3],
  4: [1, 0],
  5: [1, 1],
  6: [1, 2],
  8: [1, 3],
};

const TACTIQ_DOTS: readonly number[] = [2, 3, 4, 5];

export interface DotCellProps {
  /** Raised dots, by braille number. */
  readonly dots?: readonly number[];
  /** Height in CSS pixels; the width follows. */
  readonly size?: number;
  readonly className?: string;
}

export function DotCell({ dots = TACTIQ_DOTS, size = 20, className }: DotCellProps) {
  return (
    <svg
      viewBox="0 0 12 22"
      width={(size * 12) / 22}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      {Object.entries(POSITIONS).map(([number, [column, row]]) => {
        const raised = dots.includes(Number(number));
        return (
          <circle
            key={number}
            cx={3 + column * 6}
            cy={3 + row * 5.33}
            r={raised ? 2.3 : 1.15}
            fill="currentColor"
            opacity={raised ? 1 : 0.32}
          />
        );
      })}
    </svg>
  );
}
