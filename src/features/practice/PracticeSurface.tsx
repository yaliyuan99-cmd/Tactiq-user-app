import { useCallback, useState } from 'react';
import { ContactList, HandMap, type ContactMapStateProps } from '@/components';
import { getContact, type ContactKey } from '@/domain/contacts';
import type { Hand } from '@/domain/models';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { EmergencyHoldButton } from './EmergencyHoldButton';
import { EmergencyNotice } from './EmergencyNotice';
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

  return (
    <div className={cn('@container', className)}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] @3xl:grid-rows-[auto_1fr] @3xl:items-start">
        <SqueezeControl ring={ring} disabled={disabled} className="@3xl:col-start-1 @3xl:row-start-1" />

        <div className="grid min-w-0 gap-4 @3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1">
          <ViewSwitch value={view} onChange={changeView} />
          {operable && <p className="text-sm text-muted-foreground">{KEYBOARD_HINT}</p>}
          {view === 'hand' ? <HandMap hand={hand} size="md" {...mapState} /> : <ContactList {...mapState} />}
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

        {(showNotice || showHold) && (
          <div className="grid min-w-0 gap-4 @3xl:col-start-1 @3xl:row-start-2">
            {showNotice && <EmergencyNotice />}
            {showHold && <EmergencyHoldButton ring={ring} disabled={disabled} />}
          </div>
        )}
      </div>
    </div>
  );
}
