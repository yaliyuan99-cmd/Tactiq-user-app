import { PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { AccessibilitySection } from './AccessibilitySection';
import { CommandsSection } from './CommandsSection';
import { ContactSection } from './ContactSection';
import { ContentsNav } from './ContentsNav';
import { GettingStartedSection } from './GettingStartedSection';
import { LimitationsSection } from './LimitationsSection';
import { PractisingSection } from './PractisingSection';
import { PrivacySection } from './PrivacySection';
import { TroubleshootingSection } from './TroubleshootingSection';
import { useHelpHashTarget } from './useHelpHashTarget';

export const HELP_TITLE = 'Help';
export const HELP_LEDE =
  'How to use Tactiq, what to do when something goes wrong, and what this project can and cannot do yet.';

/**
 * /dashboard/help — how to use Tactiq, troubleshooting and the project's
 * limitations. Section ids are a public contract (see helpSections.ts).
 */
export default function HelpPage() {
  usePageTitle(HELP_TITLE);
  useHelpHashTarget();

  return (
    <>
      <PageHeader title={HELP_TITLE} lede={HELP_LEDE} />
      <div className="grid min-w-0 grid-cols-1 gap-10">
        <ContentsNav />
        <GettingStartedSection />
        <CommandsSection />
        <PractisingSection />
        <AccessibilitySection />
        <TroubleshootingSection />
        <LimitationsSection />
        <PrivacySection />
        <ContactSection />
      </div>
    </>
  );
}
