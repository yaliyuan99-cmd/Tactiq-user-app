/**
 * When the hand drawing is too narrow to be operated.
 *
 * Interactive contact points are fixed 44 px buttons (deliberately not
 * rem-based, so larger text sizes cannot shrink them), while the drawing
 * itself scales with its container. They therefore only stay clear of one
 * another while the figure is wide enough for the closest pair of contact
 * centres — the ring and pinky finger bases — to be 44 px apart. Narrower than
 * that the two overlap, and a tap meant for Previous can land on Shortcut 2,
 * so the practice surface falls back to the list and says so. The user's
 * choice is kept for wider screens.
 *
 * Pure: no React, no services. Derived from the drawing geometry, so it stays
 * correct if a contact point moves.
 */
import { CONTACT_COORDINATES, HAND_VIEWBOX_WIDTH } from '@/components';
import { CONTACT_KEYS } from '@/domain/contacts';

/** Matches INTERACTIVE_POINT_SIZE in src/components/hand/HandMap.tsx and the 44 px target-size rule. */
export const INTERACTIVE_POINT_SIZE = 44;

/** The closest distance between two contact centres, in the drawing's 300 units. */
export const CLOSEST_CONTACT_DISTANCE = (() => {
  let closest = Infinity;
  for (let i = 0; i < CONTACT_KEYS.length; i += 1) {
    for (let j = i + 1; j < CONTACT_KEYS.length; j += 1) {
      const a = CONTACT_COORDINATES[CONTACT_KEYS[i]!];
      const b = CONTACT_COORDINATES[CONTACT_KEYS[j]!];
      closest = Math.min(closest, Math.hypot(a.cx - b.cx, a.cy - b.cy));
    }
  }
  return closest;
})();

/** The narrowest figure whose 44 px points still sit apart: about 358 px. */
export const MIN_HAND_VIEW_WIDTH = Math.ceil((INTERACTIVE_POINT_SIZE * HAND_VIEWBOX_WIDTH) / CLOSEST_CONTACT_DISTANCE);

/** Shown when the hand view was chosen but the list is being used instead. */
export const HAND_VIEW_TOO_NARROW_NOTE = 'Hand view needs a wider screen, so the list is shown.';

/** True when a container of this width can hold the interactive hand drawing. */
export function handViewFits(width: number): boolean {
  return width >= MIN_HAND_VIEW_WIDTH;
}
