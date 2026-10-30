/**
 * Drawing maths for the exploded ring view, kept out of the component so it
 * can be tested on its own — the same split `stageGeometry.ts` uses.
 *
 * The diagram is a cross-section looking down the finger: the shell and the
 * carrier are concentric bands, the seven internal parts sit at fixed angles
 * around the carrier, and the thumb magnet is drawn apart from all of it
 * because it is worn on the thumb rather than in the ring.
 *
 * Positions are returned twice, in two coordinate systems that must agree:
 * SVG user units for the drawing, and percentages of the frame for the HTML
 * buttons laid over it. That is what lets the drawing stay a drawing while the
 * things a person operates are real buttons — the arrangement `HandMap` uses,
 * for the same reason.
 */
import { BAND_PARTS, getRingPart, type RingPart, type RingPartId } from '@/domain/ringParts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A position as a percentage of the frame, for positioning an HTML overlay. */
export interface Percent {
  readonly left: string;
  readonly top: string;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Degrees clockwise from the top of the diagram, in screen coordinates (y down).
 *
 * Deliberately not rounded. This is a direction, and it gets multiplied by a
 * radius of about 70 before it is used: rounding it to two decimals here moves
 * the part a quarter of a unit off its own circle, which the geometry test
 * catches. Rounding belongs on the final coordinate, not on the direction.
 */
export function unitVector(angleDeg: number): Point {
  const radians = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
}

export const DIAGRAM = {
  width: 400,
  height: 320,
  centre: { x: 150, y: 160 },
  /** Inner carrier. It stays put, so the exploded parts have a fixed reference. */
  carrierInner: 44,
  carrierOuter: 60,
  /** Outer shell in its assembled position; it lifts outwards by `shellTravel`. */
  shellInner: 64,
  shellOuter: 84,
  shellTravel: 30,
  /** Where block parts sit when assembled. */
  partHomeRadius: 70,
  /** Drawn radius of a numbered badge. The button over it is larger — see TARGET_PX. */
  badgeRadius: 13,
  /** The thumb magnet is worn separately, so it is always drawn apart. */
  thumbMagnet: { x: 342, y: 160 },
  thumbMagnetRadius: 16,
  /** Everything right of this line is worn somewhere other than the ring. */
  separatorX: 288,
} as const;

/**
 * The minimum hit area for a badge, in CSS pixels (WCAG 2.2, 2.5.8 Target Size
 * (Minimum) asks for 24×24; this project holds itself to 44×44 throughout).
 * The drawn badge stays small so the diagram reads as a diagram; the button
 * over it is this size regardless.
 */
export const TARGET_PX = 44;

export function shellRadii(progress: number): { readonly inner: number; readonly outer: number } {
  const travel = DIAGRAM.shellTravel * clamp01(progress);
  return { inner: DIAGRAM.shellInner + travel, outer: DIAGRAM.shellOuter + travel };
}

/** Where a part sits at a given explode progress (0 assembled, 1 fully apart). */
export function partPosition(part: RingPart, progress: number): Point {
  if (part.placement === 'thumb') return DIAGRAM.thumbMagnet;
  const direction = unitVector(part.angleDeg);
  const radius = DIAGRAM.partHomeRadius + part.explodeTravel * clamp01(progress);
  return {
    x: round(DIAGRAM.centre.x + direction.x * radius),
    y: round(DIAGRAM.centre.y + direction.y * radius),
  };
}

export function partHome(part: RingPart): Point {
  return partPosition(part, 0);
}

/** An SVG point as percentages of the frame, for an absolutely positioned button. */
export function toPercent(point: Point): Percent {
  return {
    left: `${round((point.x / DIAGRAM.width) * 100)}%`,
    top: `${round((point.y / DIAGRAM.height) * 100)}%`,
  };
}

export interface BadgePlacement {
  readonly id: RingPartId;
  readonly index: number;
  readonly at: Point;
  readonly percent: Percent;
}

/**
 * Where every numbered badge sits at a given explode progress.
 *
 * The seven discrete parts are badged where they actually are. The two
 * band-shaped parts have no single position, so they are annotated at the top
 * of the shell and the bottom of the carrier — far enough apart that the two
 * numbers never collide, at any slider value. The thumb magnet is badged on
 * its own block, off to the side.
 *
 * This lives here rather than in the component so the spacing can be tested at
 * every slider position instead of eyeballed at one.
 */
export function badgePlacements(progress: number): BadgePlacement[] {
  const shell = shellRadii(progress);
  const withPercent = (id: RingPartId, at: Point): BadgePlacement => ({
    id,
    index: getRingPart(id).index,
    at,
    percent: toPercent(at),
  });

  return [
    withPercent('outer_shell', {
      x: DIAGRAM.centre.x,
      y: round(DIAGRAM.centre.y - (shell.inner + shell.outer) / 2),
    }),
    withPercent('inner_carrier', {
      x: DIAGRAM.centre.x,
      y: round(DIAGRAM.centre.y + (DIAGRAM.carrierInner + DIAGRAM.carrierOuter) / 2),
    }),
    ...BAND_PARTS.map((part) => withPercent(part.id, partPosition(part, progress))),
    withPercent('thumb_magnet', DIAGRAM.thumbMagnet),
  ];
}

/**
 * Wording for the slider's current value, read out as-is by a screen reader.
 * A bare percentage would be meaningless — "60%" of what? — so the two ends
 * are named and the middle is described as a distance apart.
 */
export function explodeValueText(progress: number): string {
  const percent = Math.round(clamp01(progress) * 100);
  if (percent === 0) return 'Assembled';
  if (percent === 100) return 'Fully exploded';
  return `${percent}% apart`;
}

/**
 * The smallest gap between any two badges at this progress, in SVG units.
 * Used by the tests to prove the numbers never overlap as the slider moves;
 * a badge is `badgeRadius` across, so anything below twice that collides.
 */
export function closestBadgeGap(progress: number): number {
  const badges = badgePlacements(progress);
  let smallest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < badges.length; i += 1) {
    for (let j = i + 1; j < badges.length; j += 1) {
      const a = badges[i]?.at;
      const b = badges[j]?.at;
      if (!a || !b) continue;
      smallest = Math.min(smallest, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return round(smallest);
}
