/**
 * Ring upkeep while a calibration run is showing: keep the Demo Mode window
 * open (calibration has no time limit) and give the emergency arming cue that
 * a silent useRing would otherwise skip.
 */
import { useEffect } from 'react';
import { GATE_HOLD_MS } from '@/domain/timing';
import { EMERGENCY_ARMING_MESSAGE, REMAINING_TICK_MS, type RingController } from '@/features/practice';
import type { Say } from './useCalibrationVoice';

/** The squeeze gate plus one countdown tick: refreshing this close to the end keeps the window open throughout. */
export const WINDOW_REFRESH_MARGIN_MS = GATE_HOLD_MS + REMAINING_TICK_MS;

export function useRunRingUpkeep(running: boolean, ring: RingController, say: Say): void {
  const { isDemo, remainingMs, squeeze, holdArmed } = ring;

  // Demo Mode: refresh the window just before it would close, so the countdown never shows it closed mid-prompt.
  // The page's gate handler still reopens it if a throttled background tab lets it close.
  useEffect(() => {
    if (running && isDemo && remainingMs !== null && remainingMs <= WINDOW_REFRESH_MARGIN_MS) squeeze();
  }, [running, isDemo, remainingMs, squeeze]);

  // holdArmed turns true once per hold, at the two-second cue.
  useEffect(() => {
    if (running && holdArmed) say({ text: EMERGENCY_ARMING_MESSAGE, assertive: true, haptic: 'emergency_arming' });
  }, [running, holdArmed, say]);
}
