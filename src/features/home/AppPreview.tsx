import { useState } from 'react';
import { ArrowRight, CircleCheck, CircleX } from 'lucide-react';
import { Link } from 'react-router';
import { HOME_SECTIONS } from '@/app/publicRoutes';
import { ROUTES } from '@/app/routes';
import { ButtonLink, EvidenceLabel } from '@/components';
import { CONTACT_ENTRIES } from '@/components/product';
import { cn } from '@/lib/cn';
import { HomeSection } from './HomeSection';
import { APP_CAPABILITIES } from './homeContent';
import { EYEBROW } from './homeStyles';

const CAPABILITY_ROUTES: Readonly<Record<string, string>> = {
  calibrate: `${ROUTES.demo}/calibrate`,
  train: `${ROUTES.demo}/train`,
  practise: `${ROUTES.demo}/simulator`,
  shortcuts: `${ROUTES.demo}/commands`,
  history: `${ROUTES.demo}/history`,
};

/** A small working sample of guided practice: the app asks for a command, you find its point. */
function PracticeSample() {
  const [targetIndex, setTargetIndex] = useState(3);
  const [outcome, setOutcome] = useState<{ correct: boolean; text: string } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const target = CONTACT_ENTRIES[targetIndex] ?? CONTACT_ENTRIES[0];
  if (!target) return null;

  const choose = (index: number) => {
    const entry = CONTACT_ENTRIES[index];
    if (!entry) return;
    if (index === targetIndex) {
      setCorrectCount((count) => count + 1);
      setOutcome({ correct: true, text: `Recognised: ${entry.summary}, on the ${entry.contact.label.toLowerCase()}.` });
      setTargetIndex((targetIndex + 3) % CONTACT_ENTRIES.length);
    } else {
      setOutcome({ correct: false, text: `That point is ${entry.summary}. Try again.` });
    }
  };

  const OutcomeIcon = outcome?.correct ? CircleCheck : CircleX;
  return (
    <div className="rounded-lg border-[1.5px] border-foreground bg-card p-5 text-card-foreground shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className={EYEBROW}>Try a practice round</p>
        <EvidenceLabel kind="simulated" />
      </div>
      <p className="mt-3 text-2xl font-semibold">Find {target.summary}</p>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-flow-col sm:grid-cols-4 sm:grid-rows-2">
        {CONTACT_ENTRIES.map((entry, index) => (
          <li key={entry.contact.key} className="flex">
            <button
              type="button"
              onClick={() => choose(index)}
              className="target-44 w-full rounded-lg border border-border-strong bg-background px-3 py-2.5 text-left text-sm font-medium transition-[background-color,scale] duration-[var(--dur-tap)] hover:bg-secondary active:scale-[0.97]"
            >
              {entry.contact.label}
            </button>
          </li>
        ))}
      </ul>

      <p role="status" className={cn('mt-4 flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2', !outcome && 'text-muted-foreground')}>
        {outcome ? (
          <>
            <OutcomeIcon
              className={cn('h-5 w-5 shrink-0', outcome.correct ? 'text-status-confirmed' : 'text-destructive')}
              aria-hidden="true"
            />
            <span>
              {outcome.text}
              {correctCount > 0 && ` Found so far: ${correctCount}.`}
            </span>
          </>
        ) : (
          'Pick the point you think carries that command.'
        )}
      </p>
    </div>
  );
}

/** What exists today, including a small round of it to try right here. */
export function AppPreview() {
  return (
    <HomeSection
      id={HOME_SECTIONS.app}
      layout="split"
      eyebrow="The app"
      heading="The part you can use today"
      lede="Open it in a browser and the ring is simulated: you squeeze and tap on screen, or with a keyboard, and the app answers exactly as the design says a ring would."
    >
      <PracticeSample />

      <ul className="mt-8 grid gap-2">
        {APP_CAPABILITIES.map((capability) => (
          <li key={capability.id} className="lift group relative rounded-lg border-[1.5px] border-foreground bg-card px-5 py-4">
            <Link
              to={CAPABILITY_ROUTES[capability.id] ?? ROUTES.demo}
              className="stretched-link flex items-center justify-between gap-4 font-semibold no-underline"
            >
              {capability.title}
              <ArrowRight className="h-4 w-4 shrink-0 text-primary-strong transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <p className="mt-1 text-muted-foreground">{capability.text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <ButtonLink to={ROUTES.demo} trailingIcon={<ArrowRight className="h-4 w-4" />}>
          Try the demo
        </ButtonLink>
        <ButtonLink to={ROUTES.signUp} variant="secondary">
          Create a profile
        </ButtonLink>
      </div>
    </HomeSection>
  );
}
