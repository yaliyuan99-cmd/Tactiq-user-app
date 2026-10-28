/**
 * The homepage's shared measurements. Three values only, so the page keeps one
 * rhythm: a centred shell, a quiet rule between sections, and the vertical
 * breathing room each section gets.
 *
 * The public header is deliberately not sticky, so no fixed bar can obscure a
 * focused control (WCAG 2.2, 2.4.11) and anchors need no reserved scrollport.
 */
export const SHELL = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

/** Section wrapper: the quiet rule and the anchor offset. */
export const SECTION = 'scroll-mt-8 border-t border-border';

/** Section padding. Narrow screens get less, so the page is not all scrolling. */
export const SECTION_INNER = 'py-12 sm:py-16 lg:py-20';

export const EYEBROW = 'font-mono-label text-muted-foreground';
export const LEDE = 'text-lg text-muted-foreground';
