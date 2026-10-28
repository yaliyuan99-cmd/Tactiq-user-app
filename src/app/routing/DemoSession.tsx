/**
 * "A demonstration is open in this tab."
 *
 * The demonstration mounts the same screens under /demo, and those screens
 * link to the canonical /dashboard addresses. Without this flag the first such
 * link would drop a guest who has no account on the sign-in screen, which is
 * not what they asked for. While the flag is set, a signed-out visit to an
 * account address re-parents into /demo instead (ProtectedRoute). The
 * demonstration address renders directly, so there is no loop.
 *
 * It is deliberately in-memory: it must never read as a stored session, and a
 * reload of a /demo address needs no flag because the address itself says so.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface DemoSessionValue {
  /** True once a /demo screen has been shown in this tab's app session. */
  readonly active: boolean;
  readonly start: () => void;
}

const NO_SESSION: DemoSessionValue = { active: false, start: () => undefined };

const DemoSessionContext = createContext<DemoSessionValue | null>(null);

export function DemoSessionProvider({ children }: { readonly children: ReactNode }) {
  const [active, setActive] = useState(false);
  const start = useCallback(() => setActive(true), []);
  const value = useMemo<DemoSessionValue>(() => ({ active, start }), [active, start]);
  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>;
}

/** Safe outside the provider (the onboarding frame and tests render parts of the shell on their own). */
export function useDemoSession(): DemoSessionValue {
  return useContext(DemoSessionContext) ?? NO_SESSION;
}

/** Called by the shell: marks the demonstration open for the rest of this tab's app session. */
export function useMarkDemoSession(open: boolean): void {
  const { start } = useDemoSession();
  useEffect(() => {
    if (open) start();
  }, [open, start]);
}
