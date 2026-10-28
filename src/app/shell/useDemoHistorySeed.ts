import { useAuth } from '@/services/auth/AuthProvider';
import { useDevice } from '@/services/device/DeviceProvider';
import { useHistory } from '@/services/ServicesProvider';

export interface DemoHistorySeed {
  /** True when sample records can be added: Demo Mode account, Demo Mode ring, none added for this profile yet. */
  readonly canSeed: boolean;
  /** True when this profile has already had its sample records, whether or not they are still there. */
  readonly hasSeeded: boolean;
  /** Adds the sample records and returns how many were added. Zero when `canSeed` is false. */
  readonly seed: () => number;
}

/**
 * Demo Mode sample history, added only when somebody asks for it.
 *
 * Why it is offered: a first-time Demo Mode user would otherwise open Home and
 * History to empty charts and have nothing to learn the screens from. Every
 * sample carries `seeded: true` and `evidence: 'simulated'`, screens label them
 * "Sample", and clearing history removes them — they are never presented as
 * the user's own practice or as ring measurements.
 *
 * Why it is not automatic: writing records on mount put practice records into
 * whichever profile happened to open the app, without anyone asking for them,
 * and a user who had deliberately cleared them could not tell the difference.
 * The Activity screen calls `seed()` from a control the user presses, and says
 * what it did afterwards.
 *
 * `hasSeeded` is per profile — the "already added" flag is one of the profile's
 * own keys — so one profile's samples never stop another profile being offered
 * theirs.
 */
export function useDemoHistorySeed(): DemoHistorySeed {
  const { mode: authMode } = useAuth();
  const { state } = useDevice();
  const history = useHistory();

  const hasSeeded = history.hasSeededDemo();
  const canSeed = authMode === 'demo' && state.mode === 'demo' && !hasSeeded;

  return {
    canSeed,
    hasSeeded,
    seed: () => {
      if (!canSeed) return 0;
      const before = history.count();
      history.seedDemo();
      return history.count() - before;
    },
  };
}
