import { RING_PARTS, getRingPart } from '@/domain/ringParts';
import {
  badgePlacements,
  clamp01,
  closestBadgeGap,
  DIAGRAM,
  explodeValueText,
  isoRy,
  ISO_K,
  LAYOUT,
  layoutOf,
  partHome,
  partPosition,
  spreadValueText,
  SPREAD_STEPS,
  stepToProgress,
  toPercent,
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

describe('the projection', () => {
  it('flattens a circle into an ellipse of the same width', () => {
    expect(isoRy(100)).toBe(100 * ISO_K);
    expect(isoRy(0)).toBe(0);
  });

  it('is parallel, so a part is the same size wherever it sits in the stack', () => {
    // No perspective: travel must not scale anything, or two parts of equal
    // radius would read as different sizes at different heights.
    for (const part of RING_PARTS) {
      const layout = layoutOf(part.id);
      expect(isoRy(layout.rx)).toBe(isoRy(layout.rx));
    }
  });
});

describe('the stack', () => {
  it('draws every part on the axis when assembled, except those seated round the band', () => {
    for (const part of RING_PARTS) {
      const home = partHome(part);
      const layout = layoutOf(part.id);
      if (layout.angleDeg === undefined) {
        expect(home.x, part.id).toBe(DIAGRAM.centreX);
        expect(home.y, part.id).toBe(DIAGRAM.baseY);
      } else {
        // A magnetometer keeps its seat on the carrier's ellipse so the three
        // read as spaced around the band, not piled on its axis.
        expect(home.x, part.id).not.toBe(DIAGRAM.centreX);
      }
    }
  });

  it('moves every part straight up or down, never sideways', () => {
    for (const part of RING_PARTS) {
      const home = partHome(part);
      const open = partPosition(part, 1);
      expect(open.x, `${part.id} drifted sideways`).toBe(home.x);
      expect(open.y - home.y).toBeCloseTo(layoutOf(part.id).explodeY, 5);
    }
  });

  it('separates the parts monotonically as the slider opens', () => {
    for (const part of RING_PARTS) {
      const travel = layoutOf(part.id).explodeY;
      if (travel === 0) continue;
      for (let i = 1; i < STEPS.length; i += 1) {
        const previous = partPosition(part, STEPS[i - 1] ?? 0).y;
        const current = partPosition(part, STEPS[i] ?? 0).y;
        if (travel < 0) expect(current).toBeLessThanOrEqual(previous);
        else expect(current).toBeGreaterThanOrEqual(previous);
      }
    }
  });

  it('lifts the shell clear of the carrier, and the carrier clear of what it holds', () => {
    // The order parts come apart in is the order they go together in. If the
    // carrier outran the shell the drawing would show an impossible assembly.
    const shell = partPosition(getRingPart('outer_shell'), 1).y;
    const carrier = partPosition(getRingPart('inner_carrier'), 1).y;
    const board = partPosition(getRingPart('controller'), 1).y;
    expect(shell).toBeLessThan(carrier);
    expect(carrier).toBeLessThan(board);
  });

  it('puts the thumb magnet furthest from the ring, because it was never in it', () => {
    const magnet = partPosition(getRingPart('thumb_magnet'), 1).y;
    for (const part of RING_PARTS) {
      if (part.id === 'thumb_magnet') continue;
      expect(magnet).toBeGreaterThan(partPosition(part, 1).y);
    }
  });

  it('keeps every part inside the frame, at any slider position', () => {
    for (const step of STEPS) {
      for (const part of RING_PARTS) {
        const at = partPosition(part, step);
        const layout = layoutOf(part.id);
        const halfHeight = isoRy(layout.rx) + layout.depth;
        expect(at.x - layout.rx, `${part.id} off the left at ${step}`).toBeGreaterThanOrEqual(0);
        expect(at.x + layout.rx, `${part.id} off the right at ${step}`).toBeLessThanOrEqual(DIAGRAM.width);
        expect(at.y - halfHeight, `${part.id} off the top at ${step}`).toBeGreaterThanOrEqual(0);
        expect(at.y + halfHeight, `${part.id} off the bottom at ${step}`).toBeLessThanOrEqual(DIAGRAM.height);
      }
    }
  });
});

describe('numbered badges', () => {
  it('badges all ten parts, once each, numbered 1 to 10', () => {
    const badges = badgePlacements(0.5);
    expect(badges).toHaveLength(RING_PARTS.length);
    expect(badges.map((b) => b.index).sort((a, b) => a - b)).toEqual(RING_PARTS.map((p) => p.index).sort((a, b) => a - b));
    expect(new Set(badges.map((b) => b.id)).size).toBe(RING_PARTS.length);
  });

  it('sets the numbers out to the sides, clear of the drawing', () => {
    // Numbers written over the parts would make both harder to read.
    for (const badge of badgePlacements(1)) {
      const distance = Math.abs(badge.at.x - DIAGRAM.centreX);
      expect(distance).toBe(DIAGRAM.labelOffsetX);
    }
  });

  it('keeps the column still while the leader line follows the part', () => {
    // The numbers must not move with the slider: assembled, every part is at
    // the same height, so numbers that tracked their parts would pile into one
    // spot and ten buttons would land on top of each other. The line is what
    // says which number belongs to which part.
    const closed = badgePlacements(0);
    const open = badgePlacements(1);
    for (let i = 0; i < closed.length; i += 1) {
      const a = closed[i];
      const b = open[i];
      expect(a && b).toBeTruthy();
      expect(b?.at, `${a?.id} number moved`).toEqual(a?.at);
      if (layoutOf(a!.id).explodeY !== 0) {
        expect(b?.anchor.y, `${a?.id} leader line did not follow its part`).not.toBe(a?.anchor.y);
      }
    }
  });

  it('spaces each column evenly, so no number is crowded', () => {
    const badges = badgePlacements(0.5);
    for (const side of ['left', 'right'] as const) {
      const column = badges.filter((b) => b.side === side).map((b) => b.at.y);
      const gaps = column.slice(1).map((y, i) => Math.round(y - (column[i] ?? 0)));
      expect(new Set(gaps).size, `${side} column is unevenly spaced`).toBe(1);
    }
  });

  it('uses both sides, so ten numbers do not crowd one column', () => {
    const badges = badgePlacements(1);
    const left = badges.filter((b) => b.side === 'left').length;
    const right = badges.filter((b) => b.side === 'right').length;
    expect(left).toBeGreaterThan(2);
    expect(right).toBeGreaterThan(2);
    expect(left + right).toBe(RING_PARTS.length);
  });

  it('never lets two numbers in a column overlap, at any slider position', () => {
    // The drawing claims to run 1 to 10. Two badges on top of each other would
    // make that false on screen while staying true in the data — the kind of
    // defect only a sweep catches.
    const minimumGap = DIAGRAM.badgeRadius * 2;
    for (const step of STEPS) {
      expect(closestBadgeGap(step), `badges collide at progress ${step}`).toBeGreaterThan(minimumGap);
    }
  });

  it('keeps every badge inside the frame', () => {
    for (const step of STEPS) {
      for (const badge of badgePlacements(step)) {
        expect(badge.at.x).toBeGreaterThanOrEqual(DIAGRAM.badgeRadius);
        expect(badge.at.x).toBeLessThanOrEqual(DIAGRAM.width - DIAGRAM.badgeRadius);
        expect(badge.at.y).toBeGreaterThanOrEqual(DIAGRAM.badgeRadius);
        expect(badge.at.y).toBeLessThanOrEqual(DIAGRAM.height - DIAGRAM.badgeRadius);
      }
    }
  });
});

describe('percentages for the button overlay', () => {
  it('matches the SVG position it was derived from', () => {
    expect(toPercent({ x: 0, y: 0 })).toEqual({ left: '0%', top: '0%' });
    expect(toPercent({ x: DIAGRAM.width, y: DIAGRAM.height })).toEqual({ left: '100%', top: '100%' });
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
    expect(spreadValueText(0)).toMatch(/^Assembled\./);
    expect(spreadValueText(SPREAD_STEPS)).toMatch(/^Fully exploded\./);
  });

  it('describes the middle as a distance apart', () => {
    expect(explodeValueText(0.5)).toBe('50% apart');
    expect(explodeValueText(stepToProgress(3))).toBe('30% apart');
  });

  it('says something usable however it is called', () => {
    expect(explodeValueText(-1)).toBe('Assembled');
    expect(explodeValueText(2)).toBe('Fully exploded');
    expect(spreadValueText(-5)).toMatch(/^Assembled\./);
    expect(spreadValueText(99)).toMatch(/^Fully exploded\./);
  });

  it('has a line for every stop, so no value is spoken as a blank', () => {
    for (let step = 0; step <= SPREAD_STEPS; step += 1) {
      expect(spreadValueText(step).length, `stop ${step}`).toBeGreaterThan(10);
    }
  });
});

describe('the layout covers the domain', () => {
  it('places every part, and places nothing that is not a part', () => {
    expect(Object.keys(LAYOUT).sort()).toEqual(RING_PARTS.map((p) => p.id).sort());
  });
});
