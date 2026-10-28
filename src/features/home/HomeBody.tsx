import { AppPreview } from './AppPreview';
import { AssurancesSection } from './AssurancesSection';
import { CommandsSection } from './CommandsSection';
import { HowItWorksSection } from './HowItWorksSection';
import { QuestionsSection } from './QuestionsSection';
import { ResearchSection } from './ResearchSection';
import { ScenariosSection } from './ScenariosSection';

/**
 * Everything below the hero, in one lazily loaded chunk.
 *
 * The hero and the public banner stay in the initial payload, so `/` paints
 * its headline and both actions without waiting for this module, and the
 * dashboard never pays for it.
 */
export default function HomeBody() {
  return (
    <>
      <ScenariosSection />
      <HowItWorksSection />
      <CommandsSection />
      <AppPreview />
      <ResearchSection />
      <QuestionsSection />
      <AssurancesSection />
    </>
  );
}
