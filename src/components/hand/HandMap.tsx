import { useId } from 'react';
import { CONTACT_POINTS, getContact } from '@/domain/contacts';
import { cn } from '@/lib/cn';
import { HoldRing } from '../HoldRing';
import { HandFigure } from './HandFigure';
import { HandLegend } from './HandLegend';
import { contactAccessibleName, contactVisualState, DEFAULT_HOLD_LABEL, type ContactVisualState } from './contactState';
import { contactPosition } from './geometry';
import { type HandMapProps } from './types';
import { useContactPress } from './useContactPress';

/**
 * Maximum figure widths. The closest contact points (ring and pinky finger
 * bases) are about 37 of the drawing's 300 units apart, so 44px interactive
 * points only stay clear of each other when the figure is at least about 358px
 * wide (md and lg at full width; sm is narrower than that, so it is for
 * display-only maps). Narrower containers shrink the figure, and a caller that
 * cannot give the drawing 358px shows ContactList instead — PracticeSurface
 * measures its column and does exactly that. HandMap.test.tsx pins the 358px.
 * Decorative points scale with the figure instead, so they never overlap (see
 * DECORATIVE_POINT_SIZE).
 */
const SIZES: Record<NonNullable<HandMapProps['size']>, string> = {
  sm: 'max-w-[340px]',
  md: 'max-w-[408px]',
  lg: 'max-w-[476px]',
};

const HOLD_RING_SIZE = 76;

/**
 * Interactive points are real buttons: 44 CSS px, deliberately not rem-based, so
 * they meet the target size and larger text sizes do not make them collide.
 */
const INTERACTIVE_POINT_SIZE = 'h-[44px] min-h-[44px] w-[44px] min-w-[44px]';

/**
 * Decorative points (interactive={false}) are sized from the figure: 10% of its
 * width, between 20px and 40px, kept square. The closest centres (ring and pinky
 * finger bases) are 12.3% of the width apart, so neighbours keep a gap at any
 * width above about 163px; at a 280px container they are 28px wide with 6px
 * between the closest pair. HandMap.test.tsx checks this against geometry.ts.
 */
const DECORATIVE_POINT_SIZE = 'aspect-square w-[clamp(20px,10%,40px)]';

function pointClasses(state: ContactVisualState, interactive: boolean, disabled: boolean): string {
  const filled = state.isActive || state.isShortcut ? 'bg-primary text-primary-foreground' : 'bg-foreground text-background';
  return cn(
    'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
    interactive ? INTERACTIVE_POINT_SIZE : DECORATIVE_POINT_SIZE,
    'font-mono-label font-medium leading-none shadow-card transition-[scale,background-color] duration-[var(--dur-tap)]',
    filled,
    state.isActive && 'z-10 scale-110 ring-4 ring-primary/35',
    state.isFlashing && 'contact-flash',
    interactive && 'cursor-pointer touch-none select-none [-webkit-touch-callout:none]',
    interactive && !disabled && !state.isActive && 'hover:scale-105',
    disabled && 'cursor-not-allowed opacity-60',
  );
}

function PointDecorations({ state }: { state: ContactVisualState }) {
  return (
    <>
      {state.isEmergencyCapable && (
        <span
          aria-hidden="true"
          data-emergency-ring=""
          className="pointer-events-none absolute -inset-[5px] rounded-full border-2 border-dashed border-primary"
        />
      )}
      {state.isTarget && (
        <span
          aria-hidden="true"
          data-target-ring=""
          className="pointer-events-none absolute -inset-[9px] rounded-full border-[3px] border-primary-strong"
        />
      )}
      {state.isMisread && (
        <span
          aria-hidden="true"
          data-detected-ring=""
          className="pointer-events-none absolute -inset-[9px] rounded-full border-[3px] border-dashed border-destructive"
        />
      )}
      {(state.isTarget || state.isMisread) && (
        <span
          aria-hidden="true"
          className={cn(
            'font-mono-label pointer-events-none absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-card px-1.5 py-0.5 leading-none',
            state.isMisread ? 'border-dashed border-destructive text-destructive' : 'border-primary-strong text-primary-strong',
          )}
        >
          {state.isMisread ? 'Detected here' : 'Target'}
        </span>
      )}
    </>
  );
}

/**
 * The signature hand illustration with the eight contact points. The drawing is
 * decorative; each point is a real button (or a plain span when not
 * interactive), and a text alternative lists every point.
 */
export function HandMap(props: HandMapProps) {
  const {
    hand,
    interactive = true,
    disabled = false,
    labelFor,
    caption,
    showLegend = false,
    size = 'md',
    holdProgress,
    holdArmed = false,
    holdLabel = DEFAULT_HOLD_LABEL,
    activeContact,
    targetContact,
    detectedContact,
    className,
  } = props;
  const { getPressProps } = useContactPress(props);
  const handName = hand === 'left' ? 'Left' : 'Right';
  const captionId = `hand-map-${useId().replace(/:/g, '')}-caption`;
  const activePosition = activeContact ? contactPosition(activeContact, hand) : null;

  return (
    <figure
      className={cn('mx-auto w-full', SIZES[size], className)}
      aria-labelledby={caption ? captionId : undefined}
      aria-label={caption ? undefined : `${handName} hand contact map`}
      data-hand={hand}
    >
      <div className="relative aspect-[3/4] w-full text-foreground">
        <HandFigure hand={hand} className="absolute inset-0 h-full w-full" />

        {activePosition && typeof holdProgress === 'number' && (
          <div
            className="pointer-events-none absolute z-0"
            style={{
              left: activePosition.left,
              top: activePosition.top,
              transform: `translate(-50%, -${HOLD_RING_SIZE / 2}px)`,
            }}
          >
            <HoldRing progress={holdProgress} armed={holdArmed} size={HOLD_RING_SIZE} label={holdLabel} compact />
          </div>
        )}

        {CONTACT_POINTS.map((point) => {
          const state = contactVisualState(point.key, props);
          const position = contactPosition(point.key, hand);
          const style = { left: position.left, top: position.top };
          const common = {
            'data-contact': point.key,
            className: pointClasses(state, interactive, disabled),
            style,
          };
          if (!interactive) {
            return (
              <span key={point.key} aria-hidden="true" {...common}>
                {point.abbreviation}
                <PointDecorations state={state} />
              </span>
            );
          }
          return (
            <button
              key={point.key}
              type="button"
              aria-label={contactAccessibleName(state, labelFor)}
              aria-pressed={state.isActive}
              aria-disabled={disabled || undefined}
              {...common}
              {...getPressProps(point.key)}
            >
              <span aria-hidden="true">{point.abbreviation}</span>
              <PointDecorations state={state} />
            </button>
          );
        })}
      </div>

      {showLegend && (
        <HandLegend
          className="mt-4"
          showStates={targetContact !== undefined || detectedContact !== undefined}
        />
      )}
      {caption && (
        <figcaption id={captionId} className="mt-3 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}

      <div className="sr-only">
        <p>
          {handName} hand, palm facing you, thumb on the {hand === 'left' ? 'right' : 'left'}. The ring sits on the index
          finger. Eight contact points:
        </p>
        <ul>
          {CONTACT_POINTS.map((point) => {
            const state = contactVisualState(point.key, props);
            return (
              <li key={point.key}>
                {getContact(point.key).label}
                {labelFor ? `: ${labelFor(point.key)}` : ''}
                {state.isTarget ? ', target' : ''}
                {state.isMisread ? ', detected here' : ''}
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}
