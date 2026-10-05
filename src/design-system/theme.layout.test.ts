import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Two layout promises theme.css makes to the components that depend on them.
 *
 * 1. WCAG 2.2 Focus Not Obscured (Minimum), 2.4.11.
 *
 * The app bars are fixed (MobileNav, below lg) or sticky (TopBar, from sm up),
 * so a control behind one still counts as inside the viewport and the browser
 * scrolls it no further: Tab or Shift+Tab would leave it completely covered.
 * theme.css reserves each bar's height in the scrollport instead, and reads the
 * same custom property the bar sizes itself with. This test fails if the two
 * ever drift apart — the exact failure the padding exists to prevent.
 *
 * 2. The stacked label DataTable relies on below sm, which must stay generated
 * content with alt text: anything else puts a repeat of the column header into
 * every cell's accessible name or into its text.
 */
const css = readFileSync(path.resolve(__dirname, 'theme.css'), 'utf8');
const shell = (file: string) => readFileSync(path.resolve(__dirname, '../app/shell', file), 'utf8');
const mobileNav = shell('MobileNav.tsx');
const topBar = shell('TopBar.tsx');
const dataTable = readFileSync(path.resolve(__dirname, '../components/DataTable.tsx'), 'utf8');

/** The declarations inside the first `@media <condition>` block that contains `needle`. */
function mediaBlock(condition: string, needle: string): string {
  const pattern = new RegExp(`@media\\s*\\(${condition}\\)\\s*\\{([\\s\\S]*?\\})\\s*\\}`, 'g');
  for (const match of css.matchAll(pattern)) {
    if (match[1]?.includes(needle)) return match[1];
  }
  throw new Error(`No @media (${condition}) block containing ${needle}`);
}

describe('app bar heights and the scroll padding that clears them', () => {
  it('declares one height token per bar', () => {
    expect(css).toMatch(/--app-top-bar-height:\s*4rem;/);
    expect(css).toMatch(/--app-bottom-bar-height:\s*3\.5rem;/);
    expect(css).toMatch(/--app-bar-gap:\s*0\.75rem;/);
  });

  it('reserves the bottom bar below lg, including the safe area, while that bar exists', () => {
    const block = mediaBlock('width < 64rem', 'scroll-padding-bottom');
    expect(block).toContain('html');
    expect(block).toContain('var(--app-bottom-bar-height)');
    expect(block).toContain('env(safe-area-inset-bottom)');
    expect(block).toContain('var(--app-bar-gap)');
    // 64rem is Tailwind's lg, where MobileNav is hidden and the sidebar takes over.
    expect(mobileNav).toContain('lg:hidden');
    expect(mobileNav).toContain('fixed inset-x-0 bottom-0');
    expect(mobileNav).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(mobileNav).toContain('min-h-[var(--app-bottom-bar-height)]');
  });

  it('reserves the top bar from sm up, where it becomes sticky', () => {
    const block = mediaBlock('width >= 40rem', 'scroll-padding-top');
    expect(block).toContain('html');
    expect(block).toContain('var(--app-top-bar-height)');
    expect(block).toContain('var(--app-bar-gap)');
    // 40rem is Tailwind's sm, the breakpoint TopBar sticks from.
    expect(topBar).toContain('sm:sticky sm:top-0');
    expect(topBar).toContain('min-h-[var(--app-top-bar-height)]');
    expect(topBar).toContain('lg:h-[var(--app-top-bar-height)]');
  });

  it('adds the bars’ 1px border to the padding, not just their content height', () => {
    expect(mobileNav).toContain('border-t border-border');
    expect(topBar).toContain('border-b border-border');
    expect(mediaBlock('width < 64rem', 'scroll-padding-bottom')).toMatch(/\+\s*1px/);
    expect(mediaBlock('width >= 40rem', 'scroll-padding-top')).toMatch(/\+\s*1px/);
  });
});

describe('stacked table cell labels', () => {
  it('draws the label from data-label with a visible fallback and empty alt text', () => {
    const block = mediaBlock('width < 40rem', '.stacked-label::before');
    // The fallback comes first, so an engine that cannot parse alt text still shows the label.
    const declarations = [...block.matchAll(/content:\s*([^;]+);/g)].map((match) => match[1]?.trim());
    expect(declarations).toEqual(['attr(data-label)', "attr(data-label) / ''"]);
    // The label keeps its own width so a long unbreakable value wraps instead.
    expect(block).toMatch(/flex:\s*none;/);
    expect(block).toMatch(/overflow-wrap:\s*normal;/);
  });

  it('is what DataTable asks for, on cells that have a label', () => {
    // 40rem is Tailwind's sm, the breakpoint DataTable stacks below.
    expect(dataTable).toContain("mobileLabel && 'stacked-label'");
    expect(dataTable).toContain('data-label={mobileLabel || undefined}');
    expect(dataTable).toContain('max-sm:flex max-sm:min-w-0 max-sm:justify-between');
  });
});
