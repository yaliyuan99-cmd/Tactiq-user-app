import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Recomputes the WCAG contrast ratios promised in the header of theme.css,
 * straight from the token values, for all four themes.
 */
const css = readFileSync(path.resolve(__dirname, 'theme.css'), 'utf8');

type Tokens = Record<string, string>;

function tokenBlock(selector: string): Tokens {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^${escaped} \\{([^}]*)\\}`, 'm').exec(css);
  if (!match?.[1]) throw new Error(`No top-level block for ${selector}`);
  const tokens: Tokens = {};
  for (const [, name, value] of match[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    if (name && value) tokens[name] = value.trim();
  }
  return tokens;
}

const root = tokenBlock(':root');
const dark = tokenBlock('.dark');
const highContrast = tokenBlock("[data-contrast='high']");
const darkHighContrast = tokenBlock(".dark[data-contrast='high']");

// Same cascade as the browser: equal specificity, later blocks win; the combined selector wins over both.
const THEMES: Record<string, Tokens> = {
  light: { ...root },
  dark: { ...root, ...dark },
  'high-contrast light': { ...root, ...highContrast },
  'high-contrast dark': { ...root, ...dark, ...highContrast, ...darkHighContrast },
};

function channel(hex: string, offset: number): number {
  const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const hex = color.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected a 6-digit hex colour, got ${color}`);
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 2) + 0.0722 * channel(hex, 4);
}

function contrastRatio(a: string, b: string): number {
  const [light, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (darker + 0.05);
}

const SURFACES = ['background', 'card', 'popover', 'muted', 'secondary'];
const TEXT_ON_SURFACES = [
  'foreground',
  'muted-foreground',
  'primary-strong',
  'destructive',
  'status-confirmed',
  'status-simulation',
  'status-target',
  'status-future',
];

const TEXT_PAIRS: [string, string][] = [
  ...TEXT_ON_SURFACES.flatMap((text) => SURFACES.map((surface): [string, string] => [text, surface])),
  ['primary-foreground', 'primary'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['secondary-foreground', 'secondary'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['sidebar-foreground', 'sidebar'],
  ['foreground', 'input-background'],
  ['background', 'foreground'],
];

const NON_TEXT_PAIRS: [string, string][] = [
  ['primary', 'background'],
  ['primary', 'card'],
  ['focus', 'background'],
  ['focus', 'card'],
  ['ring', 'background'],
  ['destructive', 'card'],
];

function failures(tokens: Tokens, pairs: [string, string][], minimum: number): string[] {
  return pairs.flatMap(([fg, bg]) => {
    const a = tokens[fg];
    const b = tokens[bg];
    if (!a || !b) return [`missing token: ${a ? bg : fg}`];
    const ratio = contrastRatio(a, b);
    return ratio < minimum ? [`${fg} ${a} on ${bg} ${b}: ${ratio.toFixed(2)}:1`] : [];
  });
}

describe('theme contrast', () => {
  it.each(Object.keys(THEMES))('%s: every text pair is at least 4.5:1', (theme) => {
    expect(failures(THEMES[theme] ?? {}, TEXT_PAIRS, 4.5)).toEqual([]);
  });

  it.each(Object.keys(THEMES))('%s: primary fills, focus and borders are at least 3:1', (theme) => {
    expect(failures(THEMES[theme] ?? {}, NON_TEXT_PAIRS, 3)).toEqual([]);
  });

  it('the dark primary is labelled with ink, because white on it would fail', () => {
    const tokens = THEMES.dark ?? {};
    expect(tokens.primary).toBe('#8b6cff');
    expect(tokens.accent).toBe('#8b6cff');
    expect(tokens['primary-foreground']).toBe('#0b0a14');
    expect(tokens['primary-strong']).toBe('#b7a7ff');
    // The reason the label is ink and not white.
    expect(contrastRatio('#0b0a14', '#8b6cff')).toBeCloseTo(5.33, 2);
    expect(contrastRatio('#ffffff', '#8b6cff')).toBeCloseTo(3.69, 2);
    // Still reads as a fill against both dark surfaces.
    expect(contrastRatio('#8b6cff', '#0b0a14')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio('#8b6cff', '#14122a')).toBeGreaterThanOrEqual(3);
  });

  it('the light primary carries white text well above AA', () => {
    const tokens = THEMES.light ?? {};
    expect(tokens.primary).toBe('#534ab7');
    expect(tokens['primary-foreground']).toBe('#ffffff');
    expect(contrastRatio('#ffffff', '#534ab7')).toBeCloseTo(6.93, 2);
    // The link colour stays readable on the lavender selection surface.
    expect(contrastRatio(tokens['primary-strong'] ?? '', tokens.secondary ?? '')).toBeGreaterThanOrEqual(4.5);
  });

  it('high-contrast themes flip the primary label to the opposite extreme', () => {
    const hcDark = THEMES['high-contrast dark'] ?? {};
    expect(hcDark.primary).toBe('#b9a3ff');
    expect(hcDark['primary-foreground']).toBe('#000000');
    expect(contrastRatio('#000000', '#b9a3ff')).toBeCloseTo(9.75, 2);
    const hcLight = THEMES['high-contrast light'] ?? {};
    expect(hcLight.primary).toBe('#3a3194');
    expect(hcLight['primary-foreground']).toBe('#ffffff');
    expect(contrastRatio('#ffffff', '#3a3194')).toBeCloseTo(10.26, 2);
  });

  it('the decorative divider is never strong enough to be a control boundary', () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      const divider = contrastRatio(tokens.border ?? '', tokens.card ?? '');
      const control = contrastRatio(tokens['border-strong'] ?? '', tokens.card ?? '');
      expect(control, `${name}: border-strong must reach 3:1 on a surface`).toBeGreaterThanOrEqual(3);
      expect(control, `${name}: border-strong must be at least as strong as the divider`).toBeGreaterThanOrEqual(divider);
    }
  });
});
