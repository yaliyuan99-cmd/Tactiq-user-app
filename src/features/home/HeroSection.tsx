import { Suspense, lazy } from 'react';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { Braille, ButtonLink, PAGE_TITLE_ID } from '@/components';
import { ProductStage } from '@/components/product';
import { usePreferences } from '@/services/preferences/PreferencesProvider';
import { HERO, HERO_FACTS } from './homeContent';

const TryItLive = lazy(() => import('@/components/product/TryItLive'));

/**
 * The hero. Its text and both actions are plain, eagerly loaded markup, so `/`
 * paints its headline and its two calls to action on the first frame. The
 * working demonstration beside them loads separately, with the static drawing
 * standing in until it arrives.
 */
export function HeroSection() {
  const { preferences } = usePreferences();
  return (
    <section aria-labelledby={PAGE_TITLE_ID}>
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] xl:gap-10">
        <div className="relative min-w-0">
          {/* A note in the margin, in red pen, the way the logbook flags a claim. */}
          <p aria-hidden="true" className="margin-note absolute right-full top-[15rem] mr-[3.75rem] hidden w-24 text-right min-[86rem]:block">
            not built,
            <br />
            see Fig. 1
          </p>
          {/* "feel it", in braille: the page opens with the thing the product is about. Decorative. */}
          <Braille text="feel it" dot={4} className="text-foreground" />
          <p className="biro mt-7 text-xl">{HERO.question}</p>
          <h1
            id={PAGE_TITLE_ID}
            tabIndex={-1}
            className="mt-3 text-[clamp(2.75rem,1.9rem+2.4vw,3.75rem)] leading-[0.98] tracking-[-0.04em] outline-none text-balance"
          >
            {HERO.headline.slice(0, HERO.headline.length - HERO.headlineMark.length)}
            <span className="marker">{HERO.headlineMark}</span>
          </h1>
          <p className="mt-6 max-w-[36ch] text-xl leading-snug text-pretty">{HERO.lede}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {/*
              Straight to the demonstration, not to sign-in. Sending someone who
              asked to try it to an account form first contradicts the thing the
              button offers, and the line underneath — which was already written
              about the demonstration — was not true of where the link went.
            */}
            <ButtonLink to={ROUTES.demo} size="lg">
              Try the demo
            </ButtonLink>
            <ButtonLink
              to={ROUTES.signUp}
              size="lg"
              variant="secondary"
              trailingIcon={<ArrowRight className="h-5 w-5 transition-transform group-hover/button:translate-x-0.5" />}
            >
              Get started
            </ButtonLink>
          </div>
          <p className="mt-3 max-w-[52ch] text-sm text-muted-foreground">
            The demonstration opens the whole app with a simulated ring. No email address, no account,
            and nothing saved to one.
          </p>

          {/* Taped into the page: the one thing nobody should miss. */}
          <p className="tape mt-10 inline-block -rotate-[1.5deg] border-[1.5px] border-foreground bg-card px-4 py-2.5 font-mono-label text-[0.9rem] uppercase tracking-[0.04em] shadow-card">
            {HERO.status}
          </p>
          <p className="mt-4 max-w-[52ch] text-sm text-muted-foreground">{HERO.honest}</p>
        </div>

        <figure className="relative m-0 min-w-0 xl:rotate-[0.5deg]">
          {/* The author's note on the figure, in biro. */}
          <div aria-hidden="true" className="biro pointer-events-none absolute -top-12 right-4 hidden items-end gap-1 text-lg xl:flex">
            <span className="-rotate-3">try it: squeeze, then tap a point</span>
            <svg width="46" height="44" viewBox="0 0 46 44" className="mb-[-28px] text-primary-strong">
              <path d="M4 4 C 26 6, 40 16, 38 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M31 33 L 38 41 L 43 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <Suspense fallback={<ProductStage hand={preferences.hand} variant="hero" legend={false} />}>
            <TryItLive hand={preferences.hand} />
          </Suspense>
          <figcaption className="font-mono-label mt-3 text-muted-foreground">
            <strong className="text-foreground">Fig. 1</strong> Squeeze, then tap. A working simulation of the ring and a phone.
          </figcaption>
        </figure>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <dl className="grid border-t-2 border-foreground sm:grid-cols-3">
          {HERO_FACTS.map((fact) => (
            <div key={fact.label} className="flex flex-col-reverse border-foreground px-1 py-5 sm:px-6 sm:[&:not(:first-child)]:border-l">
              <dt className="mt-1 text-muted-foreground">{fact.label}</dt>
              <dd className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
