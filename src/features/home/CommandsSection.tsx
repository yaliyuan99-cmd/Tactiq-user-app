import { HOME_SECTIONS } from '@/app/publicRoutes';
import { CommandExplorer } from '@/components/product';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { HomeSection } from './HomeSection';

/**
 * The public command explorer. It reads the real command map, so the eight
 * points here are the eight points the app teaches and the firmware reports.
 */
export function CommandsSection() {
  const { preferences } = usePreferences();
  return (
    <HomeSection
      id={HOME_SECTIONS.commands}
      eyebrow="The command map"
      heading="Eight points, nine commands"
      lede="Seven commands are fixed. Two are shortcuts you choose. The ninth shares the pinky fingertip with one of them and is told apart by length, not by tapping twice: a five-second hold is Emergency, and it can never be remapped."
    >
      <CommandExplorer hand={preferences.hand} className="mt-10 md:mt-12" />
    </HomeSection>
  );
}
