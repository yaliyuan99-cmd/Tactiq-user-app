/**
 * Addresses the app keeps working without making them canonical.
 *
 * Two kinds:
 *
 * 1. Spellings of the account flow that people type and old links use
 *    (/login, /signup).
 * 2. The grouped vocabulary the navigation speaks. The primary hierarchy is
 *    Home, Practice, Device, Activity, Settings, so "/dashboard/practice",
 *    "/dashboard/device/calibrate" and "/dashboard/activity" are real,
 *    reserved addresses — but the flat per-screen paths stay canonical,
 *    because they are what every existing link, bookmark and screen in the app
 *    already points at, and a redirect is cheaper than a broken bookmark.
 *    Making the grouped paths canonical later is a change to this one table
 *    plus the values in ROUTES; no screen reads these strings.
 *
 * Both lists are rendered as redirects that replace their history entry, so
 * Back does not bounce the visitor straight back onto the alias.
 */
import { ROUTES } from '@/app/routes';

export interface RouteAlias {
  /** The address that keeps working. */
  readonly from: string;
  /** The canonical address it resolves to. May contain ":param" tokens. */
  readonly to: string;
}

/** Top-level aliases, outside any section. */
export const PUBLIC_ALIASES: readonly RouteAlias[] = [
  { from: '/login', to: ROUTES.signIn },
  { from: '/signup', to: ROUTES.signUp },
];

/**
 * Aliases inside an account section. `from` is written with the /dashboard
 * base and reduced to a child path for the route table, so the same list
 * mounts under /demo as well.
 */
export const SECTION_ALIASES: readonly RouteAlias[] = [
  { from: '/dashboard/practice', to: ROUTES.train },
  { from: '/dashboard/practice/train', to: ROUTES.train },
  { from: '/dashboard/practice/train/:lessonId', to: `${ROUTES.train}/:lessonId` },
  { from: '/dashboard/practice/simulator', to: ROUTES.simulator },
  { from: '/dashboard/practice/commands', to: ROUTES.commands },
  { from: '/dashboard/device', to: ROUTES.connect },
  { from: '/dashboard/device/connect', to: ROUTES.connect },
  { from: '/dashboard/device/calibrate', to: ROUTES.calibrate },
  { from: '/dashboard/activity', to: ROUTES.history },
];

/** Substitutes ":lessonId" and friends from the matched route parameters. */
export function fillParams(to: string, params: Readonly<Record<string, string | undefined>>): string {
  return to.replace(/:([A-Za-z0-9_]+)/g, (token, name: string) => params[name] ?? token);
}
