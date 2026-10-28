/**
 * The one hook a practice screen needs to operate the ring and hear it.
 *
 * It reads the command window from the device state, listens to the device
 * event stream (without re-rendering on events it does not use), turns
 * outcomes into RingResults, and announces gate changes, results and the
 * emergency arming cue exactly once each. Inputs drive the simulated ring in
 * Demo Mode and are silent no-ops when a hardware ring is active.
 *
 * `activating` is true from the squeeze until the window opens (GATE_HOLD_MS).
 * A tap in that moment is still dropped, but it is reported as the window
 * still opening — a polite announcement, not an interrupting error.
 *
 * Call it once per screen and pass the returned object down (PracticeSurface,
 * SqueezeControl and EmergencyHoldButton all take it as `ring`). A second
 * instance on the same screen would announce everything twice unless it is
 * created with `announce: false`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContactKey } from '@/domain/contacts';
import { describeDeviceState } from '@/lib/deviceStatus';
import { useDevice } from '@/services/device/DeviceProvider';
import type { DeviceEvent, DeviceMode } from '@/services/device/types';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import type { FeedbackKind } from '@/services/feedback/types';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { useCommandMapping } from '@/services/ServicesProvider';
import {
  EMERGENCY_ARMING_MESSAGE,
  describeGate,
  describeRingResult,
  ringResultFromEvent,
  type RingResult,
} from './ringResults';
import type { RingController as SharedRingController, UseRingOptions } from './ringController';

export type { UseRingOptions } from './ringController';

/**
 * What a practice screen reads from `useRing`: the shared controller plus the
 * activation phase, which only this hook can report (it comes from the ring's
 * event stream, not from the device state).
 */
export interface RingController extends SharedRingController {
  /**
   * A squeeze has been received and the command window has not opened yet —
   * the GATE_HOLD_MS wait. Show it as "opening" rather than as closed, so a
   * quick tap in that moment is explained, not blamed. Always false with a
   * hardware ring: the protocol reports only armed and idle.
   */
  readonly activating: boolean;
}

/** How long a recognised contact keeps its visual-confirmation flash. */
export const FLASH_MS = 700;
/** How often `remainingMs` updates while the window is open. */
export const REMAINING_TICK_MS = 100;

interface PressState {
  readonly contact: ContactKey | null;
  readonly progress: number | null;
  readonly armed: boolean;
}

const IDLE_PRESS: PressState = { contact: null, progress: null, armed: false };

/**
 * A press released after the window's closing time closes the window in the same moment. Within this
 * margin the result's announcement also says the window closed, so the two never overwrite each other.
 */
const CLOSE_MARGIN_MS = 50;

export function useRing(options: UseRingOptions = {}): RingController {
  const { state, mock, subscribe } = useDevice();
  const { feedback } = useFeedback();
  const { preferences } = usePreferences();
  const mapping = useCommandMapping().get().shortcuts;

  const mode = state.mode;
  const armed = state.gate.armed;
  const closesAt = state.gate.closesAt;
  const windowMs = state.commandWindowMs;

  const [press, setPress] = useState<PressState>(IDLE_PRESS);
  const [activating, setActivating] = useState(false);
  const [lastResult, setLastResult] = useState<RingResult | null>(null);
  const [flash, setFlash] = useState<ContactKey | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  // A result from the simulated ring must not linger once a hardware ring is active, or the other way round.
  const [trackedMode, setTrackedMode] = useState<DeviceMode>(mode);
  if (trackedMode !== mode) {
    setTrackedMode(mode);
    setPress(IDLE_PRESS);
    setActivating(false);
    setLastResult(null);
    setFlash(null);
  }

  const latest = useRef({ options, feedback, mapping, windowMs });
  useEffect(() => {
    latest.current = { options, feedback, mapping, windowMs };
  });

  const gateRef = useRef({ armed, closesAt });
  /** The last result's announcement already said the window closed, so the gate event that follows stays quiet. */
  const closeCoveredRef = useRef(false);
  const armingAnnouncedRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    gateRef.current = { armed, closesAt };
  }, [armed, closesAt]);

  useEffect(
    () => () => {
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const say = (kind: FeedbackKind, message: string) => {
      if (latest.current.options.announce !== false) latest.current.feedback(kind, message);
    };

    const startFlash = (contact: ContactKey) => {
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
      setFlash(contact);
      flashTimerRef.current = setTimeout(() => {
        flashTimerRef.current = null;
        setFlash(null);
      }, FLASH_MS);
    };

    const onResult = (event: DeviceEvent) => {
      const result = ringResultFromEvent(event);
      if (!result) return;
      setPress(IDLE_PRESS);
      setLastResult(result);
      if (result.kind === 'command') startFlash(result.contact);
      const description = describeRingResult(result, latest.current.mapping);
      const gate = gateRef.current;
      // A completed hold always closes the window; a dropped or cancelled press closes it when time ran out mid-press.
      const closesNow =
        result.kind === 'emergency' ||
        (result.kind !== 'command' && gate.armed && gate.closesAt !== null && gate.closesAt - result.at <= CLOSE_MARGIN_MS);
      closeCoveredRef.current = closesNow;
      const message =
        closesNow && result.kind !== 'emergency'
          ? `${description.message} ${describeGate(false, latest.current.windowMs)}`
          : description.message;
      say(description.feedbackKind, message);
      latest.current.options.onResult?.(result);
    };

    return subscribe((event) => {
      switch (event.type) {
        case 'activating':
          setActivating(event.active);
          return;
        case 'gate': {
          setActivating(false);
          const wasArmed = gateRef.current.armed;
          gateRef.current = { armed: event.armed, closesAt: event.closesAt };
          if (!event.armed) setPress(IDLE_PRESS);
          if (wasArmed === event.armed) return;
          const covered = closeCoveredRef.current;
          closeCoveredRef.current = false;
          if (event.armed || !covered) {
            say(event.armed ? 'armed' : 'window_closed', describeGate(event.armed, latest.current.windowMs));
          }
          latest.current.options.onGate?.(event.armed);
          return;
        }
        case 'press':
          armingAnnouncedRef.current = false;
          setPress({ contact: event.contact, progress: null, armed: false });
          return;
        case 'hold_progress': {
          const progress = event.totalMs > 0 ? Math.min(1, Math.max(0, event.elapsedMs / event.totalMs)) : 0;
          setPress({ contact: event.contact, progress, armed: event.armingCueReached });
          if (event.armingCueReached && !armingAnnouncedRef.current) {
            armingAnnouncedRef.current = true;
            say('emergency_arming', EMERGENCY_ARMING_MESSAGE);
          }
          return;
        }
        case 'token':
        case 'reject':
          onResult(event);
          return;
        default:
          return;
      }
    });
  }, [subscribe]);

  useEffect(() => {
    if (!armed || closesAt === null) return undefined;
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), REMAINING_TICK_MS);
    return () => clearInterval(id);
  }, [armed, closesAt]);

  const squeeze = useCallback(() => {
    mock?.squeeze();
  }, [mock]);
  const pressStart = useCallback(
    (contact: ContactKey) => {
      mock?.pressStart(contact);
    },
    [mock],
  );
  const pressEnd = useCallback(
    (contact: ContactKey) => {
      mock?.pressEnd(contact);
    },
    [mock],
  );
  const cancel = useCallback(() => {
    if (!mock) return;
    mock.cancel();
    // Cancelling a press on a fixed point emits nothing, so the local press state is cleared here.
    setPress(IDLE_PRESS);
  }, [mock]);
  const closeWindow = useCallback(() => {
    if (!mock) return;
    mock.closeWindow();
    setPress(IDLE_PRESS);
  }, [mock]);

  const remainingMs = armed && closesAt !== null ? Math.min(windowMs, Math.max(0, closesAt - clock)) : null;

  return {
    mode,
    isDemo: mode === 'demo',
    canOperate: mock !== null,
    canReceive: describeDeviceState(state).canReceiveCommands,
    armed,
    activating: activating && !armed,
    closesAt,
    windowMs,
    remainingMs,
    pressingContact: press.contact,
    holdProgress: press.progress,
    holdArmed: press.armed,
    lastResult,
    flashContact: preferences.visualConfirmation ? flash : null,
    squeeze,
    pressStart,
    pressEnd,
    cancel,
    closeWindow,
  };
}
