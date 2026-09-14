import { useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components';
import { datedFilename, downloadTextFile } from '@/lib/download';
import { nowIso } from '@/lib/time';
import { useAuth } from '@/services/auth/AuthProvider';
import { useFeedback } from '@/services/feedback/FeedbackProvider';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { useServices } from '@/services/ServicesProvider';
import { SettingsDivider, SettingsSection } from '../SettingsSection';
import { LOCAL_DATA_CONTENT_TYPE, LOCAL_DATA_FILENAME_BASE, localDataExportJson } from '../dataExport';
import { DeleteAllDataControl } from './DeleteAllDataControl';

interface StoredItem {
  readonly name: string;
  readonly detail: string;
}

function storedItems(supabase: boolean): readonly StoredItem[] {
  return [
    { name: 'Preferences', detail: 'Theme, text size, contrast, motion, feedback, timing and hand.' },
    {
      name: 'Profile',
      detail: supabase
        ? 'Your name and email are held by the account service that handles sign-in.'
        : 'Your display name and email. Demo Mode keeps no password.',
    },
    { name: 'Calibration', detail: 'Your most recent calibration run.' },
    { name: 'Lessons', detail: 'Progress and scores for each lesson.' },
    { name: 'Activity', detail: 'Your practice history, including any sample records.' },
    { name: 'Shortcuts', detail: 'What Shortcut 1 and Shortcut 2 are set to.' },
    { name: 'Ring connection', detail: 'Whether you use Demo Mode or a Bluetooth ring, and the name of a ring you connected.' },
  ];
}

export function PrivacySection() {
  const { storage } = useServices();
  const { mode } = useAuth();
  const { reset } = usePreferences();
  const { announce } = useFeedback();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const supabase = mode === 'supabase';

  const download = () => {
    const filename = datedFilename(LOCAL_DATA_FILENAME_BASE, 'json');
    downloadTextFile(localDataExportJson(storage, nowIso()), filename, LOCAL_DATA_CONTENT_TYPE);
    announce(`Download started: ${filename}.`);
  };

  return (
    <SettingsSection id="privacy" intro="What Tactiq keeps, where it is kept, and how to take it with you or remove it.">
      <div className="grid gap-3">
        <h3>What is stored</h3>
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
            : 'All of this stays in this browser on this device. In Demo Mode nothing is sent anywhere.'}
        </p>
      </div>

      <SettingsDivider />

      <div className="grid gap-3">
        <h3>Your data</h3>
        <p className="max-w-prose text-sm text-muted-foreground">
          The download is one JSON file with everything Tactiq keeps in this browser, including every local profile. Each
          record keeps its evidence label, and sample records are marked.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={download}>
            Download all my data
          </Button>
          <Button variant="secondary" leadingIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmingReset(true)}>
            Reset preferences
          </Button>
        </div>
        <DeleteAllDataControl />
      </div>

      <ConfirmDialog
        open={confirmingReset}
        title="Reset preferences?"
        description="Theme, text size, contrast, motion, feedback, timing and hand go back to their defaults. Your profile, calibration, lessons, shortcuts and activity are kept."
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
