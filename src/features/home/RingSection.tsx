/**
 * "Meet the prototype" — the ring taken apart, part by part.
 *
 * Two things make this section honest rather than a product render:
 *
 * 1. Every part is Design intent. Nothing here has been built, and no
 *    dimension, mass, capacity or material is claimed anywhere, because none
 *    has been measured.
 * 2. Each part also says how it relates to the bench rig that does exist. The
 *    three magnetometers and the thumb magnet are the research paper's sensing
 *    architecture, checked in simulation only; the bench firmware senses with
 *    flex sensors, force-sensitive resistors and an IMU. Blending the two into
 *    one story would be the easiest lie on the page, so the page refuses to.
 *
 * The diagram adds nothing the words do not. "Every part in words" below it is
 * the complete text alternative, present for everyone rather than hidden
 * behind a toggle, so it is not a lesser path.
 */
import { useId, useState } from 'react';
import { HOME_SECTIONS } from '@/app/publicRoutes';
import { EvidenceLabel } from '@/components';
import {
  ExplodedRing,
  partAccessibleName,
  partNumberText,
  SPREAD_STEPS,
  spreadValueText,
  stepToProgress,
  explodeValueText,
} from '@/components/product';
import { BENCH_STATUS_TEXT, getRingPart, RING_PARTS, SENSING_STORIES, type RingPartId } from '@/domain/ringParts';
import { cn } from '@/lib/cn';
import { HomeSection } from './HomeSection';

const RING_LEDE =
  'Everything below is labelled the way a lab notebook would label it: what is designed, what the bench rig actually has, and what has never been built at all.';

export function RingSection() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<RingPartId>('outer_shell');
  const uid = useId().replace(/:/g, '');
  const sliderId = `ring-spread-${uid}`;
  const hintId = `${sliderId}-hint`;
  const detailId = `ring-detail-${uid}`;
  const detailHeadingId = `${detailId}-heading`;
  const listId = `ring-parts-${uid}`;
  const wordsId = `ring-words-${uid}`;

  const part = getRingPart(selected);

  return (
    <HomeSection id={HOME_SECTIONS.ring} eyebrow="The ring" heading="Meet the prototype" lede={RING_LEDE}>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SENSING_STORIES.map((story) => (
          <div key={story.heading} className="rounded-lg border border-border-strong bg-card p-4">
            <h3 className="font-mono-label text-muted-foreground">{story.heading}</h3>
            <p className="mt-2">{story.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-4">
          <figure className="m-0 grid gap-3">
            <ExplodedRing step={step} selected={selected} onSelect={setSelected} />
            <figcaption className="text-sm text-muted-foreground">
              The ring in cross-section, numbered 1 to 10, with the thumb magnet drawn apart because it is worn on the
              thumb rather than in the ring. Part positions are indicative, not a mechanical layout.
            </figcaption>
          </figure>

          <div className="grid gap-2">
            <label htmlFor={sliderId} className="font-medium">
              Exploded view
            </label>
            <p id={hintId} className="text-sm text-muted-foreground">
              Moves the parts of the drawing apart. The drawing is decorative: the parts list and the detail below say
              the same thing at every position.
            </p>
            <input
              id={sliderId}
              type="range"
              min={0}
              max={SPREAD_STEPS}
              step={1}
              value={step}
              aria-describedby={hintId}
              aria-valuetext={spreadValueText(step)}
              onChange={(event) => setStep(Number(event.currentTarget.value))}
              className="target-44 w-full cursor-pointer accent-primary"
            />
            {/*
              The two ends are named, and the middle reads out only while it is
              between them: at either end the readout would simply repeat the
              label beside it. Hidden from assistive technology because the
              slider's own aria-valuetext already says all of this, at more
              length and without the abbreviations.
            */}
            <p className="font-mono-label flex justify-between gap-2 text-muted-foreground" aria-hidden="true">
              <span>ASSEMBLED</span>
              <span>{step > 0 && step < SPREAD_STEPS ? explodeValueText(stepToProgress(step)) : ''}</span>
              <span>EXPLODED</span>
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          <h3 id={listId} className="font-medium">
            Parts
          </h3>
          <ul aria-labelledby={listId} className="grid list-none gap-2 p-0">
            {RING_PARTS.map((entry) => {
              const isSelected = entry.id === selected;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-label={partAccessibleName(entry)}
                    aria-pressed={isSelected}
                    aria-controls={detailId}
                    onClick={() => setSelected(entry.id)}
                    className={cn(
                      'target-44 grid w-full grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-3 rounded-md border px-3 py-2 text-left',
                      'transition-colors duration-[var(--dur-tap)]',
                      isSelected ? 'border-primary bg-secondary' : 'border-border-strong bg-card hover:bg-secondary',
                    )}
                  >
                    <span aria-hidden="true" className="font-mono-label text-muted-foreground">
                      {partNumberText(entry)}
                    </span>
                    <span className="grid gap-0.5">
                      <span>{entry.name}</span>
                      {entry.placement === 'thumb' && (
                        <span className="text-sm text-muted-foreground">Not a ring part — worn on the thumb</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* aria-labelledby, not just a heading inside: a <section> is only a
          landmark once it has an accessible name, and without one this panel
          is an unnamed group a screen reader user cannot jump back to. */}
      <section
        id={detailId}
        aria-labelledby={detailHeadingId}
        aria-live="polite"
        className="mt-8 rounded-lg border-2 border-primary bg-card p-5"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h3 id={detailHeadingId} className="text-xl">
            {part.index}. {part.name}
          </h3>
          <EvidenceLabel kind={part.evidence} detail="not built" />
        </div>
        <p className="mt-3 max-w-prose">{part.description}</p>
        <p className="mt-4 text-sm">
          <strong>Where it is worn.</strong>{' '}
          {part.placement === 'thumb'
            ? 'On the thumb. It is a separate worn item, not a ring component.'
            : 'Inside the ring.'}
        </p>
        <p className="mt-2 text-sm">
          <strong>On the research bench.</strong> {BENCH_STATUS_TEXT[part.benchStatus]}. {part.benchNote}
        </p>
      </section>

      <section aria-labelledby={wordsId} className="mt-10">
        <h3 id={wordsId} className="text-xl">
          Every part in words
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The complete text alternative to the diagram. All ten parts are design intent; none has been manufactured.
        </p>
        <dl className="mt-4">
          {RING_PARTS.map((entry) => (
            <div key={entry.id} className="grid gap-1 border-t border-border py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-4">
              <dt className="font-medium">
                {entry.index}. {entry.name}
                {entry.placement === 'thumb' ? ' (worn on the thumb)' : ''}
              </dt>
              <dd className="m-0 text-muted-foreground">{entry.role}</dd>
            </div>
          ))}
        </dl>
      </section>
    </HomeSection>
  );
}
