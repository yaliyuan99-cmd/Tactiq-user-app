import { Callout, PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { PREFERENCES_REPLACED_NOTE, usePreferences } from '@/services/preferences/PreferencesProvider';
import { useCanPersist } from '@/services/ServicesProvider';
import { SettingsContents } from './SettingsContents';
import { AboutSection } from './sections/AboutSection';
import { AccountSection } from './sections/AccountSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { CalibrationSection } from './sections/CalibrationSection';
import { DeviceSection } from './sections/DeviceSection';
import { FeedbackSection } from './sections/FeedbackSection';
import { HandSection } from './sections/HandSection';
import { PrivacySection } from './sections/PrivacySection';
import { TimingSection } from './sections/TimingSection';

export const SETTINGS_LEDE = 'Changes save straight away in this browser.';

export default function SettingsPage() {
  usePageTitle('Settings');
  const { persisted, recovery } = usePreferences();
  // When the browser refuses every write, the shell already says so once; this
  // page only speaks up when a settings write in particular was refused.
  const writesBlocked = !useCanPersist();

  return (
    <>
      <PageHeader title="Settings" lede={SETTINGS_LEDE} />
      {recovery.replacedFields.length > 0 && (
        <Callout kind="warning" role="status" title="Some settings were reset" className="mb-6">
          {PREFERENCES_REPLACED_NOTE}
        </Callout>
      )}
      {!persisted && !writesBlocked && (
        <Callout kind="warning" role="alert" title="Changes are not being saved" className="mb-6">
          This browser did not let Tactiq store your settings, for example in private browsing. They apply now, but will not
          survive a refresh.
        </Callout>
      )}
      <SettingsContents />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <AppearanceSection />
        <FeedbackSection />
        <TimingSection />
        <HandSection />
        <DeviceSection />
        <CalibrationSection />
        <PrivacySection />
        <AccountSection />
        <AboutSection />
      </div>
    </>
  );
}
