import { Link } from 'react-router';
import { Hand, Timer, TimerOff } from 'lucide-react';
import { Button, ProgressBar } from '@/components';
import { ROUTES } from '@/app/routes';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { windowSeconds } from './ringResults';
import type { RingController } from './useRing';

export interface SqueezeControlProps {
  readonly ring: RingController;
  /** Shows the squeeze button as unavailable (for example once a lesson is finished). */
  readonly disabled?: boolean;
  readonly className?: string;
}

const LINK_CLASSES = 'font-medium text-primary-strong underline';

/** "2.4" normally; whole seconds, rounded up, when reduced motion is on so the text changes less often. */
function remainingText(ms: number, reducedMotion: boolean): string {
  return reducedMotion ? String(Math.ceil(ms / 1000)) : (ms / 1000).toFixed(1);
}

function WindowState({ ring, reducedMotion }: { ring: RingController; reducedMotion: boolean }) {
  // The squeeze has registered but the window has not opened yet. Saying
  // "closed, squeeze to open it" here is wrong twice over: the user has just
  // squeezed, and a tap landing in this gap is rejected with no warning that
  // anything was happening. The timing rule is unchanged; only the feedback is.
  if (ring.activating) {
    return (
      <p className="flex items-start gap-2 font-medium">
        <Timer className="mt-1 h-4 w-4 shrink-0 text-primary-strong" aria-hidden="true" />
        {/* Not "Command window opening": that reads as a prefix of "Command
            window open" for anything matching on text, including a person
            skimming. The gate is a different state, so it gets different words. */}
        <span>Opening the command window…</span>
      </p>
    );
  }
  if (!ring.armed || ring.remainingMs === null) {
    return (
      <p className="flex items-start gap-2">
        <TimerOff className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>
          {ring.canOperate
            ? 'Command window closed. Squeeze to open it.'
            : 'Command window closed. Squeeze the ring to open it.'}
        </span>
      </p>
    );
  }
  const seconds = remainingText(ring.remainingMs, reducedMotion);
  const step = reducedMotion ? Math.ceil(ring.remainingMs / 1000) * 1000 : ring.remainingMs;
  return (
    <div className="grid gap-2">
      <p className="flex items-start gap-2 font-medium">
        <Timer className="mt-1 h-4 w-4 shrink-0 text-primary-strong" aria-hidden="true" />
        <span>
          {ring.pressingContact
            ? 'Command window open · held open while a point is pressed'
            : `Command window open · ${seconds} s left`}
        </span>
      </p>
      <ProgressBar
        label="Command window time left"
        value={Math.min(step, ring.windowMs)}
        max={ring.windowMs}
        showValueText={false}
        valueText={`${seconds} seconds left`}
      />
    </div>
  );
}

/**
 * How to get more time. Every stated length is the window the device is
 * actually using (`state.commandWindowMs`), and Longer interaction time is
 * only mentioned as being in effect in Demo Mode: the bench firmware's window
 * is fixed, so the preference changes nothing while a ring is connected.
 */
function TimeHint({ ring, longerTime }: { ring: RingController; longerTime: boolean }) {
  if (!ring.isDemo) {
    return (
      <p className="text-sm text-muted-foreground">
        Time left is the app’s estimate. The bench ring keeps its own {windowSeconds(ring.windowMs)}-second window, so{' '}
        <Link to={ROUTES.settings} className={LINK_CLASSES}>
          Longer interaction time
        </Link>{' '}
        only changes practice in Demo Mode.
      </p>
    );
  }
  if (longerTime) {
    return (
      <p className="text-sm text-muted-foreground">
        Longer interaction time is on, so the window stays open for {windowSeconds(ring.windowMs)} seconds.{' '}
        <Link to={ROUTES.settings} className={LINK_CLASSES}>
          Change this in Settings
        </Link>
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Need more time? Turn on{' '}
      <Link to={ROUTES.settings} className={LINK_CLASSES}>
        Longer interaction time in Settings
      </Link>
      .
    </p>
  );
}

const DIAL_RADIUS = 58;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

/**
 * The round squeeze button. The ring around it drains as the window runs out.
 * It repeats the progress bar beside it, so it is hidden from screen readers.
 */
function SqueezeDial({ ring, disabled, reducedMotion }: { ring: RingController; disabled: boolean; reducedMotion: boolean }) {
  const left = ring.armed && ring.remainingMs !== null ? Math.min(ring.remainingMs / ring.windowMs, 1) : 0;
  const shown = reducedMotion && left > 0 ? Math.ceil(left * 4) / 4 : left;
  return (
    <div className="relative grid h-[7.5rem] w-[7.5rem] shrink-0 place-items-center">
      <svg aria-hidden="true" viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={DIAL_RADIUS} fill="none" strokeWidth="3" className="stroke-border" />
        <circle
          cx="60"
          cy="60"
          r={DIAL_RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={DIAL_CIRCUMFERENCE}
          strokeDashoffset={DIAL_CIRCUMFERENCE * (1 - shown)}
          className={cn('stroke-primary', !reducedMotion && 'transition-[stroke-dashoffset] duration-100 ease-linear')}
        />
      </svg>
      <Button
        onClick={ring.squeeze}
        aria-disabled={disabled || undefined}
        leadingIcon={<Hand className="h-6 w-6" />}
        className={cn(
          'h-[6.5rem] w-[6.5rem] flex-col gap-1 rounded-full! whitespace-normal px-2 text-center text-sm leading-tight',
          ring.armed && 'window-open',
        )}
      >
        Squeeze the ring
      </Button>
    </div>
  );
}

/**
 * Opens the command window. In Demo Mode it is a large button that squeezes
 * the simulated ring; with a hardware ring it explains the physical squeeze.
 * Nothing here is a live region: useRing announces window changes.
 */
export function SqueezeControl({ ring, disabled = false, className }: SqueezeControlProps) {
  const { preferences, prefersReducedMotion } = usePreferences();

  return (
    <div className={cn('grid gap-3', className)} data-armed={ring.armed || undefined}>
      {ring.canOperate ? (
        <div className="flex items-center gap-5">
          <SqueezeDial ring={ring} disabled={disabled} reducedMotion={prefersReducedMotion} />
          {/* Held at the height of the open state, so the hand below does not jump when the window opens. */}
          <div className="grid min-h-20 min-w-0 flex-1 content-center">
            <WindowState ring={ring} reducedMotion={prefersReducedMotion} />
          </div>
        </div>
      ) : (
        <>
          <p className="font-medium">Squeeze the physical ring to open the command window.</p>
          {!ring.canReceive && (
            <p className="text-sm">
              No ring is connected, so no commands can arrive yet.{' '}
              <Link to={ROUTES.connect} className={LINK_CLASSES}>
                Connect a ring
              </Link>
            </p>
          )}
          <WindowState ring={ring} reducedMotion={prefersReducedMotion} />
        </>
      )}

      <TimeHint ring={ring} longerTime={preferences.longerInteractionTime} />
    </div>
  );
}
