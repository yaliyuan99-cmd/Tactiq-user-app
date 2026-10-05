import { Link } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/services/auth/AuthProvider';
import { HelpSection, HelpSubsection } from './HelpSection';
import { STANDALONE_LINK } from './helpStyles';

const LIST = 'grid max-w-prose list-disc gap-2 pl-6 marker:text-muted-foreground';

export function PrivacySection() {
  const { mode } = useAuth();
  const lede =
    mode === 'supabase'
      ? 'Your sign-in details are handled by Tactiq’s account service. Everything else — settings, calibration, lesson progress, shortcuts and activity — is stored in this browser on this device.'
      : 'With a local profile, everything is stored in this browser on this device: your profile, settings, calibration, lesson progress, shortcuts and activity. None of it is sent to a server.';

  return (
    <HelpSection id="privacy" collapsible lede={lede}>
      <HelpSubsection title="No analytics">
        <p className="max-w-prose">
          Tactiq has no analytics, advertising or tracking. The app’s fonts load from Google Fonts, which receives an
          ordinary web request.
        </p>
      </HelpSubsection>

      <HelpSubsection title="Download or delete your data">
        <ul className={LIST}>
          <li>
            In History, under Your data, download your activity as JSON or CSV, or clear it. Sample records added in Demo
            Mode are labelled Sample and can be removed on their own.
          </li>
          <li>
            In Settings, under Privacy and your data, download everything Tactiq keeps, reset your preferences or delete all
            local data. A local profile can be deleted under Account.
          </li>
          <li>
            Clearing this site’s data in your browser’s settings also removes everything. This cannot be undone, so download
            a copy first if you want one.
          </li>
        </ul>
        <ul role="list" className="flex flex-wrap gap-x-6">
          <li>
            <Link to={ROUTES.history} className={STANDALONE_LINK}>
              Your activity in History
            </Link>
          </li>
          <li>
            <Link to={`${ROUTES.settings}#privacy`} className={STANDALONE_LINK}>
              Privacy and your data in Settings
            </Link>
          </li>
        </ul>
      </HelpSubsection>
    </HelpSection>
  );
}
