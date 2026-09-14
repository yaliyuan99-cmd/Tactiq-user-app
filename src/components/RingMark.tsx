import { cn } from '@/lib/cn';

export interface RingMarkProps {
  /** Width in CSS pixels; the height follows the mark's proportions. */
  readonly size?: number;
  readonly className?: string;
}

/** The ring as drawn on the hand illustration: two short orange bars. Decorative only. */
export function RingMark({ size = 20, className }: RingMarkProps) {
  return (
    <svg
      viewBox="0 0 24 16"
      width={size}
      height={(size * 16) / 24}
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0 text-primary', className)}
    >
      <rect x="2" y="3" width="20" height="3.5" rx="1.75" fill="currentColor" />
      <rect x="2" y="9.5" width="20" height="3.5" rx="1.75" fill="currentColor" />
    </svg>
  );
}
