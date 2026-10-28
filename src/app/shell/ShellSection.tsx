/**
 * Which copy of the app the shell is drawing: the signed-in account under
 * /dashboard, or the guest demonstration under /demo. Every shell link is
 * written with the canonical /dashboard constants and translated here, so one
 * navigation definition serves both.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { canonicalPath, sectionBase, sectionPath, type SectionId } from '@/app/routing/sections';

export interface ShellSectionValue {
  readonly id: SectionId;
  /** "/dashboard" or "/demo". */
  readonly base: string;
  /** A canonical /dashboard path as this section spells it. */
  readonly path: (canonicalPath: string) => string;
}

function sectionValue(id: SectionId): ShellSectionValue {
  return { id, base: sectionBase(id), path: (canonicalPath) => sectionPath(id, canonicalPath) };
}

const ACCOUNT_SECTION = sectionValue('account');

const ShellSectionContext = createContext<ShellSectionValue | null>(null);

export function ShellSectionProvider({ id, children }: { readonly id: SectionId; readonly children: ReactNode }) {
  const value = useMemo(() => sectionValue(id), [id]);
  return <ShellSectionContext.Provider value={value}>{children}</ShellSectionContext.Provider>;
}

/**
 * Defaults to the account section when no provider is above: the onboarding
 * frame reuses single shell pieces (Help) outside the shell.
 */
export function useShellSection(): ShellSectionValue {
  return useContext(ShellSectionContext) ?? ACCOUNT_SECTION;
}

/**
 * The current location as the canonical /dashboard path, so the navigation
 * decides what is current from one set of constants whichever section is on
 * screen.
 */
export function useNavPathname(): string {
  const { pathname } = useLocation();
  return canonicalPath(pathname);
}
