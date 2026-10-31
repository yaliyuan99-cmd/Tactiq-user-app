/**
 * The exploded view of the designed ring, drawn as an assembly sheet.
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
import { RING_PARTS, getRingPart, type RingPartId } from '@/domain/ringParts';
import { cn } from '@/lib/cn';
import {
  badgePlacements,
  DIAGRAM,
  DIAGRAM_TOO_NARROW_NOTE,
  diagramFits,
  isoRy,
  layoutOf,
  partAccessibleName,
  partNumberText,
  partPosition,
  stepToProgress,
  type PartLayout,
  type Point,
} from './explodedGeometry';

export interface ExplodedRingProps {
  /** 0 to SPREAD_STEPS. Converted to a 0–1 progress for the geometry. */
  readonly step: number;
  readonly selected: RingPartId;
  readonly onSelect: (id: RingPartId) => void;
  readonly className?: string;
}

/**
 * One part, drawn as what it is. A band is a ring of material seen at an
 * angle, a board is a flat rectangle, a magnet is a small solid disc: the
 * shapes carry meaning the numbers alone would not.
 */
function Part({ layout, at, selected }: { layout: PartLayout; at: Point; selected: boolean }) {
  const ry = isoRy(layout.rx);
  const fill = selected ? 'fill-primary' : 'fill-card';
  const stroke = selected ? 'stroke-primary' : 'stroke-foreground';
  const solid = selected ? 'fill-primary' : 'fill-foreground';
  const edge = selected ? 2.5 : 1.5;

  if (layout.kind === 'band' || layout.kind === 'arc') {
    // The near wall gives the band its thickness: a flat ellipse would read as
    // a disc, and the point of the angle is that these are rings with depth.
    const inner = layout.rx * (layout.kind === 'arc' ? 0.74 : 0.62);
    return (
      <g>
        <path
          d={`M ${at.x - layout.rx} ${at.y} a ${layout.rx} ${ry} 0 0 0 ${layout.rx * 2} 0 l 0 ${layout.depth} a ${layout.rx} ${ry} 0 0 1 ${-layout.rx * 2} 0 z`}
          className={cn(selected ? 'fill-primary-strong' : 'fill-secondary', stroke)}
          strokeWidth={edge}
        />
        <ellipse cx={at.x} cy={at.y} rx={layout.rx} ry={ry} className={cn(fill, stroke)} strokeWidth={edge} />
        <ellipse cx={at.x} cy={at.y} rx={inner} ry={isoRy(inner)} className={cn('fill-background', stroke)} strokeWidth={edge} />
      </g>
    );
  }

  if (layout.kind === 'board') {
    return (
      <g>
        <path
          d={`M ${at.x - layout.rx} ${at.y} a ${layout.rx} ${ry} 0 0 0 ${layout.rx * 2} 0 l 0 ${layout.depth} a ${layout.rx} ${ry} 0 0 1 ${-layout.rx * 2} 0 z`}
          className={cn(selected ? 'fill-primary-strong' : 'fill-secondary', stroke)}
          strokeWidth={edge}
        />
        <ellipse cx={at.x} cy={at.y} rx={layout.rx} ry={ry} className={cn(fill, stroke)} strokeWidth={edge} />
        {/* A few traces, so the board reads as a board rather than a lid. */}
        <g className={selected ? 'stroke-primary-foreground' : 'stroke-border-strong'} strokeWidth={1.5} fill="none">
          <path d={`M ${at.x - 40} ${at.y} h 26 v -7 h 22`} />
          <path d={`M ${at.x + 12} ${at.y + 7} h 24`} />
        </g>
      </g>
    );
  }

  if (layout.kind === 'disc' || layout.kind === 'magnet') {
    return (
      <g>
        <path
          d={`M ${at.x - layout.rx} ${at.y} a ${layout.rx} ${ry} 0 0 0 ${layout.rx * 2} 0 l 0 ${layout.depth} a ${layout.rx} ${ry} 0 0 1 ${-layout.rx * 2} 0 z`}
          className={cn(selected ? 'fill-primary-strong' : 'fill-secondary', stroke)}
          strokeWidth={edge}
        />
        <ellipse
          cx={at.x}
          cy={at.y}
          rx={layout.rx}
          ry={ry}
          className={cn(layout.kind === 'magnet' ? solid : fill, stroke)}
          strokeWidth={edge}
        />
      </g>
    );
  }

  // A chip: a small block sitting on the carrier.
  return (
    <g>
      <rect
        x={at.x - layout.rx}
        y={at.y - layout.depth / 2}
        width={layout.rx * 2}
        height={layout.depth}
        rx={2}
        className={cn(solid, stroke)}
        strokeWidth={edge}
      />
    </g>
  );
}

export function ExplodedRing({ step, selected, onSelect, className }: ExplodedRingProps) {
  const progress = stepToProgress(step);
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
    const order = RING_PARTS.map((part) => part.id);
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

  // Drawn back to front: a part lower in the stack must not paint over the one
  // above it, or the assembled state would show the board through the shell.
  const drawOrder = [...RING_PARTS].sort((a, b) => partPosition(b, progress).y - partPosition(a, progress).y);

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
        {/* The axis the whole assembly is built on. */}
        <line
          x1={DIAGRAM.centreX}
          y1={28}
          x2={DIAGRAM.centreX}
          y2={DIAGRAM.height - 20}
          strokeWidth={1}
          strokeDasharray="3 7"
          className="stroke-border-strong"
        />

        {/* Leader lines, under the parts so nothing is drawn across a face. */}
        {badges.map((badge) => {
          const toward = badge.side === 'left' ? 1 : -1;
          const elbowX = badge.at.x + toward * 26;
          return (
            <polyline
              key={`leader-${badge.id}`}
              points={`${badge.at.x},${badge.at.y} ${elbowX},${badge.at.y} ${badge.anchor.x},${badge.anchor.y}`}
              fill="none"
              strokeWidth={1}
              className={badge.id === selected ? 'stroke-primary' : 'stroke-border-strong'}
            />
          );
        })}

        {drawOrder.map((part) => (
          <Part key={part.id} layout={layoutOf(part.id)} at={partPosition(part, progress)} selected={part.id === selected} />
        ))}

        {/* The numbers themselves, in their two fixed columns. */}
        {badges.map((badge) => {
          const isSelected = badge.id === selected;
          return (
            <g key={`badge-${badge.id}`}>
              <circle
                cx={badge.at.x}
                cy={badge.at.y}
                r={DIAGRAM.badgeRadius}
                strokeWidth={isSelected ? 3 : 1.5}
                className={isSelected ? 'fill-primary stroke-primary' : 'fill-card stroke-foreground'}
              />
              <text
                x={badge.at.x}
                y={badge.at.y + 4}
                textAnchor="middle"
                fontSize={13}
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
