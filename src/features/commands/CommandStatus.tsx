import { Lock, Pencil, ShieldAlert, type LucideIcon } from 'lucide-react';
import { type CommandKind } from '@/domain/commands';
import { cn } from '@/lib/cn';
import { statusLabel } from './commandPresentation';

const ICONS: Readonly<Record<CommandKind, LucideIcon>> = {
  fixed: Lock,
  shortcut: Pencil,
  emergency: ShieldAlert,
};

const ICON_TONES: Readonly<Record<CommandKind, string>> = {
  fixed: 'text-muted-foreground',
  shortcut: 'text-primary-strong',
  emergency: 'text-primary-strong',
};

/** Whether a command can be changed, as an icon plus words. The words carry the meaning. */
export function CommandStatus({ kind, className }: { kind: CommandKind; className?: string }) {
  const Icon = ICONS[kind];
  return (
    <span className={cn('inline-flex items-start gap-1.5', className)} data-status={kind}>
      <Icon className={cn('mt-1 h-4 w-4 shrink-0', ICON_TONES[kind])} aria-hidden="true" />
      <span className={kind === 'fixed' ? undefined : 'font-medium'}>{statusLabel(kind)}</span>
    </span>
  );
}
