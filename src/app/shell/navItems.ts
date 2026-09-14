/**
 * The one navigation definition. The desktop sidebar shows both groups, the
 * mobile bottom bar shows the primary group, and the mobile "More" dialog
 * shows the secondary group.
 */
import {
  Bluetooth,
  CircleHelp,
  Command,
  GraduationCap,
  History,
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
  | 'train'
  | 'simulator'
  | 'commands'
  | 'settings'
  | 'connect'
  | 'calibrate'
  | 'history'
  | 'help';

export interface NavItem {
  readonly id: NavItemId;
  readonly label: string;
  readonly to: string;
  readonly icon: LucideIcon;
  /** One short line, shown in the mobile "More" dialog. */
  readonly description: string;
  /** Active only on the exact path (Home would otherwise match every dashboard page). */
  readonly exact?: boolean;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'Home', to: ROUTES.dashboard, icon: House, description: 'Your overview', exact: true },
  { id: 'train', label: 'Train', to: ROUTES.train, icon: GraduationCap, description: 'Lessons for each command' },
  { id: 'simulator', label: 'Simulator', to: ROUTES.simulator, icon: Pointer, description: 'Practise on the simulated ring' },
  { id: 'commands', label: 'Commands', to: ROUTES.commands, icon: Command, description: 'The command map and shortcuts' },
  { id: 'settings', label: 'Settings', to: ROUTES.settings, icon: Settings, description: 'Accessibility and feedback' },
];

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  { id: 'connect', label: 'Connect', to: ROUTES.connect, icon: Bluetooth, description: 'Demo Mode or a Bluetooth ring' },
  { id: 'calibrate', label: 'Calibrate', to: ROUTES.calibrate, icon: Target, description: 'Guided taps on each contact point' },
  { id: 'history', label: 'History', to: ROUTES.history, icon: History, description: 'Practice activity in this browser' },
  { id: 'help', label: 'Help', to: ROUTES.help, icon: CircleHelp, description: 'How Tactiq works and what is simulated' },
];

export type NavCurrent = 'page' | 'true' | undefined;

/**
 * aria-current for a nav link: "page" on its own path, "true" on a page
 * beneath it (Train while a lesson is open), otherwise undefined.
 */
export function navCurrent(to: string, pathname: string, exact = false): NavCurrent {
  const path = normalisePathname(pathname);
  const target = normalisePathname(to);
  if (path === target) return 'page';
  if (!exact && path.startsWith(`${target}/`)) return 'true';
  return undefined;
}
