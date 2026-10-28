import { useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components';
import { datedFilename, downloadTextFile } from '@/lib/download';
import { nowIso } from '@/lib/time';
import { useAuth } from '@/services/auth/AuthProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { PREFERENCES_OWNERSHIP_NOTE, usePreferences } from '@/services/preferences/PreferencesProvider';
import { useServices } from '@/services/ServicesProvider';
import { SettingsDivider, SettingsSection } from '../SettingsSection';
import { USER_DATA_CONTENT_TYPE, USER_DATA_FILENAME_BASE, userDataExportJson } from '../dataExport';
import { DeleteAllDataControl } from './DeleteAllDataControl';
import { LegacyDataControl } from './LegacyDataControl';

interface StoredItem {
  readonly name: string;
  readonly detail: string;
}

function storedItems(supabase: boolean): readonly StoredItem[] {
  return [
    {
      name: 'Appearance',
      detail: 'Theme, text size, contrast and motion. These belong to this browser, so every profile signed in here sees them.',
    },
    { name: 'Your preferences', detail: 'Hand, feedback, interaction timing and setup progress. These follow your profile.' },
    {
      name: 'Profile',
      detail: supabase
        ? 'Your name and email are held by the account service that handles sign-in.'
        : 'Your display name and email. A local profile keeps no password.',
    },
    { name: 'Calibration', detail: 'Your most recent calibration run.' },
    { name: 'Lessons', detail: 'Progress and scores for each lesson.' },
    { name: 'Activity', detail: 'Your practice history, including any sample records.' },
    { name: 'Shortcuts', detail: 'What Shortcut 1 and Shortcut 2 are set to.' },
    {
      name: 'Ring connection',
      detail: 'Whether you use Demo Mode or a Bluetooth ring, and the name of a ring you connected. This belongs to this browser.',
    },
  ];
}

export function PrivacySection() {
  const { storage } = useServices();
  const { mode, user } = useAuth();
  const { reset } = usePreferences();
  const { announce } = useFeedback();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const supabase = mode === 'supabase';

  const download = () => {
    const filename = datedFilename(USER_DATA_FILENAME_BASE, 'json');
    const json = userDataExportJson(storage, { exportedAt: nowIso(), profileId: user?.id ?? null });
    downloadTextFile(json, filename, USER_DATA_CONTENT_TYPE);
    announce(`Download started: ${filename}.`);
  };

  return (
    <SettingsSection id="privacy" intro="What Tactiq keeps, where it is kept, and how to take it with you or remove it.">
      <div className="grid gap-3">
        <h3>What is stored</h3>
        <p className="max-w-prose font-medium">{PREFERENCES_OWNERSHIP_NOTE}</p>
        <ul className="grid gap-2">
          {storedItems(supabase).map((item) => (
            <li key={item.name} className="max-w-prose">
              <span className="font-semibold">{item.name}:</span> {item.detail}
            </li>
          ))}
        </ul>
        <p className="max-w-prose font-medium">
          {supabase
            ? 'Apart from your sign-in and profile, all of this stays in this browser on this device.'
            : 'All of this stays in this browser on this device. Your profile, settings and activity are never sent to a server.'}
        </p>
        <p className="max-w-prose text-sm text-muted-foreground">
          Each profile on this browser keeps its own calibration, lessons, shortcuts and activity. Nobody signing in here
          can read yours.
        </p>
        {/* Accurate as of the self-hosted type: the page requests nothing from a
            third party, so this is the one place that may say so plainly. */}
        <p className="max-w-prose text-sm text-muted-foreground">
          Everything this page needs, including its type, comes from Tactiq’s own address. No font service, analytics
          service or advertising service is contacted. Tactiq has no analytics and no tracking.
        </p>
      </div>

      <SettingsDivider />

      <div className="grid gap-3">
        <h3>Your data</h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          The download is one JSON file holding your preferences (both this browser’s appearance settings and your own),
          your shortcuts, your lesson progress, your calibration record and your activity records. It holds no sign-in
          details, no password and nothing belonging to another profile on this browser. Each record keeps its evidence
          label, and sample records are marked.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={download}>
            Download my data
          </Button>
          <Button variant="secondary" leadingIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmingReset(true)}>
            Reset preferences
          </Button>
        </div>
        <LegacyDataControl />
        <DeleteAllDataControl />
      </div>

      <ConfirmDialog
        open={confirmingReset}
        title="Reset preferences?"
        description="Theme, text size, contrast, motion, feedback, timing and hand go back to their defaults. Appearance resets for this browser; the rest resets for your profile only. Your calibration, lessons, shortcuts and activity are kept."
        confirmLabel="Reset to defaults"
        onCancel={() => setConfirmingReset(false)}
        onConfirm={() => {
          // reset() keeps onboarding progress, so a user who finished setup is not sent back to it.
          reset();
          setConfirmingReset(false);
          announce('Preferences reset to their defaults.');
        }}
      />
    </SettingsSection>
  );
}
