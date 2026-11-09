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

/*
 * Each kind of evidence is a different mark, the way the project's logbook
 * marks it: highlighter for what is only simulated, an ink box for what was
 * measured, dashed pencil for targets and intentions, red pen for what is not
 * there. The words say the same thing, so the mark is never needed to read it.
 */
const MARKS: Record<EvidenceSource, string> = {
  simulated: 'bg-[var(--highlight)] text-[var(--highlight-ink)]',
  measured: 'border-[1.5px] border-foreground text-foreground',
  design_target: 'border-[1.5px] border-dashed border-muted-foreground text-muted-foreground',
  design_intent: 'border-[1.5px] border-dashed border-muted-foreground text-muted-foreground',
  not_available: 'border-[1.5px] border-destructive text-destructive',
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
    <span
      className={cn('font-mono-label inline-flex items-center gap-1.5 rounded-[3px] px-1.5 py-0.5 align-middle leading-tight', MARKS[kind], className)}
      data-evidence={kind}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
