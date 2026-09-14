/**
 * The Settings page's sections, in page order. The ids double as URL
 * fragments (for example /dashboard/settings#hand), so other screens can
 * deep-link to one section.
 */

export const SETTINGS_SECTIONS = [
  { id: 'appearance', title: 'Appearance' },
  { id: 'feedback', title: 'Feedback' },
  { id: 'timing', title: 'Interaction timing' },
  { id: 'hand', title: 'Hand' },
  { id: 'device', title: 'Device' },
  { id: 'calibration', title: 'Calibration' },
  { id: 'privacy', title: 'Privacy and your data' },
  { id: 'account', title: 'Account' },
  { id: 'about', title: 'About Tactiq' },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

export function settingsSectionTitle(id: SettingsSectionId): string {
  return SETTINGS_SECTIONS.find((section) => section.id === id)?.title ?? id;
}

/** The id of a section's h2, which takes focus when the section is chosen from the contents list. */
export function settingsHeadingId(id: SettingsSectionId): string {
  return `settings-${id}-heading`;
}

/** Moves focus to a section's heading without scrolling (the caller or the browser scrolls). */
export function focusSettingsHeading(id: SettingsSectionId): void {
  if (typeof document === 'undefined') return;
  document.getElementById(settingsHeadingId(id))?.focus({ preventScroll: true });
}
