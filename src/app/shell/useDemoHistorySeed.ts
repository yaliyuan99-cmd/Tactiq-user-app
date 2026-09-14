import { useEffect, useRef } from 'react';
import { useAuth } from '@/services/auth/AuthProvider';
import { useDevice } from '@/services/device/DeviceProvider';
import { useServices } from '@/services/ServicesProvider';

/**
 * Demo Mode sample history.
 *
 * Why: a first-time Demo Mode user would otherwise open Home and History to
 * empty charts and have nothing to learn the screens from. The history service
 * writes a small set of sample records instead. Every one carries
 * `seeded: true` and `evidence: 'simulated'`, screens label them "Sample", and
 * they are removed by clearing history — they are never presented as the
 * user's own practice or as ring measurements.
 *
 * When: at most once per shell mount, as soon as both the account and the ring
 * are in Demo Mode (never for a Supabase account or a hardware ring). The
 * service itself also writes the samples at most once per browser, so a user
 * who cleared them does not get them back.
 */
export function useDemoHistorySeed(): void {
  const { mode: authMode } = useAuth();
  const { state } = useDevice();
  const { history } = useServices();
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current || authMode !== 'demo' || state.mode !== 'demo') return;
    requested.current = true;
    history.seedDemo();
  }, [authMode, state.mode, history]);
}
