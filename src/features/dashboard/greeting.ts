/**
 * The dashboard's heading. The page is "Home" everywhere it is named: the
 * document title (so the route change announces "Home"), the navigation and
 * the eyebrow above the h1. The h1 itself greets by local time with the
 * user's first name, or is the plain page name when nobody is known.
 */

/** Document title and navigation name of /dashboard. */
export const DASHBOARD_TITLE = 'Home';
/** Shown above a greeting so the page name is visible next to it. */
export const DASHBOARD_EYEBROW = DASHBOARD_TITLE;

export type PartOfDay = 'morning' | 'afternoon' | 'evening';

/** 05:00–11:59 morning, 12:00–17:59 afternoon, otherwise evening (local time). */
export function partOfDay(date: Date): PartOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/** "Alex Morgan" → "Alex". Blank names give null. */
export function firstName(displayName: string | null | undefined): string | null {
  const first = (displayName ?? '').trim().split(/\s+/)[0];
  return first ? first : null;
}

/** "Good morning, Alex", or "Home" when there is no name to greet. */
export function dashboardTitle(displayName: string | null | undefined, now: Date): string {
  const name = firstName(displayName);
  return name ? `Good ${partOfDay(now)}, ${name}` : DASHBOARD_TITLE;
}

/** "Home" above a greeting; nothing when the h1 is already "Home", so the name is not shown twice. */
export function dashboardEyebrow(displayName: string | null | undefined): string | undefined {
  return firstName(displayName) ? DASHBOARD_EYEBROW : undefined;
}
