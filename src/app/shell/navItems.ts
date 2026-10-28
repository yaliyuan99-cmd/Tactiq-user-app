/**
 * The one navigation definition.
 *
 * Five primary destinations — Home, Practice, Device, Activity, Settings —
 * with Help always reachable beside them. Practice holds the lessons, the
 * simulator and the command map; Device holds the connection and calibration.
 * The desktop sidebar shows the groups expanded, the mobile bottom bar shows
 * the five parents, and the mobile "More" dialog shows everything underneath.
 *
 * A label is the word the page uses for itself, because a screen reader user
 * hears the document title right after activating the link. That is why the
 * pages inside a group keep their own names while the groups take the names of
 * the hierarchy.
 *
 * Paths are the canonical /dashboard constants; the shell translates them for
 * the demonstration (see routing/sections.ts), so this file never repeats a
 * base.
 */
import {
  Bluetooth,
  ChartNoAxesColumn,
  CircleHelp,
  CircuitBoard,
  Command,
  Dumbbell,
  GraduationCap,
  House,
  Pointer,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { normalisePathname } from '@/app/routing/redirects';

export type NavItemId =
  | 'home'
  | 'practice'
  | 'train'
  | 'simulator'
  | 'commands'
  | 'device'
  | 'connect'
  | 'calibrate'
  | 'activity'
  | 'settings'
  | 'help';

export interface NavItem {
  readonly id: NavItemId;
  readonly label: string;
  /** Canonical /dashboard path. */
  readonly to: string;
  readonly icon: LucideIcon;
  /** One short line, shown in the mobile "More" dialog. */
  readonly description: string;
  /** Active only on the exact path (Home would otherwise match every account page). */
  readonly exact?: boolean;
  /** Destinations shown under this one. */
  readonly children?: readonly NavItem[];
}

const TRAIN: NavItem = {
  id: 'train',
  label: 'Train',
  to: ROUTES.train,
  icon: GraduationCap,
  description: 'One lesson per command',
};

const SIMULATOR: NavItem = {
  id: 'simulator',
  label: 'Simulator',
  to: ROUTES.simulator,
  icon: Pointer,
  description: 'Try the squeeze and the eight taps',
};

const COMMANDS: NavItem = {
  id: 'commands',
  label: 'Commands',
  to: ROUTES.commands,
  icon: Command,
  description: 'The command map and what each tap does',
};

const CONNECT: NavItem = {
  id: 'connect',
  label: 'Connect',
  to: ROUTES.connect,
  icon: Bluetooth,
  description: 'Simulated ring or a bench prototype',
};

const CALIBRATE: NavItem = {
  id: 'calibrate',
  label: 'Calibrate',
  to: ROUTES.calibrate,
  icon: Target,
  description: 'Guided taps on each contact point',
};

/** The bottom bar below lg, and the parents of the sidebar's groups. */
export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'Home', to: ROUTES.dashboard, icon: House, description: 'Your overview', exact: true },
  {
    id: 'practice',
    label: 'Practice',
    to: ROUTES.train,
    icon: Dumbbell,
    description: 'Lessons, the simulator and the command map',
    children: [TRAIN, SIMULATOR, COMMANDS],
  },
  {
    id: 'device',
    label: 'Device',
    to: ROUTES.connect,
    icon: CircuitBoard,
    description: 'Connection and calibration',
    children: [CONNECT, CALIBRATE],
  },
  {
    id: 'activity',
    label: 'Activity',
    to: ROUTES.history,
    icon: ChartNoAxesColumn,
    description: 'Practice records kept in this browser',
  },
  { id: 'settings', label: 'Settings', to: ROUTES.settings, icon: Settings, description: 'Accessibility and feedback' },
];

/** Always reachable, from the top bar and from the end of every navigation. */
export const HELP_NAV_ITEM: NavItem = {
  id: 'help',
  label: 'Help',
  to: ROUTES.help,
  icon: CircleHelp,
  description: 'How Tactiq works and what is simulated',
};

/** Everything under a primary destination, in reading order: the mobile "More" dialog's contents. */
export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  ...PRIMARY_NAV_ITEMS.flatMap((item) => item.children ?? []),
  HELP_NAV_ITEM,
];

export type NavCurrent = 'page' | 'true' | undefined;

/**
 * aria-current for a nav link: "page" on its own path, "true" on a page
 * beneath it (Learn while a lesson is open), otherwise undefined.
 */
export function navCurrent(to: string, pathname: string, exact = false): NavCurrent {
  const path = normalisePathname(pathname);
  const target = normalisePathname(to);
  if (path === target) return 'page';
  if (!exact && path.startsWith(`${target}/`)) return 'true';
  return undefined;
}

/**
 * aria-current for a primary destination, which also stands for the pages
 * grouped under it: "page" on its own path, "true" anywhere else in its
 * section (Practice while the simulator is open).
 */
export function sectionCurrent(item: NavItem, pathname: string): NavCurrent {
  const own = navCurrent(item.to, pathname, item.exact);
  if (own) return own;
  return (item.children ?? []).some((child) => navCurrent(child.to, pathname)) ? 'true' : undefined;
}
