import { useEffect, useId, useRef } from 'react';
import { Button, HoldRing } from '@/components';
import { cn } from '@/lib/cn';
import type { RingController } from './useRing';

export interface EmergencyHoldButtonProps {
  readonly ring: RingController;
  readonly disabled?: boolean;
  readonly className?: string;
}

const CONTACT = 'pinky_tip';

/**
 * The non-gesture way to perform the five-second hold, for screen-reader and
 * switch users who cannot keep a key or a finger down. Press once to start
 * holding the pinky fingertip, press again (or Escape) to let go. Renders
 * nothing when there is no simulated ring to operate.
 */
export function EmergencyHoldButton({ ring, disabled = false, className }: EmergencyHoldButtonProps) {
  const hintId = useId();
  const { pressStart, pressEnd, pressingContact } = ring;
  const holding = pressingContact === CONTACT;
  /** True while a hold started by this button is in progress, so the button can let go for the user. */
  const ownsHold = useRef(false);
  // Letting go is always possible; only starting a hold needs an open window.
  const unavailable = !holding && (disabled || !ring.armed);

  // The ring clears the press when the hold completes or is cancelled; lift the virtual finger too,
  // otherwise the simulated ring would still think the pinky fingertip is held.
  useEffect(() => {
    if (ownsHold.current && pressingContact !== CONTACT) {
      ownsHold.current = false;
      pressEnd(CONTACT);
    }
  }, [pressingContact, pressEnd]);

  useEffect(() => {
    if (!holding) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      pressEnd(CONTACT);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [holding, pressEnd]);

  useEffect(
    () => () => {
      if (ownsHold.current) pressEnd(CONTACT);
    },
    [pressEnd],
  );

  if (!ring.canOperate) return null;

  const toggle = () => {
    if (holding) {
      pressEnd(CONTACT);
      return;
    }
    ownsHold.current = true;
    pressStart(CONTACT);
  };

  let hint = 'Starts the hold without keeping a key pressed. Press again or press Escape to let go; letting go before five seconds cancels it.';
  if (holding) hint = 'Press again or press Escape to let go. Letting go before five seconds cancels the hold.';
  else if (disabled) hint = 'Not available right now.';
  else if (!ring.armed) hint = 'Squeeze first.';

  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      <div className="grid min-w-0 flex-1 basis-60 gap-1.5">
        <Button
          variant={holding ? 'primary' : 'secondary'}
          onClick={toggle}
          aria-disabled={unavailable || undefined}
          aria-describedby={hintId}
          className="h-auto whitespace-normal text-left"
        >
          {holding ? 'Release pinky fingertip' : 'Start five-second hold on pinky fingertip'}
        </Button>
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      </div>
      {holding && (
        <HoldRing progress={ring.holdProgress ?? 0} armed={ring.holdArmed} size={72} label="Emergency hold progress" />
      )}
    </div>
  );
}
