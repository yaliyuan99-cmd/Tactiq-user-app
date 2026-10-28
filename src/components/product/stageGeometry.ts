/**
 * Drawing maths for ProductStage, kept out of the component so it can be
 * tested on its own.
 *
 * Everything is derived from `@/components/hand/geometry` — the same 300 × 400
 * drawing space, the same outline rects, the same eight contact centres and
 * the same left/right mirroring the app's HandMap uses. The public visual and
 * the in-app map therefore agree by construction: if a contact moves, both
 * move.
 */
import { commandsForContact } from '@/domain/commands';
import { CONTACT_KEYS, FINGERS, type ContactKey } from '@/domain/contacts';
import { type Hand } from '@/domain/models';
import {
  CONTACT_COORDINATES,
  HAND_OUTLINE,
  HAND_VIEWBOX_HEIGHT,
  HAND_VIEWBOX_WIDTH,
  RING_BARS,
} from '@/components/hand/geometry';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type StageVariant = 'hero' | 'compact';

export interface StageFrame {
  readonly width: number;
  readonly height: number;
  /** The hand drawing is translated by this much, leaving open space beside it. */
  readonly offsetX: number;
}

/**
 * The hero frame is wider than the hand so the composition is asymmetric: the
 * hand sits off-centre and the squeeze arcs and the thumb's reach run into the
 * empty side. The compact frame is the hand's own box, for the explorer.
 */
export const STAGE_FRAMES: Readonly<Record<StageVariant, StageFrame>> = {
  hero: { width: HAND_VIEWBOX_WIDTH + 84, height: HAND_VIEWBOX_HEIGHT, offsetX: 72 },
  compact: { width: HAND_VIEWBOX_WIDTH, height: HAND_VIEWBOX_HEIGHT, offsetX: 0 },
};

function round(value: number): number {
  return Number(value.toFixed(2));
}

/** The ring's centre, taken from the two bars geometry.ts draws on the index finger. */
export const RING_CENTRE: Point = {
  x: round((Math.min(...RING_BARS.map((b) => b.x1)) + Math.max(...RING_BARS.map((b) => b.x2))) / 2),
  y: round((Math.min(...RING_BARS.map((b) => b.y)) + Math.max(...RING_BARS.map((b) => b.y))) / 2),
};

/**
 * geometry.ts draws the thumb as a rounded rect carrying
 * `rotate(-35 95 290)`. Rotating the rect's top centre by the same amount puts
 * this point on the drawn thumb pad, so the reach curve starts on the thumb
 * instead of beside it. stageGeometry.test.ts fails if that transform changes.
 */
export const THUMB_ROTATION_DEG = -35;
export const THUMB_PIVOT: Point = { x: 95, y: 290 };

export function rotatePoint(point: Point, pivot: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: round(pivot.x + dx * Math.cos(rad) - dy * Math.sin(rad)),
    y: round(pivot.y + dx * Math.sin(rad) + dy * Math.cos(rad)),
  };
}

const THUMB_RECT = HAND_OUTLINE.find((rect) => rect.id === 'thumb');

export const THUMB_PAD: Point = THUMB_RECT
  ? rotatePoint({ x: THUMB_RECT.x + THUMB_RECT.width / 2, y: THUMB_RECT.y }, THUMB_PIVOT, THUMB_ROTATION_DEG)
  : { x: 40, y: 210 };

/** A contact centre in drawing space, before any mirroring. */
export function contactPoint(contact: ContactKey): Point {
  return { x: CONTACT_COORDINATES[contact].cx, y: CONTACT_COORDINATES[contact].cy };
}

function onCircle(centre: Point, radius: number, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  return { x: round(centre.x + radius * Math.cos(rad)), y: round(centre.y + radius * Math.sin(rad)) };
}

/**
 * One arc of the squeeze figure, centred on the ring. Degrees run clockwise
 * from the positive x axis, so 90 is down and 180 is towards the thumb.
 */
export function arcPath(radius: number, startDeg: number, endDeg: number, centre: Point = RING_CENTRE): string {
  const from = onCircle(centre, radius, startDeg);
  const to = onCircle(centre, radius, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${to.x} ${to.y}`;
}

export interface WindowArc {
  readonly radius: number;
  readonly opacity: number;
  readonly dashed: boolean;
}

/**
 * Static depth, not motion: four arcs stepping outwards from the ring stand
 * for the command window a deliberate squeeze opens. Nothing animates, so
 * reduced motion changes nothing here.
 */
export const WINDOW_ARCS: readonly WindowArc[] = [
  { radius: 58, opacity: 0.4, dashed: false },
  { radius: 96, opacity: 0.26, dashed: false },
  { radius: 136, opacity: 0.16, dashed: true },
  { radius: 178, opacity: 0.1, dashed: true },
];

export const WINDOW_ARC_START_DEG = 66;
export const WINDOW_ARC_END_DEG = 292;

/**
 * The thumb's reach to one contact point: a single quadratic bowed away from
 * the palm so it reads as a path across open space rather than a line cutting
 * through the fingers.
 */
export function reachPath(from: Point, to: Point, bow = 0.22): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const control = { x: round(midX + dy * bow), y: round(midY - dx * bow) };
  return `M ${round(from.x)} ${round(from.y)} Q ${control.x} ${control.y} ${round(to.x)} ${round(to.y)}`;
}

/** The four tip centres, then the four base centres: two measured chords across the hand. */
export const CONTACT_CHORDS: readonly string[] = (['tip', 'base'] as const).map((segment) =>
  FINGERS.map((finger) => {
    const { x, y } = contactPoint(`${finger}_${segment}` as ContactKey);
    return `${x},${y}`;
  }).join(' '),
);

export type ContactRole = 'fixed' | 'shortcut' | 'emergency';

/**
 * How a contact is drawn, read from the real command map: a point carrying a
 * shortcut is filled in the brand colour, and the one that also answers a
 * five-second hold gets the dashed emergency ring. Nothing is hard-coded.
 */
export function contactRole(contact: ContactKey): ContactRole {
  const commands = commandsForContact(contact);
  if (commands.some((command) => command.kind === 'emergency')) return 'emergency';
  if (commands.some((command) => command.kind === 'shortcut')) return 'shortcut';
  return 'fixed';
}

export const CONTACT_ROLES: Readonly<Record<ContactKey, ContactRole>> = Object.fromEntries(
  CONTACT_KEYS.map((key) => [key, contactRole(key)]),
) as Readonly<Record<ContactKey, ContactRole>>;

/** The mirror transform for a left hand, applied to the whole frame. */
export function mirrorTransform(hand: Hand, frameWidth: number): string | undefined {
  return hand === 'left' ? `translate(${frameWidth} 0) scale(-1 1)` : undefined;
}
