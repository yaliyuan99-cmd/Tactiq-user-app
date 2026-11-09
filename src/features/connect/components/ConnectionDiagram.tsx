import {
  BluetoothConnected,
  BluetoothSearching,
  CircleAlert,
  FlaskConical,
  Smartphone,
  Unplug,
  type LucideIcon,
} from 'lucide-react';
import { RingMark, type ConnectionStatusKind } from '@/components';
import { cn } from '@/lib/cn';

interface LinkStyle {
  readonly Icon: LucideIcon;
  readonly stroke: string;
  readonly icon: string;
  /** Dashes say nothing is proven yet. A solid line is a real, working link. */
  readonly solid: boolean;
  readonly flowing: boolean;
}

const MOVING: LinkStyle = { Icon: BluetoothSearching, stroke: 'stroke-primary', icon: 'text-primary-strong', solid: false, flowing: true };
const NO_LINK: LinkStyle = { Icon: Unplug, stroke: 'stroke-border-strong', icon: 'text-muted-foreground', solid: false, flowing: false };

const LINK_STYLES: Readonly<Record<ConnectionStatusKind, LinkStyle>> = {
  demo: { ...MOVING, Icon: FlaskConical },
  connected: { Icon: BluetoothConnected, stroke: 'stroke-status-confirmed', icon: 'text-status-confirmed', solid: true, flowing: false },
  scanning: MOVING,
  connecting: MOVING,
  reconnecting: MOVING,
  disconnected: NO_LINK,
  unsupported: NO_LINK,
  permission_denied: NO_LINK,
  error: { Icon: CircleAlert, stroke: 'stroke-destructive', icon: 'text-destructive', solid: false, flowing: false },
};

function End({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="grid shrink-0 justify-items-center gap-1.5 text-sm">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-border bg-card">{children}</span>
      {label}
    </span>
  );
}

/**
 * The ring, this app and the link between them, drawn in the state the words
 * beside it describe. A picture of that sentence, so it is hidden from screen readers.
 */
export function ConnectionDiagram({ kind, className }: { kind: ConnectionStatusKind; className?: string }) {
  const { Icon, stroke, icon, solid, flowing } = LINK_STYLES[kind];
  return (
    <div aria-hidden="true" className={cn('flex items-start gap-1', className)}>
      <End label="Ring">
        <RingMark size={30} />
      </End>
      <span className="relative mt-5 h-4 min-w-12 flex-1">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 16">
          <line
            x1="0"
            x2="100"
            y1="8"
            y2="8"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={solid ? undefined : '6 10'}
            className={cn(stroke, flowing && 'link-flow')}
          />
        </svg>
        <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-background">
          <Icon className={cn('h-4 w-4', icon)} />
        </span>
      </span>
      <End label="This app">
        <Smartphone className="h-6 w-6 text-primary-strong" />
      </End>
    </div>
  );
}
