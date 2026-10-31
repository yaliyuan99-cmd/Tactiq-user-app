import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { ButtonLink, EvidenceLabel, PAGE_TITLE_ID } from '@/components';
import { ProductStage } from '@/components/product';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { HERO, HERO_FACTS } from './homeContent';
import { EYEBROW, SHELL } from './homeStyles';

const STAGE_CAPTION =
  'The ring on the index finger, and the eight points the thumb can reach: the tip and the base of the index, middle, ring and pinky fingers. The stepped arcs stand for the command window a squeeze opens; the dashed line is the thumb’s reach to one point. A drawing of the design — no ring has been built.';

/**
 * The hero. Its text and both actions are plain, eagerly loaded markup: no
 * Suspense boundary sits over them, so `/` paints its headline and its two
 * calls to action on the first frame.
 */
export function HeroSection() {
  const { preferences } = usePreferences();
  return (
    <section aria-labelledby={PAGE_TITLE_ID}>
      <div
        className={cn(
          SHELL,
          'grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 lg:py-24',
        )}
      >
        <div className="max-w-2xl">
          <p className={EYEBROW}>{HERO.eyebrow}</p>
          <h1
            id={PAGE_TITLE_ID}
            tabIndex={-1}
            className="mt-4 text-4xl outline-none sm:text-5xl"
          >
            {HERO.headline}
          </h1>
          <p className="mt-6 text-lg">{HERO.lede}</p>
          <p className="mt-5 border-l-2 border-primary pl-4 text-muted-foreground">{HERO.honest}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={ROUTES.signUp} size="lg" trailingIcon={<ArrowRight className="h-5 w-5" />}>
              Get started
            </ButtonLink>
            {/*
              Straight to the demonstration, not to sign-in. Sending someone who
              asked to try it to an account form first contradicts the thing the
              button offers, and the line underneath — which was already written
              about the demonstration — was not true of where the link went.
            */}
            <ButtonLink to={ROUTES.demo} size="lg" variant="secondary">
              Try the demo
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The demonstration opens the whole app with a simulated ring. No email address, no account,
            and nothing saved to one.
          </p>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6">
            {HERO_FACTS.map((fact) => (
              <div key={fact.label}>
                <dt className={EYEBROW}>{fact.label}</dt>
                <dd className="mt-1 text-2xl font-semibold">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-4">
          <ProductStage hand={preferences.hand} variant="hero" caption={STAGE_CAPTION} />
          <p>
            <EvidenceLabel kind="design_intent" detail="a drawing, not a photograph" />
          </p>
        </div>
      </div>
    </section>
  );
}
