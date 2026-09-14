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
  'target-44 inline-flex items-center justify-center gap-2 rounded-md font-medium leading-tight no-underline ' +
  'select-none transition-[opacity,background-color,border-color] duration-[var(--dur-tap)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ' +
  'aria-busy:cursor-progress';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'border border-border-strong bg-transparent text-foreground hover:bg-secondary',
  ghost: 'bg-transparent text-foreground hover:bg-secondary',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm',
  md: 'min-h-12 px-5 py-2.5',
  lg: 'min-h-14 px-6 py-3 text-lg',
};

/** Class list shared by Button, ButtonLink and anything that must look like a button. */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth, className }: ButtonStyleOptions = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}
