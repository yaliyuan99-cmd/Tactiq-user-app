import { type ReactNode } from 'react';
import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { VisuallyHidden } from './VisuallyHidden';

export type CalloutKind = 'info' | 'warning' | 'success' | 'danger';

const KIND_STYLES: Record<CalloutKind, { Icon: LucideIcon; border: string; icon: string; prefix: string }> = {
  info: { Icon: Info, border: 'border-l-status-simulation', icon: 'text-status-simulation', prefix: 'Note' },
  warning: { Icon: TriangleAlert, border: 'border-l-status-target', icon: 'text-status-target', prefix: 'Warning' },
  success: { Icon: CircleCheck, border: 'border-l-status-confirmed', icon: 'text-status-confirmed', prefix: 'Done' },
  danger: { Icon: OctagonAlert, border: 'border-l-destructive', icon: 'text-destructive', prefix: 'Important' },
};

export interface CalloutProps {
  readonly kind: CalloutKind;
  readonly title?: ReactNode;
  readonly children?: ReactNode;
  readonly role?: 'status' | 'alert' | 'note';
  readonly className?: string;
}

/** A highlighted message: icon + words, with a coloured left rule as a secondary cue. */
export function Callout({ kind, title, children, role, className }: CalloutProps) {
  const style = KIND_STYLES[kind];
  const { Icon } = style;
  return (
    <div
      role={role}
      data-kind={kind}
      className={cn('flex gap-3 rounded-md border border-l-4 border-border bg-card p-4', style.border, className)}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="font-semibold">{title}</p>
        ) : (
          <VisuallyHidden>{`${style.prefix}: `}</VisuallyHidden>
        )}
        {children && <div className={cn('text-foreground', title ? 'mt-1' : undefined)}>{children}</div>}
      </div>
    </div>
  );
}
