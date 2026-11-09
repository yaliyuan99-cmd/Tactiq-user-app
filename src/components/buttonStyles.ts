import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleOptions {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  readonly className?: string;
}

const BASE =
  'target-44 inline-flex items-center justify-center gap-2 rounded-md font-semibold leading-tight no-underline ' +
  'group/button select-none transition-[opacity,background-color,border-color,box-shadow,scale] duration-[var(--dur-tap)] active:scale-[0.97] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ' +
  'aria-busy:cursor-progress';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'border-[1.5px] border-border-strong bg-card text-foreground hover:border-foreground',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/[0.06]',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm',
  md: 'min-h-12 px-5 py-2.5',
  lg: 'min-h-14 px-7 py-3 text-lg',
};

/** Class list shared by Button, ButtonLink and anything that must look like a button. */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, className }: ButtonStyleOptions = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}
