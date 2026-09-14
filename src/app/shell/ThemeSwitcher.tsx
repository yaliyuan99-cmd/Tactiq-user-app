import { useId } from 'react';
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import type { ThemePreference } from '@/domain/models';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';

interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export interface ThemeSwitcherProps {
  readonly className?: string;
}

/**
 * Light / Dark / System as a native radio group (arrow keys move between
 * options) bound to preferences.theme. The chosen option is shown by a check
 * mark, bold text and an outlined background, not by colour alone.
 */
export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { preferences, update } = usePreferences();
  const name = `theme-${useId().replace(/:/g, '')}`;

  return (
    <fieldset className={cn('@container min-w-0', className)}>
      <legend className="font-mono-label mb-1.5 text-muted-foreground">Theme</legend>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-card p-1">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const checked = preferences.theme === value;
          const OptionIcon = checked ? Check : Icon;
          return (
            <label
              key={value}
              className={cn(
                'target-44 relative flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm px-1 py-1 text-sm leading-tight @[17rem]:flex-row @[17rem]:gap-1.5',
                'has-focus-visible:outline-solid has-focus-visible:outline-[length:var(--focus-width)] has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                checked
                  ? 'bg-secondary font-semibold text-foreground ring-1 ring-inset ring-border-strong'
                  : 'text-foreground hover:bg-secondary',
              )}
            >
              <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={() => update({ theme: value })}
                className="sr-only"
              />
              <OptionIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
