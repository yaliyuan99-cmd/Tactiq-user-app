/**
 * The dashboard's h1: a greeting by local time with the user's first name,
 * or the plain page name when nobody is known.
 */

export const DASHBOARD_TITLE = 'Overview';
export const DASHBOARD_EYEBROW = 'Your Tactiq';

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

/** "Good morning, Alex", or "Overview" when there is no name to greet. */
export function dashboardTitle(displayName: string | null | undefined, now: Date): string {
  const name = firstName(displayName);
  return name ? `Good ${partOfDay(now)}, ${name}` : DASHBOARD_TITLE;
}
