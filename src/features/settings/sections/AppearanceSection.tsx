import { RadioGroupField, SwitchField } from '@/components';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { SettingsDivider, SettingsSection, WRAPPING_SWITCH_ROW } from '../SettingsSection';
import {
  CONTRAST_LABELS,
  CONTRAST_OPTIONS,
  TEXT_SIZE_LABELS,
  TEXT_SIZE_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
  choiceAnnouncement,
  switchAnnouncement,
} from '../settingsOptions';

export const TEXT_SIZE_PREVIEW = 'Squeeze the ring, then touch your index fingertip to confirm.';
export const REDUCE_MOTION_DESCRIPTION = 'Turns off animation in this app, even if your device allows it.';

export function AppearanceSection() {
  const { preferences, update, prefersReducedMotion } = usePreferences();
  const { announce } = useFeedback();

  return (
    <SettingsSection id="appearance" intro="How the app looks on this device.">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <RadioGroupField
          label="Theme"
          options={THEME_OPTIONS}
          value={preferences.theme}
          onChange={(theme) => {
            update({ theme });
            announce(choiceAnnouncement('Theme', THEME_LABELS[theme]));
          }}
        />
        <div className="grid content-start gap-4">
          <RadioGroupField
            label="Text size"
            options={TEXT_SIZE_OPTIONS}
            value={preferences.textSize}
            onChange={(textSize) => {
              update({ textSize });
              announce(choiceAnnouncement('Text size', TEXT_SIZE_LABELS[textSize]));
            }}
          />
          <div className="rounded-md border border-border bg-background px-4 py-3">
            <p className="font-mono-label text-muted-foreground">Preview</p>
            <p className="mt-1">{TEXT_SIZE_PREVIEW}</p>
          </div>
        </div>
        <RadioGroupField
          label="Contrast"
          options={CONTRAST_OPTIONS}
          value={preferences.contrast}
          onChange={(contrast) => {
            update({ contrast });
            announce(choiceAnnouncement('Contrast', CONTRAST_LABELS[contrast]));
          }}
        />
      </div>

      <SettingsDivider />

      <div className="grid gap-2">
        <SwitchField
          containerClassName={WRAPPING_SWITCH_ROW}
          label="Reduce motion"
          description={REDUCE_MOTION_DESCRIPTION}
          checked={preferences.reducedMotion}
          onChange={(reducedMotion) => {
            update({ reducedMotion });
            announce(switchAnnouncement('Reduce motion', reducedMotion));
          }}
        />
        {!preferences.reducedMotion && prefersReducedMotion && (
          <p className="text-sm text-muted-foreground">Your device already asks for reduced motion, so animation stays off.</p>
        )}
      </div>
    </SettingsSection>
  );
}
