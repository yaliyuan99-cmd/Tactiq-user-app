/**
 * The exploded view of the designed ring.
 *
 * The drawing is a drawing: the `<svg>` is `aria-hidden`, and the ten numbered
 * things a person can operate are real HTML buttons positioned over it. That
 * is the arrangement `HandMap` uses, for the same two reasons — a `<g onClick>`
 * is invisible to assistive technology and unreachable by keyboard, and an SVG
 * shape cannot be given a 44×44 hit area without changing how it looks.
 *
 * The badges are a single roving-tabindex group, so Tab reaches the diagram
 * once rather than ten times and the arrow keys move between parts. The parts
 * list beside it is the same ten buttons again in document order; both write to
 * one piece of state in the parent, so the two can never disagree about what is
 * selected.
 *
 * Sizes here are deliberately in px rather than rem. At the larger text size
 * the root font is 21px, and a 2.75rem badge would be 57.75px — wide enough
 * that neighbouring badges overlap and a tap meant for one lands on another.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { getRingPart, type RingPartId } from '@/domain/ringParts';
import { cn } from '@/lib/cn';
import { BAND_PARTS } from '@/domain/ringParts';
import {
  badgePlacements,
  DIAGRAM,
  diagramFits,
  DIAGRAM_TOO_NARROW_NOTE,
  partAccessibleName,
  partNumberText,
  partHome,
  partPosition,
  shellRadii,
  stepToProgress,
} from './explodedGeometry';

export interface ExplodedRingProps {
  /** 0 to SPREAD_STEPS. Converted to a 0–1 progress for the geometry. */
  readonly step: number;
  readonly selected: RingPartId;
  readonly onSelect: (id: RingPartId) => void;
  readonly className?: string;
}

export function ExplodedRing({ step, selected, onSelect, className }: ExplodedRingProps) {
  const progress = stepToProgress(step);
  const shell = shellRadii(progress);
  const badges = badgePlacements(progress);
  const groupRef = useRef<HTMLDivElement>(null);

  // The badges are fixed px while the drawing scales with this container, so
  // below diagramFits() neighbouring badges would overlap and a tap meant for
  // one part would land on another. The drawing then keeps its shapes and
  // stops carrying buttons; the parts list is always there to choose from.
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = frameRef.current;
    if (!element || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[entries.length - 1]?.contentRect.width;
      if (typeof width === 'number' && width > 0) setFrameWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const operable = frameWidth === null || diagramFits(frameWidth);

  /**
   * Arrow keys move between badges and select as they go, which is what a
   * single-selection group should do: the detail panel follows focus, so a
   * keyboard user reads each part by arrowing through them rather than having
   * to press Enter on every one.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const order = badges.map((badge) => badge.id);
    const current = order.indexOf(selected);
    const last = order.length - 1;
    let next = current;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = current >= last ? 0 : current + 1;
    else next = current <= 0 ? last : current - 1;
    const id = order[next];
    if (!id) return;
    onSelect(id);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-part="${id}"]`)?.focus();
  };

  return (
    <div
      ref={frameRef}
      className={cn('relative w-full', className)}
      style={{ aspectRatio: `${DIAGRAM.width} / ${DIAGRAM.height}` }}
    >
      <svg
        viewBox={`0 0 ${DIAGRAM.width} ${DIAGRAM.height}`}
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full"
      >
        {/* Inner carrier: the fixed reference everything else is placed against. */}
        <circle
          cx={DIAGRAM.centre.x}
          cy={DIAGRAM.centre.y}
          r={(DIAGRAM.carrierInner + DIAGRAM.carrierOuter) / 2}
          fill="none"
          strokeWidth={DIAGRAM.carrierOuter - DIAGRAM.carrierInner}
          className={selected === 'inner_carrier' ? 'stroke-primary' : 'stroke-secondary'}
        />
        <circle cx={DIAGRAM.centre.x} cy={DIAGRAM.centre.y} r={DIAGRAM.carrierInner} fill="none" strokeWidth={1} className="stroke-border-strong" />
        <circle cx={DIAGRAM.centre.x} cy={DIAGRAM.centre.y} r={DIAGRAM.carrierOuter} fill="none" strokeWidth={1} className="stroke-border-strong" />

        {/* Outer shell: lifts away first, because it is the only part a wearer touches. */}
        <circle
          cx={DIAGRAM.centre.x}
          cy={DIAGRAM.centre.y}
          r={(shell.inner + shell.outer) / 2}
          fill="none"
          strokeWidth={shell.outer - shell.inner}
          className={selected === 'outer_shell' ? 'stroke-primary' : 'stroke-secondary'}
        />
        <circle cx={DIAGRAM.centre.x} cy={DIAGRAM.centre.y} r={shell.outer} fill="none" strokeWidth={1} className="stroke-border-strong" />
        <circle cx={DIAGRAM.centre.x} cy={DIAGRAM.centre.y} r={shell.inner} fill="none" strokeWidth={1} className="stroke-border-strong" />

        {/* Leader lines back to where each part is seated. */}
        {progress > 0.02 &&
          BAND_PARTS.map((part) => {
            const home = partHome(part);
            const now = partPosition(part, progress);
            return (
              <line
                key={`leader-${part.id}`}
                x1={home.x}
                y1={home.y}
                x2={now.x}
                y2={now.y}
                strokeWidth={1}
                strokeDasharray="4 4"
                className="stroke-border-strong"
              />
            );
          })}

        {/* Everything right of this line is worn somewhere other than the ring. */}
        <line
          x1={DIAGRAM.separatorX}
          y1={40}
          x2={DIAGRAM.separatorX}
          y2={DIAGRAM.height - 40}
          strokeWidth={1}
          strokeDasharray="2 6"
          className="stroke-border-strong"
        />

        {/* The numbered parts themselves. Drawn here rather than left to the
            buttons, so the diagram still shows all ten at a width too narrow
            to carry buttons, and so one part cannot be visible only on hover. */}
        {badges.map((badge) => {
          const isSelected = badge.id === selected;
          return (
            <g key={badge.id}>
              <circle
                cx={badge.at.x}
                cy={badge.at.y}
                r={DIAGRAM.badgeRadius}
                strokeWidth={isSelected ? 3 : 1.5}
                className={cn(
                  isSelected ? 'fill-primary stroke-primary' : 'fill-card stroke-foreground',
                )}
              />
              <text
                x={badge.at.x}
                y={badge.at.y + 4}
                textAnchor="middle"
                fontSize={12}
                className={cn('font-mono-label', isSelected ? 'fill-primary-foreground' : 'fill-foreground')}
              >
                {partNumberText(getRingPart(badge.id))}
              </text>
            </g>
          );
        })}
      </svg>

      {!operable && (
        <p className="absolute inset-x-0 bottom-0 text-sm text-muted-foreground">{DIAGRAM_TOO_NARROW_NOTE}</p>
      )}

      {/* The operable layer. One tab stop; the arrow keys move within it. */}
      {operable && (
      <div
        ref={groupRef}
        role="group"
        aria-label="The ring's parts, numbered 1 to 10"
        className="absolute inset-0"
        onKeyDown={onKeyDown}
      >
        {badges.map((badge) => {
          const part = getRingPart(badge.id);
          const isSelected = badge.id === selected;
          return (
            <button
              key={badge.id}
              type="button"
              data-part={badge.id}
              aria-label={partAccessibleName(part)}
              aria-pressed={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(badge.id)}
              style={{ left: badge.percent.left, top: badge.percent.top }}
              className={cn(
                // Transparent: the SVG below already draws the numbered part,
                // including its selected state. This is the hit area and the
                // focus ring, held at 44px whatever size the drawing is.
                'absolute h-[44px] w-[44px] -translate-x-1/2 -translate-y-1/2 rounded-full',
                'bg-transparent hover:bg-primary/10',
                isSelected && 'z-10',
              )}
            >
              <span className="sr-only">{partNumberText(part)}</span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
