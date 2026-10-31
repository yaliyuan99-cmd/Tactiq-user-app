/**
 * Drawing maths for the exploded ring view, kept out of the component so it
 * can be tested on its own — the same split `stageGeometry.ts` uses.
 *
 * The drawing is an exploded assembly sheet: the ring seen at an angle, its
 * parts lifted apart along one vertical axis. That is the convention a
 * technical illustration uses, and it is readable in a way a flat plan is not
 * — a plan can show that the shell is outside the carrier, but not that it
 * goes over it.
 *
 * Projection. Every circular part is drawn as an ellipse of the same width
 * with its height multiplied by `ISO_K`, which is what a circle looks like
 * tilted away from the viewer. There is no perspective and no vanishing
 * point: parallel lines stay parallel, so a part does not change size as it
 * travels, and the same radius means the same radius anywhere in the stack.
 *
 * Positions are returned twice, in two coordinate systems that must agree:
 * SVG user units for the drawing, and percentages of the frame for the HTML
 * buttons laid over it. That is what lets the drawing stay a drawing while the
 * things a person operates are real buttons — the arrangement `HandMap` uses,
 * for the same reason.
 */
import { RING_PARTS, getRingPart, type RingPart, type RingPartId } from '@/domain/ringParts';

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
 * How flat a circle looks when tilted away from the viewer. 0.3 is a shallow
 * angle: enough that a band reads as lying in a plane rather than as a flat
 * disc, while keeping the stack tall enough to separate ten parts.
 */
export const ISO_K = 0.3;

export const DIAGRAM = {
  width: 420,
  height: 600,
  /** The axis every part is centred on, and where the centre line is drawn. */
  centreX: 210,
  /** Where the stack sits when it is fully assembled. */
  baseY: 300,
  /** Drawn radius of a numbered badge. The button over it is larger — see TARGET_PX. */
  badgeRadius: 15,
  /** How far out from the axis the numbers sit, on each side. */
  labelOffsetX: 170,
  /** The callout column runs between these, leaving room for the badge itself. */
  labelTopY: 56,
  labelBottomY: 560,
} as const;

/**
 * The minimum hit area for a badge, in CSS pixels. WCAG 2.2, 2.5.8 Target Size
 * (Minimum) asks for 24×24; this project holds itself to 44×44 throughout.
 * The drawn badge stays small so the diagram reads as a diagram; the button
 * over it is this size regardless.
 */
export const TARGET_PX = 44;

/** How a part is drawn. Each is a different thing, and looks like one. */
export type PartKind = 'band' | 'chip' | 'arc' | 'disc' | 'board' | 'magnet';

export interface PartLayout {
  readonly kind: PartKind;
  /** Half-width in SVG units. For a band or disc this is the radius. */
  readonly rx: number;
  /** Thickness of a band, or height of a chip, board or disc. */
  readonly depth: number;
  /**
   * Where the part sits when fully exploded, as a signed offset from `baseY`.
   * Negative is up. Assembled, every part is at 0.
   */
  readonly explodeY: number;
  /**
   * Degrees clockwise from the top for a part that sits around the band rather
   * than on its axis. Only the three magnetometers use it.
   */
  readonly angleDeg?: number;
  /** Which side of the stack the number sits on. */
  readonly labelSide: 'left' | 'right';
}

/**
 * The stack, outermost first. The order is the order a person would take the
 * ring apart in, which is why the shell lifts furthest and the thumb magnet —
 * which was never inside the ring — sits below everything else.
 */
export const LAYOUT: Readonly<Record<RingPartId, PartLayout>> = {
  outer_shell: { kind: 'band', rx: 136, depth: 26, explodeY: -200, labelSide: 'left' },
  inner_carrier: { kind: 'band', rx: 106, depth: 18, explodeY: -135, labelSide: 'right' },
  magnetometer_1: { kind: 'chip', rx: 16, depth: 11, explodeY: -78, angleDeg: 210, labelSide: 'left' },
  magnetometer_2: { kind: 'chip', rx: 16, depth: 11, explodeY: -78, angleDeg: 330, labelSide: 'right' },
  magnetometer_3: { kind: 'chip', rx: 16, depth: 11, explodeY: -78, angleDeg: 90, labelSide: 'right' },
  squeeze_sensor: { kind: 'arc', rx: 98, depth: 10, explodeY: -4, labelSide: 'left' },
  haptic_actuator: { kind: 'disc', rx: 30, depth: 14, explodeY: 58, labelSide: 'right' },
  controller: { kind: 'board', rx: 84, depth: 18, explodeY: 118, labelSide: 'left' },
  power_system: { kind: 'disc', rx: 48, depth: 20, explodeY: 180, labelSide: 'right' },
  thumb_magnet: { kind: 'magnet', rx: 24, depth: 12, explodeY: 245, labelSide: 'left' },
};

export function layoutOf(id: RingPartId): PartLayout {
  return LAYOUT[id];
}

/** The vertical radius of a circle of width `rx` seen at the drawing's angle. */
export function isoRy(rx: number): number {
  return round(rx * ISO_K);
}

/** A seat on the carrier's ellipse, for a part that sits around the band. */
function seatOn(angleDeg: number): Point {
  const carrier = LAYOUT.inner_carrier;
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: round(Math.sin(radians) * (carrier.rx - 14)),
    y: round(-Math.cos(radians) * isoRy(carrier.rx - 14)),
  };
}

/**
 * Where a part's centre sits at a given explode progress.
 *
 * Travel is vertical only, so a part never drifts sideways as the slider
 * moves and the stack stays a stack. A part placed around the band keeps its
 * seat on the ellipse, which is what makes the three magnetometers read as
 * spaced around the carrier rather than piled on its axis.
 */
export function partPosition(part: RingPart, progress: number): Point {
  const layout = layoutOf(part.id);
  const seat = layout.angleDeg === undefined ? { x: 0, y: 0 } : seatOn(layout.angleDeg);
  return {
    x: round(DIAGRAM.centreX + seat.x),
    y: round(DIAGRAM.baseY + seat.y + layout.explodeY * clamp01(progress)),
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
  /** Where the number sits: out to the side, level with its part. */
  readonly at: Point;
  readonly percent: Percent;
  /** Where the leader line meets the part. */
  readonly anchor: Point;
  readonly side: 'left' | 'right';
}

/**
 * Where every numbered badge sits at a given explode progress.
 *
 * Numbers are set out to the sides rather than on the parts, which is how a
 * parts drawing is annotated: nothing is written over the drawing, and a
 * leader line carries the eye from the number to the thing it names.
 *
 * The column is EVENLY SPACED and does not move with the slider, while the
 * leader line's other end follows the part. Numbers that tracked their parts
 * would all pile up at one height when the ring is assembled — every part is
 * at the same place then, which is what being assembled means — and ten
 * buttons would land on top of each other. A fixed column cannot collide, and
 * the line is what says which number belongs to which part.
 */
export function badgePlacements(progress: number): BadgePlacement[] {
  const columns: Record<'left' | 'right', RingPartId[]> = { left: [], right: [] };
  for (const part of RING_PARTS) columns[layoutOf(part.id).labelSide].push(part.id);

  return RING_PARTS.map((part) => {
    const layout = layoutOf(part.id);
    const side = layout.labelSide;
    const column = columns[side];
    const place = column.indexOf(part.id);
    const spacing = column.length > 1 ? (DIAGRAM.labelBottomY - DIAGRAM.labelTopY) / (column.length - 1) : 0;
    const direction = side === 'left' ? -1 : 1;
    const at: Point = {
      x: round(DIAGRAM.centreX + direction * DIAGRAM.labelOffsetX),
      y: round(DIAGRAM.labelTopY + place * spacing),
    };
    return { id: part.id, index: part.index, at, percent: toPercent(at), anchor: partPosition(part, progress), side };
  });
}

/**
 * The slider's stops. Eleven, not a hundred: a switch user stepping through
 * single activations crosses the whole range in ten presses rather than a
 * hundred, and Home and End reach the two positions that actually matter in
 * one. Each stop is a tenth of the way apart.
 */
export const SPREAD_STEPS = 10;

export function stepToProgress(step: number): number {
  return clamp01(step / SPREAD_STEPS);
}

/**
 * What the slider says when a screen reader reads its value.
 *
 * A table rather than a formula, so the wording is auditable and tested. It is
 * longer than the visible readout on purpose: "50%" is meaningless without the
 * drawing, so the value text says what the drawing looks like instead of
 * reading out a number nobody can see.
 */
export const SPREAD_VALUE_TEXT: readonly string[] = [
  'Assembled. All ten parts drawn stacked together, the way the ring would be put together.',
  '10 percent apart. The outer shell has just lifted clear.',
  '20 percent apart.',
  '30 percent apart.',
  '40 percent apart.',
  '50 percent apart. Halfway open.',
  '60 percent apart.',
  '70 percent apart.',
  '80 percent apart.',
  '90 percent apart. Almost fully apart.',
  'Fully exploded. All ten parts drawn separately down the stack, each joined by a leader line to its number.',
];

export function spreadValueText(step: number): string {
  const index = Math.min(Math.max(Math.round(step), 0), SPREAD_STEPS);
  return SPREAD_VALUE_TEXT[index] ?? SPREAD_VALUE_TEXT[0] ?? '';
}

/** The short text beside the slider. The long form is what a screen reader reads. */
export function explodeValueText(progress: number): string {
  const percent = Math.round(clamp01(progress) * 100);
  if (percent === 0) return 'Assembled';
  if (percent === 100) return 'Fully exploded';
  return `${percent}% apart`;
}

/**
 * The smallest vertical gap between two badges in the same column, in SVG
 * units. Numbers are set in two columns, so only same-side neighbours can
 * collide; this is what the tests sweep to prove none ever does.
 */
export function closestBadgeGap(progress: number): number {
  const badges = badgePlacements(progress);
  let smallest = Number.POSITIVE_INFINITY;
  for (const side of ['left', 'right'] as const) {
    const column = badges.filter((badge) => badge.side === side);
    for (let i = 0; i < column.length; i += 1) {
      for (let j = i + 1; j < column.length; j += 1) {
        const a = column[i]?.at;
        const b = column[j]?.at;
        if (!a || !b) continue;
        smallest = Math.min(smallest, Math.abs(a.y - b.y));
      }
    }
  }
  return round(smallest);
}

/**
 * The narrowest the drawing can be rendered while its 44 px badges still sit
 * clear of one another.
 *
 * The badges are fixed px while the drawing scales with its container, so
 * below this width neighbouring badges overlap and a tap meant for the squeeze
 * sensor lands on the haptic motor. Narrower than this, the drawing keeps its
 * shapes but stops carrying buttons, and the parts list beside it is the only
 * way to choose a part. Derived from the geometry rather than guessed, so it
 * stays correct if a part moves — the same arrangement as
 * `src/features/practice/handViewFit.ts`.
 *
 * Measured against the frame's height, because that is the axis the badges
 * are spread along; the frame keeps a fixed aspect ratio, so one implies the
 * other.
 */
export const MIN_DIAGRAM_WIDTH = (() => {
  let closest = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= SPREAD_STEPS; step += 1) {
    closest = Math.min(closest, closestBadgeGap(stepToProgress(step)));
  }
  const minHeight = (TARGET_PX * DIAGRAM.height) / closest;
  return Math.ceil((minHeight * DIAGRAM.width) / DIAGRAM.height);
})();

/** True when a container of this width can carry the interactive badges. */
export function diagramFits(width: number): boolean {
  return width >= MIN_DIAGRAM_WIDTH;
}

/** Said when the drawing is too narrow to be operated, so nothing looks broken. */
export const DIAGRAM_TOO_NARROW_NOTE =
  'The drawing is too narrow to carry buttons at this width, so the parts list below is the way to choose a part.';

/**
 * Said aloud by the diagram badge and by the list row alike. One function, so
 * the two routes to the same part cannot drift into describing it differently.
 */
export function partAccessibleName(part: RingPart): string {
  return `Part ${part.index} of ${RING_PARTS.length}, ${part.name}`;
}

/** "03" — the visible number. Zero-padded so the column does not ripple. */
export function partNumberText(part: RingPart): string {
  return String(part.index).padStart(2, '0');
}

export { getRingPart };
