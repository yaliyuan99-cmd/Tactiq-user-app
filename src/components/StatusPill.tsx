import {
  BluetoothConnected,
  BluetoothOff,
  BluetoothSearching,
  CircleAlert,
  FlaskConical,
  Loader2,
  Lock,
  RefreshCw,
  Unplug,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type ConnectionStatusKind =
  | 'demo'
  | 'unsupported'
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'permission_denied'
  | 'error';

interface StatusStyle {
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly tone: string;
  readonly spin?: boolean;
}

const STATUS_PILL_STYLES: Readonly<Record<ConnectionStatusKind, StatusStyle>> = {
  demo: { label: 'Demo Mode', Icon: FlaskConical, tone: 'text-status-simulation' },
  unsupported: { label: 'Bluetooth unavailable', Icon: BluetoothOff, tone: 'text-muted-foreground' },
  disconnected: { label: 'Disconnected', Icon: Unplug, tone: 'text-muted-foreground' },
  scanning: { label: 'Searching…', Icon: BluetoothSearching, tone: 'text-foreground' },
  connecting: { label: 'Connecting…', Icon: Loader2, tone: 'text-foreground', spin: true },
  connected: { label: 'Connected', Icon: BluetoothConnected, tone: 'text-status-confirmed' },
  reconnecting: { label: 'Reconnecting…', Icon: RefreshCw, tone: 'text-status-target' },
  permission_denied: { label: 'Permission needed', Icon: Lock, tone: 'text-status-target' },
  error: { label: 'Error', Icon: CircleAlert, tone: 'text-destructive' },
};

export interface StatusPillProps {
  readonly status: ConnectionStatusKind;
  /** Overrides the default text. */
  readonly label?: string;
  /** Pass 'status' when the pill should announce changes politely. */
  readonly role?: 'status';
  readonly className?: string;
}

export function StatusPill({ status, label, role, className }: StatusPillProps) {
  const style = STATUS_PILL_STYLES[status];
  const { Icon } = style;
  return (
    <span
      role={role}
      data-status={status}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-medium leading-none',
        style.tone,
        className,
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', style.spin && 'animate-spin')} aria-hidden="true" />
      <span>{label ?? style.label}</span>
    </span>
  );
}
