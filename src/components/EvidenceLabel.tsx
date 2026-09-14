import { CalendarClock, CircleCheck, CircleOff, FlaskConical, Target, type LucideIcon } from 'lucide-react';
import { EVIDENCE, type EvidenceSource } from '@/domain/evidence';
import { cn } from '@/lib/cn';

const ICONS: Record<EvidenceSource, LucideIcon> = {
  simulated: FlaskConical,
  design_target: Target,
  design_intent: CalendarClock,
  not_available: CircleOff,
  measured: CircleCheck,
};

const TONES: Record<EvidenceSource, string> = {
  simulated: 'text-status-simulation',
  design_target: 'text-status-target',
  design_intent: 'text-status-future',
  not_available: 'text-status-future',
  measured: 'text-status-confirmed',
};

export interface EvidenceLabelProps {
  readonly kind: EvidenceSource;
  /** Appended after an em dash, e.g. "Simulated — practice only". */
  readonly detail?: string;
  readonly className?: string;
}

/** The evidence tag every figure carries. Icon + words; colour is only a secondary cue. */
export function EvidenceLabel({ kind, detail, className }: EvidenceLabelProps) {
  const Icon = ICONS[kind];
  const text = detail ? `${EVIDENCE[kind].label} — ${detail}` : EVIDENCE[kind].label;
  return (
    <span className={cn('font-mono-label inline-flex items-center gap-1.5 align-middle', TONES[kind], className)} data-evidence={kind}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
