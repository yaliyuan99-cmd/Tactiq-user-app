import { BAND_PARTS, RING_PARTS, getRingPart } from '@/domain/ringParts';
import {
  badgePlacements,
  clamp01,
  closestBadgeGap,
  DIAGRAM,
  explodeValueText,
  partHome,
  partPosition,
  shellRadii,
  toPercent,
  unitVector,
} from './explodedGeometry';

/** Slider positions worth checking: both ends and a sweep through the middle. */
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);

describe('clamp01', () => {
  it('holds the slider inside its own range, whatever it is given', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('unitVector', () => {
  it.each([
    [0, 0, -1],
    [90, 1, 0],
    [180, 0, 1],
    [270, -1, 0],
  ])('measures %i degrees clockwise from the top, in screen coordinates', (deg, x, y) => {
    const v = unitVector(deg);
    expect(v.x).toBeCloseTo(x, 10);
    expect(v.y).toBeCloseTo(y, 10);
  });

  it('stays a unit vector, so a radius means what it says', () => {
    for (const deg of [0, 30, 90, 150, 210, 250, 290, 330]) {
      const v = unitVector(deg);
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 10);
    }
  });
});

describe('the shell', () => {
  it('sits on the carrier when assembled and lifts clear of it when exploded', () => {
    const closed = shellRadii(0);
    const open = shellRadii(1);
    expect(closed.inner).toBe(DIAGRAM.shellInner);
    // Assembled, the shell's inner edge is outside the carrier's outer edge:
    // the parts are stacked, not intersecting.
    expect(closed.inner).toBeGreaterThan(DIAGRAM.carrierOuter);
    expect(open.inner).toBe(DIAGRAM.shellInner + DIAGRAM.shellTravel);
    expect(open.outer - open.inner).toBe(closed.outer - closed.inner);
  });

  it('only ever moves outwards as the slider opens', () => {
    for (let i = 1; i < STEPS.length; i += 1) {
      const previous = shellRadii(STEPS[i - 1] ?? 0);
      const current = shellRadii(STEPS[i] ?? 0);
      expect(current.inner).toBeGreaterThanOrEqual(previous.inner);
    }
  });
});

describe('part positions', () => {
  it('seats every band part on one circle when assembled', () => {
    for (const part of BAND_PARTS) {
      const home = partHome(part);
      const radius = Math.hypot(home.x - DIAGRAM.centre.x, home.y - DIAGRAM.centre.y);
      expect(radius).toBeCloseTo(DIAGRAM.partHomeRadius, 1);
    }
  });

  it('moves each band part straight outwards, never sideways', () => {
    for (const part of BAND_PARTS) {
      const home = partHome(part);
      const open = partPosition(part, 1);
      const homeAngle = Math.atan2(home.y - DIAGRAM.centre.y, home.x - DIAGRAM.centre.x);
      const openAngle = Math.atan2(open.y - DIAGRAM.centre.y, open.x - DIAGRAM.centre.x);
      expect(openAngle).toBeCloseTo(homeAngle, 3);
      const travelled = Math.hypot(open.x - home.x, open.y - home.y);
      expect(travelled).toBeCloseTo(part.explodeTravel, 1);
    }
  });

  it('leaves the thumb magnet where it is, because it never was in the ring', () => {
    const magnet = getRingPart('thumb_magnet');
    for (const step of STEPS) {
      expect(partPosition(magnet, step)).toEqual(DIAGRAM.thumbMagnet);
    }
  });

  it('keeps the thumb magnet on the far side of the separator at every position', () => {
    // The separator is what says "worn somewhere else". A magnet drawn to the
    // left of it would read as a ring part.
    expect(DIAGRAM.thumbMagnet.x - DIAGRAM.thumbMagnetRadius).toBeGreaterThan(DIAGRAM.separatorX);
  });
});

describe('numbered badges', () => {
  it('badges all ten parts, once each, numbered 1 to 10', () => {
    const badges = badgePlacements(0.5);
    expect(badges).toHaveLength(RING_PARTS.length);
    expect(badges.map((badge) => badge.index).sort((a, b) => a - b)).toEqual(
      RING_PARTS.map((part) => part.index).sort((a, b) => a - b),
    );
    expect(new Set(badges.map((badge) => badge.id)).size).toBe(RING_PARTS.length);
  });

  it('never lets two numbers overlap, at any slider position', () => {
    // The diagram claims to run 1 to 10. Two badges on top of each other would
    // make that false on screen while staying true in the data, which is the
    // kind of defect only a sweep catches.
    const minimumGap = DIAGRAM.badgeRadius * 2;
    for (const step of STEPS) {
      expect(closestBadgeGap(step), `badges collide at progress ${step}`).toBeGreaterThan(minimumGap);
    }
  });

  it('keeps every badge inside the frame, at any slider position', () => {
    for (const step of STEPS) {
      for (const badge of badgePlacements(step)) {
        expect(badge.at.x, `${badge.id} runs off the left at ${step}`).toBeGreaterThanOrEqual(DIAGRAM.badgeRadius);
        expect(badge.at.x, `${badge.id} runs off the right at ${step}`).toBeLessThanOrEqual(DIAGRAM.width - DIAGRAM.badgeRadius);
        expect(badge.at.y, `${badge.id} runs off the top at ${step}`).toBeGreaterThanOrEqual(DIAGRAM.badgeRadius);
        expect(badge.at.y, `${badge.id} runs off the bottom at ${step}`).toBeLessThanOrEqual(DIAGRAM.height - DIAGRAM.badgeRadius);
      }
    }
  });

  it('gives the two band parts badges that stay well apart', () => {
    // They are annotated at opposite edges of their own bands precisely so the
    // shell's number cannot drift onto the carrier's as the shell lifts.
    for (const step of STEPS) {
      const badges = badgePlacements(step);
      const shell = badges.find((badge) => badge.id === 'outer_shell');
      const carrier = badges.find((badge) => badge.id === 'inner_carrier');
      expect(shell && carrier).toBeTruthy();
      const gap = Math.hypot((shell?.at.x ?? 0) - (carrier?.at.x ?? 0), (shell?.at.y ?? 0) - (carrier?.at.y ?? 0));
      expect(gap).toBeGreaterThan(DIAGRAM.badgeRadius * 2);
    }
  });
});

describe('percentages for the button overlay', () => {
  it('matches the SVG position it was derived from', () => {
    expect(toPercent({ x: 0, y: 0 })).toEqual({ left: '0%', top: '0%' });
    expect(toPercent({ x: DIAGRAM.width, y: DIAGRAM.height })).toEqual({ left: '100%', top: '100%' });
    expect(toPercent(DIAGRAM.centre)).toEqual({ left: '37.5%', top: '50%' });
  });

  it('gives every badge a percentage inside the frame', () => {
    for (const step of STEPS) {
      for (const badge of badgePlacements(step)) {
        const left = Number.parseFloat(badge.percent.left);
        const top = Number.parseFloat(badge.percent.top);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left).toBeLessThanOrEqual(100);
        expect(top).toBeGreaterThanOrEqual(0);
        expect(top).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('what the slider says', () => {
  it('names both ends rather than reading out a bare percentage', () => {
    expect(explodeValueText(0)).toBe('Assembled');
    expect(explodeValueText(1)).toBe('Fully exploded');
  });

  it('describes the middle as a distance apart', () => {
    expect(explodeValueText(0.5)).toBe('50% apart');
    expect(explodeValueText(0.25)).toBe('25% apart');
  });

  it('says something usable however it is called', () => {
    expect(explodeValueText(-1)).toBe('Assembled');
    expect(explodeValueText(2)).toBe('Fully exploded');
    expect(explodeValueText(Number.NaN)).toBe('Assembled');
  });
});
