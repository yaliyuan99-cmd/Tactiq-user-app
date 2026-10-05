import { useCallback, useEffect, useRef, useState } from 'react';
import { ContactList, HandMap, type ContactMapStateProps } from '@/components';
import { getContact, type ContactKey } from '@/domain/contacts';
import type { Hand } from '@/domain/models';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { EmergencyHoldButton } from './EmergencyHoldButton';
import { EmergencyNotice } from './EmergencyNotice';
import { HAND_VIEW_TOO_NARROW_NOTE, handViewFits } from './handViewFit';
import { initialPracticeView, resultContact, storePracticeView, type PracticeView } from './practiceView';
import { describeRingResult } from './ringResults';
import { SqueezeControl } from './SqueezeControl';
import type { RingController } from './useRing';
import { useShortcutLabels } from './useShortcutLabels';
import { ViewSwitch } from './ViewSwitch';

export interface PracticeSurfaceProps {
  readonly ring: RingController;
  readonly hand: Hand;
  /** The point the user is asked to use. Drawn with a "Target" ring. */
  readonly targetContact?: ContactKey | null;
  /** Where a press landed, when the caller wants a misread shown ("Detected here"). */
  readonly detectedContact?: ContactKey | null;
  /** Words for each point. Defaults to the tap command with the user's shortcuts. */
  readonly labelFor?: (contact: ContactKey) => string;
  readonly caption?: string;
  /** The toggle-button alternative to a physical five-second hold. Default true. */
  readonly showEmergencyHold?: boolean;
  /** Shows the "Simulation only" notice after a completed emergency hold. Default true; pass false only if you show EmergencyNotice yourself. */
  readonly showEmergencyNotice?: boolean;
  /**
   * Controlled view. When omitted, the surface starts with the hand view (the list on screens narrower
   * than 480 px) and remembers the user's choice for this tab.
   */
  readonly view?: PracticeView;
  readonly onViewChange?: (view: PracticeView) => void;
  /** Keeps everything visible but inoperable. */
  readonly disabled?: boolean;
  readonly className?: string;
}

export const KEYBOARD_HINT =
  'Tab to a point, then press Enter or Space. Hold Enter or Space on the pinky fingertip for the emergency hold.';

/** The panel a practice surface sits on: a card from the small breakpoint up, edge to edge on narrow phones where every pixel of width helps the points. */
export const PRACTICE_PANEL_CLASSES = 'sm:rounded-lg sm:border sm:border-border sm:bg-card sm:p-6 sm:shadow-card';

/**
 * Everything a user needs to operate the ring on one screen: the squeeze
 * control, the contact points (hand drawing or list), the last result and the
 * emergency hold alternative. With a hardware ring the points are display-only
 * and show where the ring last detected a touch.
 */
export function PracticeSurface({
  ring,
  hand,
  targetContact,
  detectedContact,
  labelFor,
  caption,
  showEmergencyHold = true,
  showEmergencyNotice = true,
  view: controlledView,
  onViewChange,
  disabled = false,
  className,
}: PracticeSurfaceProps) {
  const { preferences } = usePreferences();
  const { labelFor: tapLabelFor, mapping } = useShortcutLabels();
  const [storedView, setStoredView] = useState<PracticeView>(initialPracticeView);
  const view = controlledView ?? storedView;

  const defaultLabelFor = useCallback(
    (contact: ContactKey) =>
      contact === 'pinky_tip' ? `${tapLabelFor(contact)}, or hold five seconds for Emergency` : tapLabelFor(contact),
    [tapLabelFor],
  );

  const changeView = (next: PracticeView) => {
    if (controlledView === undefined) {
      setStoredView(next);
      storePracticeView(next);
    }
    onViewChange?.(next);
  };

  const operable = ring.canOperate;

  // The hand drawing scales with this column while its interactive points stay 44 px, so
  // below handViewFits() neighbouring points would overlap: the list is used instead.
  const pointsRef = useRef<HTMLDivElement>(null);
  const [pointsWidth, setPointsWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = pointsRef.current;
    if (!element || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[entries.length - 1]?.contentRect.width;
      if (typeof width === 'number' && width > 0) setPointsWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const tooNarrowForHand = operable && pointsWidth !== null && !handViewFits(pointsWidth);
  const shownView: PracticeView = view === 'hand' && tooNarrowForHand ? 'list' : view;

  const lastContact = resultContact(ring.lastResult);
  const holdingPinky = ring.pressingContact === 'pinky_tip';
  const mapState: ContactMapStateProps = {
    interactive: operable,
    disabled,
    activeContact: operable ? ring.pressingContact : lastContact,
    targetContact,
    detectedContact,
    flashContact: ring.flashContact,
    holdProgress: holdingPinky ? (ring.holdProgress ?? 0) : null,
    holdArmed: holdingPinky && ring.holdArmed,
    holdLabel: 'Emergency hold progress',
    labelFor: labelFor ?? defaultLabelFor,
    caption,
    ...(operable ? { onPressStart: ring.pressStart, onPressEnd: ring.pressEnd } : {}),
  };

  const lastDescription = ring.lastResult ? describeRingResult(ring.lastResult, mapping) : null;
  const showNotice = showEmergencyNotice && ring.lastResult?.kind === 'emergency';
  const showHold = showEmergencyHold && operable;
  /** Row 2 of the left column. Without it the desktop grid is one row, so the squeeze card is not stretched to the height of the hand. */
  const hasSecondRow = showNotice || showHold;

  return (
    <div className={cn('@container', className)}>
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)] gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @3xl:items-start',
          hasSecondRow && '@3xl:grid-rows-[auto_1fr]',
        )}
      >
        <SqueezeControl ring={ring} disabled={disabled} className="@3xl:col-start-1 @3xl:row-start-1" />

        <div
          ref={pointsRef}
          className={cn(
            'grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 @3xl:col-start-2 @3xl:row-start-1',
            hasSecondRow && '@3xl:row-span-2',
          )}
        >
          <ViewSwitch value={view} onChange={changeView} />
          {view === 'hand' && tooNarrowForHand && (
            <p className="text-sm text-muted-foreground">{HAND_VIEW_TOO_NARROW_NOTE}</p>
          )}
          {operable && <p className="text-sm text-muted-foreground">{KEYBOARD_HINT}</p>}
          {shownView === 'hand' ? <HandMap hand={hand} size="md" {...mapState} /> : <ContactList {...mapState} />}
          {!operable && (
            <p className="font-medium">
              {lastContact ? `Last detected point: ${getContact(lastContact).label}` : 'No point detected yet.'}
            </p>
          )}
          {preferences.visualConfirmation && lastDescription && (
            <p className="rounded-md border border-border bg-card px-4 py-2.5">
              <span className="font-mono-label text-muted-foreground">Last:</span>{' '}
              <span className="font-medium">{lastDescription.shortLabel}</span>
            </p>
          )}
        </div>

        {hasSecondRow && (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 @3xl:col-start-1 @3xl:row-start-2">
            {showNotice && <EmergencyNotice />}
            {showHold && <EmergencyHoldButton ring={ring} disabled={disabled} />}
          </div>
        )}
      </div>
    </div>
  );
}
