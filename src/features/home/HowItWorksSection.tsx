import { useState } from 'react';
import { BrainCircuit, Hand, Pointer, Smartphone, Vibrate, type LucideIcon } from 'lucide-react';
import { HOME_SECTIONS } from '@/app/publicRoutes';
import { EvidenceLabel } from '@/components';
import { ProductStage } from '@/components/product';
import { type ContactKey } from '@/domain/contacts';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { HomeSection } from './HomeSection';
import { HEADLINE_TARGETS, STEPS, type Step } from './homeContent';
import { EYEBROW } from './homeStyles';

const STEP_ICONS: Readonly<Record<Step['id'], LucideIcon>> = {
  squeeze: Hand,
  tap: Pointer,
  detect: BrainCircuit,
  act: Smartphone,
  confirm: Vibrate,
};

const STEP_CONTACT: Readonly<Record<Step['id'], ContactKey | null>> = {
  squeeze: null,
  tap: 'middle_base',
  detect: 'middle_base',
  act: 'middle_base',
  confirm: 'middle_base',
};

/**
 * Squeeze, tap, detect, act, confirm, one at a time: pick a step and the drawing
 * follows. The last three steps are written as design intent, because they need
 * a ring and a phone route that do not exist.
 */
export function HowItWorksSection() {
  const { preferences } = usePreferences();
  const [selected, setSelected] = useState<Step['id']>('squeeze');
  const index = STEPS.findIndex((step) => step.id === selected);
  const step = STEPS[index] as Step;
  const StepIcon = STEP_ICONS[step.id];

  return (
    <HomeSection
      id={HOME_SECTIONS.howItWorks}
      eyebrow="How it works"
      heading="One deliberate squeeze, then one tap"
      lede="The squeeze is what separates a command from ordinary hand movement, so the ring is designed never to act on a brush of the fingers."
    >
      <div className="mt-10 grid gap-6 md:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ol className="grid content-start gap-2">
          {STEPS.map((item, itemIndex) => {
            const Icon = STEP_ICONS[item.id];
            const isSelected = item.id === selected;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(item.id)}
                  className={cn(
                    'target-44 flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors duration-[var(--dur-tap)]',
                    isSelected ? 'border-primary bg-secondary font-semibold' : 'border-border bg-card hover:border-border-strong hover:bg-secondary',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-lg">
                    <span className="sr-only">Step {itemIndex + 1}: </span>
                    {item.title}
                  </span>
                  <span className="ml-auto text-sm text-muted-foreground" aria-hidden="true">
                    {itemIndex + 1} of {STEPS.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-5 rounded-lg border-[1.5px] border-foreground bg-card p-6 shadow-card sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:items-center">
          <div role="status" key={step.id} className="animate-enter-rise">
            <StepIcon className="h-7 w-7 text-primary-strong" aria-hidden="true" />
            <h3 className="mt-3 text-2xl">{step.title}</h3>
            <p className="mt-2 text-muted-foreground">{step.text}</p>
          </div>
          <ProductStage hand={preferences.hand} variant="compact" highlightContact={STEP_CONTACT[step.id]} legend={false} />
        </div>
      </div>

      <div className="mt-12">
        <h3>What it has to achieve to be any good</h3>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          {HEADLINE_TARGETS.map((target) => (
            <div key={target.id} className="rounded-lg border-[1.5px] border-foreground bg-card p-5 shadow-card">
              <dt className={EYEBROW}>{target.label}</dt>
              <dd className="mt-2 text-xl font-semibold">{target.target}</dd>
              <dd className="mt-3">
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
