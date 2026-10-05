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

/**
 * At most one chip per row: a point that is the target is never also a misread
 * (see contactVisualState). While any row carries one, every row keeps the
 * chip's column, so the targeted row is not the only one whose label is
 * narrowed — otherwise that row, the one the user must read, wrapped
 * mid-phrase while its neighbours stayed on one line, and the list jumped as
 * the target moved. Under 480 px a column would leave too little for the
 * label, so there the chip sits under it rather than taking width from it.
 */
function Badge({ state, reserved }: { state: ContactVisualState; reserved: boolean }) {
  const label = state.isTarget ? 'Target' : state.isMisread ? 'Detected here' : null;
  if (!label) {
    // An empty placeholder in the stacked layout would add a blank line to all eight rows.
    return reserved ? <span aria-hidden="true" className="hidden min-[480px]:block" /> : null;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'font-mono-label w-fit justify-self-start whitespace-nowrap rounded-sm border px-1.5 py-0.5 min-[480px]:justify-self-end',
        state.isMisread ? 'border-dashed border-destructive text-destructive' : 'border-primary-strong text-primary-strong',
      )}
    >
      {label}
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
  const rows = CONTACT_POINTS.map((point) => ({ point, state: contactVisualState(point.key, props) }));
  /** Only while a chip is on screen: without one the rows need no second column. */
  const reserveBadgeColumn = rows.some(({ state }) => state.isTarget || state.isMisread);

  return (
    <div className={className}>
      {caption && (
        <p id={captionId} className="mb-2 text-sm text-muted-foreground">
          {caption}
        </p>
      )}
      <ul className="grid gap-2" aria-labelledby={caption ? captionId : undefined}>
        {rows.map(({ point, state }) => {
          const rowClasses = cn(
            'grid min-h-12 w-full min-w-0 flex-1 items-center gap-x-3 gap-y-1.5 rounded-md border px-4 py-2.5 text-left',
            reserveBadgeColumn
              ? 'grid-cols-[minmax(0,1fr)] min-[480px]:grid-cols-[minmax(0,1fr)_7.25rem]'
              : 'grid-cols-[minmax(0,1fr)]',
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
              <Badge state={state} reserved={reserveBadgeColumn} />
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
