import { HOME_SECTIONS } from '@/app/publicRoutes';
import { EvidenceLabel } from '@/components';
import { HomeSection } from './HomeSection';
import { HEADLINE_TARGETS, STEPS } from './homeContent';
import { EYEBROW } from './homeStyles';

/**
 * Squeeze, tap, detect, act, confirm — as a five-part track at `md` and a
 * stack below it. The last three steps are written as design intent, because
 * they need a ring and a phone route that do not exist.
 */
export function HowItWorksSection() {
  return (
    <HomeSection
      id={HOME_SECTIONS.howItWorks}
      eyebrow="How it works"
      heading="One deliberate squeeze, then one tap"
      lede="The squeeze is what separates a command from ordinary hand movement, so the ring is designed never to act on a brush of the fingers."
    >
      <ol className="mt-10 grid gap-8 md:mt-12 md:grid-cols-5 md:gap-6">
        {STEPS.map((step, index) => (
          <li key={step.id} className="border-t-2 border-border pt-4">
            <p className={EYEBROW}>Step {index + 1}</p>
            <h3 className="mt-1">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 border-t border-border pt-8">
        <h3>What it has to achieve to be any good</h3>
        <dl className="mt-5 grid gap-6 sm:grid-cols-2 sm:gap-10">
          {HEADLINE_TARGETS.map((target) => (
            <div key={target.id}>
              <dt className={EYEBROW}>{target.label}</dt>
              <dd className="mt-1 text-lg font-semibold">{target.target}</dd>
              <dd className="mt-2">
                <EvidenceLabel kind="design_target" />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-prose text-sm text-muted-foreground">
          Both figures are thresholds written down before any testing, so that a future result can be judged against
          them. Neither has been tested, and neither is a claim about how a ring performs.
        </p>
      </div>
    </HomeSection>
  );
}
