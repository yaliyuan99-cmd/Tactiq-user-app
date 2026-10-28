/**
 * The two bases the account screens are mounted under, and the pure mapping
 * between them.
 *
 *   /dashboard  the signed-in account
 *   /demo       a guest demonstration: the same screens, no account, and
 *               nothing presented as a secure signed-in session
 *
 * Every link in the app is written with the canonical /dashboard constants, so
 * the shell translates them for whichever section is on screen rather than
 * every screen having to know. Kept free of React so it can be unit tested.
 */
import { ROUTES } from '@/app/routes';
import { normalisePathname } from './redirects';

export type SectionId = 'account' | 'demo';

export const ACCOUNT_BASE: string = ROUTES.dashboard;
export const DEMO_BASE: string = ROUTES.demo;

/**
 * Storage scope id reserved for the demonstration. The services slice keys
 * stored data on identity; the demonstration has no identity, so it needs a
 * reserved id of its own that can never collide with a user id, and whose
 * data is dropped rather than merged into an account.
 */
export const DEMO_SCOPE_ID = 'demo';

export function sectionBase(section: SectionId): string {
  return section === 'demo' ? DEMO_BASE : ACCOUNT_BASE;
}

/** "/dashboard/train" → "train": child paths for the route table, derived so they never drift. */
export function sectionChild(canonicalPath: string): string {
  return canonicalPath.slice(ACCOUNT_BASE.length + 1);
}

/** True for "/dashboard" and anything beneath it (matching is case-insensitive, as the router's is). */
export function isAccountPath(pathname: string): boolean {
  const path = normalisePathname(pathname);
  return path === ACCOUNT_BASE || path.startsWith(`${ACCOUNT_BASE}/`);
}

/** True for "/demo" and anything beneath it. */
export function isDemoPath(pathname: string): boolean {
  const path = normalisePathname(pathname);
  return path === DEMO_BASE || path.startsWith(`${DEMO_BASE}/`);
}

/**
 * A canonical /dashboard path as the given section spells it:
 * sectionPath('demo', '/dashboard/connect') → '/demo/connect'. Anything
 * outside the account base (the public page, Help on the marketing site, an
 * auth screen) is returned unchanged, because those addresses are shared.
 */
export function sectionPath(section: SectionId, canonicalPath: string): string {
  if (section === 'account') return canonicalPath;
  if (canonicalPath === ACCOUNT_BASE) return DEMO_BASE;
  if (canonicalPath.startsWith(`${ACCOUNT_BASE}/`)) {
    return `${DEMO_BASE}${canonicalPath.slice(ACCOUNT_BASE.length)}`;
  }
  return canonicalPath;
}

/**
 * The canonical /dashboard spelling of a path in either section:
 * canonicalPath('/demo/train/squeeze') → '/dashboard/train/squeeze'. The
 * navigation compares against this, so one definition serves both sections.
 * Only the base is rewritten, so parameters keep their own case.
 */
export function canonicalPath(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (lower === DEMO_BASE) return ACCOUNT_BASE;
  if (lower.startsWith(`${DEMO_BASE}/`)) return `${ACCOUNT_BASE}${pathname.slice(DEMO_BASE.length)}`;
  return pathname;
}

/** The demonstration's spelling of a path the visitor asked for under /dashboard. */
export function demoPath(accountPath: string): string {
  return sectionPath('demo', accountPath);
}

export interface LocationParts {
  readonly search?: string;
  readonly hash?: string;
}

/** Re-attaches the query and hash to a redirect target, so deep links survive it. */
export function withLocation(to: string, { search = '', hash = '' }: LocationParts = {}): string {
  return `${to}${search}${hash}`;
}
