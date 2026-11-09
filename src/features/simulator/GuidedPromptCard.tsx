import { CircleAlert, CircleCheck, CircleX, RotateCcw, SkipForward, type LucideIcon } from 'lucide-react';
import { Button, CheckboxField, EvidenceLabel } from '@/components';
import type { HistoryEvidence } from '@/features/practice/toGestureEvent';
import { cn } from '@/lib/cn';
import { describeTarget, scoreLine, type GuidedVerdict } from './guided';
import { CARD_CLASSES, SIMULATOR_HEADING_IDS } from './simulatorIds';
import type { GuidedPractice } from './useGuidedPractice';

export interface GuidedPromptCardProps {
  readonly guided: GuidedPractice;
  readonly evidence: HistoryEvidence;
  /**
   * Whether the five-second hold button is on the page. It only exists for the
   * simulated ring, so the Emergency hint must not offer it to someone holding
   * a bench ring. Default true.
   */
  readonly showHoldButton?: boolean;
  readonly className?: string;
}

const VERDICT_STYLES: Readonly<Record<GuidedVerdict, { Icon: LucideIcon; tone: string; ground: string }>> = {
  correct: { Icon: CircleCheck, tone: 'text-status-confirmed', ground: 'border-status-confirmed bg-status-confirmed/10' },
  wrong: { Icon: CircleX, tone: 'text-destructive', ground: 'border-destructive bg-destructive/10' },
  not_recognised: { Icon: CircleAlert, tone: 'text-status-target', ground: 'border-status-target bg-status-target/10' },
};

function TargetHint({ target, showHoldButton }: { target: GuidedPractice['target']; showHoldButton: boolean }) {
  if (target === 'emergency') {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Hold the pinky fingertip for five full seconds{showHoldButton ? ', or use the five-second hold button' : ''}. Letting
        go early cancels it. This is a simulation: nothing is sent.
      </p>
    );
  }
  if (target === 'quick_action_1') {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Keep the tap brief. A long hold on this point is the emergency hold.
      </p>
    );
  }
  return null;
}

/** Guided practice: the command to find, ways to hear it again or skip it, and how the last attempt went. */
export function GuidedPromptCard({ guided, evidence, showHoldButton = true, className }: GuidedPromptCardProps) {
  const words = describeTarget(guided.target);
  const { feedback } = guided;
  const verdict = feedback ? VERDICT_STYLES[feedback.verdict] : null;

  return (
    <section aria-labelledby={SIMULATOR_HEADING_IDS.target} className={cn(CARD_CLASSES, className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={SIMULATOR_HEADING_IDS.target} className="font-mono-label text-muted-foreground">
          Your target
        </h2>
        {guided.advancing && (
          <span className="font-mono-label inline-flex items-center gap-1.5 text-status-confirmed">
            <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Done
          </span>
        )}
      </div>

      <p key={guided.target} className="animate-enter-rise mt-2 text-3xl font-bold leading-tight text-balance" data-target={guided.target}>
        <span className="marker">{words.visible}</span>
      </p>
      <TargetHint target={guided.target} showHoldButton={showHoldButton} />

      <div
        key={feedback ? feedback.message : 'waiting'}
        className={cn(
          'animate-enter-rise mt-4 rounded-lg border px-3 py-2.5',
          feedback && verdict ? verdict.ground : 'border-border bg-muted',
        )}
      >
        <p className="font-mono-label text-muted-foreground">Last attempt</p>
        {feedback && verdict ? (
          <p className="mt-1 flex items-start gap-2 font-medium">
            <verdict.Icon className={cn('mt-1 h-4 w-4 shrink-0', verdict.tone)} aria-hidden="true" />
            <span>{feedback.message}</span>
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">None yet. Squeeze the ring, then tap the target point.</p>
        )}
      </div>

      <div className="mt-4">
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="font-medium tabular-nums">{scoreLine(guided.score)}</span>
          <EvidenceLabel kind={evidence} />
        </p>
        <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full origin-left rounded-full bg-primary transition-transform duration-[var(--dur-move)]"
            style={{ transform: `scaleX(${guided.score.attempts > 0 ? guided.score.correct / guided.score.attempts : 0})` }}
          />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<RotateCcw className="h-4 w-4" />}
          onClick={guided.repeatPrompt}
        >
          Repeat the prompt
        </Button>
        <Button variant="secondary" size="sm" leadingIcon={<SkipForward className="h-4 w-4" />} onClick={guided.skip}>
          Skip
        </Button>
      </div>

      <CheckboxField
        containerClassName="mt-4"
        label="Include the five-second emergency hold"
        hint="Adds Emergency to the targets. Practice only: nothing is sent."
        checked={guided.includeEmergency}
        onChange={(event) => guided.setIncludeEmergency(event.target.checked)}
      />
    </section>
  );
}
