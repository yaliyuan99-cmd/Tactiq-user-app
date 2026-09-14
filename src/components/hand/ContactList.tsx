import { useId } from 'react';
import { CONTACT_POINTS, type ContactPoint } from '@/domain/contacts';
import { cn } from '@/lib/cn';
import { HoldRing } from '../HoldRing';
import { contactVisualState, DEFAULT_HOLD_LABEL, type ContactVisualState } from './contactState';
import { type ContactListProps } from './types';
import { useContactPress } from './useContactPress';

function Swatch({ state }: { state: ContactVisualState }) {
  return (
    <span aria-hidden="true" className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <span className={cn('h-3 w-3 rounded-full', state.isShortcut || state.isActive ? 'bg-primary' : 'bg-foreground')} />
      {state.isEmergencyCapable && <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary" />}
    </span>
  );
}

function Badges({ state }: { state: ContactVisualState }) {
  if (!state.isTarget && !state.isMisread) return null;
  return (
    <span aria-hidden="true" className="flex shrink-0 flex-wrap justify-end gap-1.5">
      {state.isTarget && (
        <span className="font-mono-label rounded-sm border border-primary-strong px-1.5 py-0.5 text-primary-strong">
          Target
        </span>
      )}
      {state.isMisread && (
        <span className="font-mono-label rounded-sm border border-dashed border-destructive px-1.5 py-0.5 text-destructive">
          Detected here
        </span>
      )}
    </span>
  );
}

function rowText(point: ContactPoint, labelFor: ContactListProps['labelFor']): string {
  return labelFor ? `${point.label} — ${labelFor(point.key)}` : point.label;
}

function stateWords(state: ContactVisualState): string {
  return `${state.isTarget ? ', target' : ''}${state.isMisread ? ', detected here' : ''}`;
}

/** Visible row text, then the same state words the hand map uses. */
function rowName(point: ContactPoint, state: ContactVisualState, labelFor: ContactListProps['labelFor']): string {
  return `${rowText(point, labelFor)}${stateWords(state)}`;
}

/**
 * The list-based alternative to HandMap: eight full-width buttons with the
 * same press semantics, for anyone who finds the drawing hard to use.
 */
export function ContactList(props: ContactListProps) {
  const {
    interactive = true,
    disabled = false,
    labelFor,
    caption,
    holdProgress,
    holdArmed = false,
    holdLabel = DEFAULT_HOLD_LABEL,
    className,
  } = props;
  const captionId = `contact-list-${useId().replace(/:/g, '')}`;
  const { getPressProps } = useContactPress(props);

  return (
    <div className={className}>
      {caption && (
        <p id={captionId} className="mb-2 text-sm text-muted-foreground">
          {caption}
        </p>
      )}
      <ul className="grid gap-2" aria-labelledby={caption ? captionId : undefined}>
        {CONTACT_POINTS.map((point) => {
          const state = contactVisualState(point.key, props);
          const rowClasses = cn(
            'flex min-h-12 w-full min-w-0 flex-1 items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-left',
            state.isActive ? 'border-primary bg-secondary ring-2 ring-primary' : 'border-border bg-card',
            state.isFlashing && 'contact-flash',
          );
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-3">
                <Swatch state={state} />
                <span className="font-medium">
                  {rowText(point, labelFor)}
                  {!interactive && stateWords(state) && <span className="sr-only">{stateWords(state)}</span>}
                </span>
              </span>
              <Badges state={state} />
            </>
          );
          return (
            <li key={point.key} className="flex items-center gap-3" data-contact={point.key}>
              {interactive ? (
                <button
                  type="button"
                  aria-label={rowName(point, state, labelFor)}
                  aria-pressed={state.isActive}
                  aria-disabled={disabled || undefined}
                  className={cn(
                    rowClasses,
                    'target-44 cursor-pointer touch-manipulation select-none [-webkit-touch-callout:none]',
                    !state.isActive && !disabled && 'hover:bg-secondary',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                  {...getPressProps(point.key)}
                >
                  {content}
                </button>
              ) : (
                <div className={rowClasses}>{content}</div>
              )}
              {state.showHold && typeof holdProgress === 'number' && (
                <HoldRing progress={holdProgress} armed={holdArmed} size={44} label={holdLabel} compact />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
