/**
 * Hand illustration geometry, ported from the Tactiq website's line-drawn hand.
 * A 300 × 400 drawing space; right hand, palm towards the viewer, so the thumb
 * sits on the LEFT. The left hand is the same drawing mirrored.
 */
import { type ContactKey } from '@/domain/contacts';
import { type Hand } from '@/domain/models';

export const HAND_VIEWBOX_WIDTH = 300;
export const HAND_VIEWBOX_HEIGHT = 400;

export interface OutlineRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx: number;
  readonly transform?: string;
}

export const HAND_OUTLINE: readonly OutlineRect[] = [
  { id: 'wrist', x: 112, y: 325, width: 96, height: 72, rx: 26 },
  { id: 'palm', x: 80, y: 198, width: 162, height: 148, rx: 46 },
  { id: 'index', x: 92, y: 100, width: 33, height: 148, rx: 16.5 },
  { id: 'middle', x: 134, y: 80, width: 33, height: 168, rx: 16.5 },
  { id: 'ring', x: 176, y: 100, width: 33, height: 148, rx: 16.5 },
  { id: 'pinky', x: 214, y: 130, width: 31, height: 120, rx: 15.5 },
  { id: 'thumb', x: 80, y: 193, width: 31, height: 104, rx: 15.5, transform: 'rotate(-35 95 290)' },
];

/** The ring, worn on the index finger: two bars. */
export const RING_BARS: readonly { readonly x1: number; readonly x2: number; readonly y: number }[] = [
  { x1: 90, x2: 127, y: 196 },
  { x1: 90, x2: 127, y: 206 },
];

/** Contact point centres for the right hand. */
export const CONTACT_COORDINATES: Readonly<Record<ContactKey, { readonly cx: number; readonly cy: number }>> = {
  index_tip: { cx: 108, cy: 112 },
  index_base: { cx: 108, cy: 224 },
  middle_tip: { cx: 150, cy: 96 },
  middle_base: { cx: 150, cy: 220 },
  ring_tip: { cx: 192, cy: 112 },
  ring_base: { cx: 192, cy: 224 },
  pinky_tip: { cx: 228, cy: 140 },
  pinky_base: { cx: 228, cy: 232 },
};

export interface ContactPosition {
  /** Drawing-space centre after mirroring for the chosen hand. */
  readonly x: number;
  readonly y: number;
  /** CSS percentages for absolutely positioned overlays. */
  readonly left: string;
  readonly top: string;
}

function percent(value: number, total: number): string {
  return `${Number(((value / total) * 100).toFixed(3))}%`;
}

export function contactPosition(contact: ContactKey, hand: Hand): ContactPosition {
  const { cx, cy } = CONTACT_COORDINATES[contact];
  const x = hand === 'left' ? HAND_VIEWBOX_WIDTH - cx : cx;
  return { x, y: cy, left: percent(x, HAND_VIEWBOX_WIDTH), top: percent(cy, HAND_VIEWBOX_HEIGHT) };
}
