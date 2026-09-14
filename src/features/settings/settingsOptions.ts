/**
 * Option lists, labels and announcement wording for the Settings page.
 * Pure, so the wording is tested once and every section says things the same way.
 */
import type { RadioOption } from '@/components';
import {
  DEFAULT_PREFERENCES,
  type ContrastPreference,
  type Hand,
  type TextSize,
  type ThemePreference,
  type UserPreferences,
} from '@/domain/models';
import { COMMAND_WINDOW_LONG_MS, COMMAND_WINDOW_MS, type TimingFact } from '@/domain/timing';

export const THEME_LABELS: Readonly<Record<ThemePreference, string>> = { light: 'Light', dark: 'Dark', system: 'System' };
export const TEXT_SIZE_LABELS: Readonly<Record<TextSize, string>> = { default: 'Default', large: 'Large', larger: 'Larger' };
export const CONTRAST_LABELS: Readonly<Record<ContrastPreference, string>> = { default: 'Standard', high: 'Increased' };
export const HAND_LABELS: Readonly<Record<Hand, string>> = { left: 'Left', right: 'Right' };

export const THEME_OPTIONS: readonly RadioOption<ThemePreference>[] = [
  { value: 'light', label: THEME_LABELS.light, description: 'Stone background with dark text.' },
  { value: 'dark', label: THEME_LABELS.dark, description: 'Dark background with light text.' },
  { value: 'system', label: THEME_LABELS.system, description: 'Follows your device’s setting.' },
];

export const TEXT_SIZE_OPTIONS: readonly RadioOption<TextSize>[] = [
  { value: 'default', label: TEXT_SIZE_LABELS.default },
  { value: 'large', label: TEXT_SIZE_LABELS.large },
  { value: 'larger', label: TEXT_SIZE_LABELS.larger },
];

export const CONTRAST_OPTIONS: readonly RadioOption<ContrastPreference>[] = [
  { value: 'default', label: CONTRAST_LABELS.default, description: 'The usual colours.' },
  { value: 'high', label: CONTRAST_LABELS.high, description: 'Darker text and stronger borders.' },
];

export const HAND_OPTIONS: readonly RadioOption<Hand>[] = [
  { value: 'left', label: HAND_LABELS.left, description: 'The ring is on your left index finger.' },
  { value: 'right', label: HAND_LABELS.right, description: 'The ring is on your right index finger.' },
];

export const TIMING_STATUS_LABELS: Readonly<Record<TimingFact['status'], string>> = {
  design_value: 'Design value',
  placeholder: 'Placeholder',
};

/** Caption for the small hand map beside the hand choice. */
export function handPreviewCaption(hand: Hand): string {
  return `Preview: ${HAND_LABELS[hand].toLowerCase()} hand, palm facing you.`;
}

/** "Theme set to Dark." */
export function choiceAnnouncement(setting: string, choice: string): string {
  return `${setting} set to ${choice}.`;
}

/** "Reduce motion on." */
export function switchAnnouncement(setting: string, on: boolean): string {
  return `${setting} ${on ? 'on' : 'off'}.`;
}

function wholeSeconds(ms: number): number {
  return Math.round(ms / 1000);
}

/** The command window this app uses, in milliseconds. */
export function commandWindowMsFor(longerInteractionTime: boolean): number {
  return longerInteractionTime ? COMMAND_WINDOW_LONG_MS : COMMAND_WINDOW_MS;
}

export const LONGER_TIME_DESCRIPTION = `Keeps the command window open for ${wholeSeconds(COMMAND_WINDOW_LONG_MS)} seconds instead of ${wholeSeconds(COMMAND_WINDOW_MS)}.`;

export function longerTimeAnnouncement(on: boolean): string {
  const seconds = wholeSeconds(commandWindowMsFor(on));
  return `Longer interaction time ${on ? 'on' : 'off'}. The command window stays open for ${seconds} seconds.`;
}

/**
 * Every preference back to its default, except onboarding progress: resetting
 * that too would send a finished user straight back into setup.
 */
export function preferencesAfterReset(current: UserPreferences): UserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    onboardingCompleted: current.onboardingCompleted,
    onboardingStep: current.onboardingStep,
  };
}

/** "1 point", "3 points". */
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
