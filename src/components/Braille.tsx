import { brailleCells } from '@/lib/braille';
import { cn } from '@/lib/cn';

/**
 * Text in braille, drawn as dots (see lib/braille). Always decorative: the
 * print beside it is what people and screen readers read, so it is hidden from
 * assistive technology.
 */
export interface BrailleProps {
  readonly text: string;
  /** Dot radius in CSS pixels. */
  readonly dot?: number;
  readonly className?: string;
}

export function Braille({ text, dot = 2.5, className }: BrailleProps) {
  const cells = brailleCells(text);
  const pitch = dot * 2.6;
  const cellWidth = pitch + dot * 2 + dot * 2.4;
  const width = Math.max(1, cells.length * cellWidth - dot * 2.4);
  const height = pitch * 2 + dot * 2;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('block shrink-0', className)}
    >
      {cells.flatMap((cell, index) =>
        cell.map((number) => (
          <circle
            key={`${index}-${number}`}
            cx={index * cellWidth + dot + (number > 3 ? pitch : 0)}
            cy={dot + ((number - 1) % 3) * pitch}
            r={dot}
            fill="currentColor"
          />
        )),
      )}
    </svg>
  );
}
