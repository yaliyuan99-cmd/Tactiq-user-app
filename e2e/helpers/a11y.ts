/**
 * Helpers for e2e/accessibility.spec.ts: axe scans with a readable failure
 * message, page-readiness waits, horizontal-overflow and target-size probes,
 * and the focus-indicator reader. Nothing here selects by CSS class or test id;
 * the in-page probes walk element types and ARIA/label relationships only.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures';

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The polite live region rendered by FeedbackProvider. */
export function politeRegion(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=status]');
}

/** The assertive live region rendered by FeedbackProvider. */
export function assertiveRegion(page: Page): Locator {
  return page.locator('[data-live-announcer] [role=alert]');
}

/**
 * Waits for a routed page to finish loading: its h1 is visible, no "Loading…"
 * status is left on screen, and web fonts have settled (so layout probes see
 * the final text metrics).
 */
export async function waitForPageReady(page: Page): Promise<void> {
  // Page chunks are code-split and served by the shared Vite dev server, which can be slow to transform
  // a chunk the first time (or after a source change), so the first paint gets a generous timeout.
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('status').filter({ hasText: /^Loading/ })).toHaveCount(0, { timeout: 20_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

export interface AxeScanOptions {
  /** Limit the scan to this selector (element selectors only). */
  readonly include?: string;
}

interface FormattedViolation {
  readonly impact: string;
  readonly text: string;
}

/**
 * Runs axe with the WCAG 2.0/2.1/2.2 A and AA tags. Serious and critical
 * violations fail the test with rule id, impact, help text, target selectors
 * and the page context in the message. Moderate and minor violations do not
 * fail: they are recorded as `a11y-advisory` annotations for reporting.
 */
export async function expectNoSeriousAxeViolations(page: Page, context: string, options: AxeScanOptions = {}): Promise<void> {
  // @axe-core/playwright types its Page against its own playwright-core copy; the runtime object is the same.
  type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];
  let builder = new AxeBuilder({ page: page as unknown as AxePage }).withTags(AXE_TAGS);
  if (options.include) builder = builder.include(options.include);
  const results = await builder.analyze();

  const formatted: FormattedViolation[] = results.violations.map((violation) => {
    const targets = violation.nodes
      .slice(0, 8)
      .map((node) => `      - ${node.target.join(' >> ')}${node.failureSummary ? `  (${node.failureSummary.replace(/\s+/g, ' ').trim()})` : ''}`)
      .join('\n');
    const more = violation.nodes.length > 8 ? `\n      … and ${violation.nodes.length - 8} more` : '';
    return {
      impact: violation.impact ?? 'unknown',
      text: `[${violation.impact}] ${violation.id} on ${context} (${page.url()}): ${violation.help}\n${targets}${more}`,
    };
  });

  const advisory = formatted.filter((v) => v.impact === 'moderate' || v.impact === 'minor');
  for (const item of advisory) {
    test.info().annotations.push({ type: 'a11y-advisory', description: item.text });
  }

  const blocking = formatted.filter((v) => v.impact === 'serious' || v.impact === 'critical' || v.impact === 'unknown');
  expect(
    blocking.map((v) => v.text),
    `axe found serious/critical WCAG A/AA violations on ${context}:\n${blocking.map((v) => v.text).join('\n')}`,
  ).toEqual([]);
}

export interface OverflowReport {
  readonly scrollWidth: number;
  readonly innerWidth: number;
  /** The width the page must fit: the smaller of window.innerWidth and the emulated viewport width. */
  readonly limit: number;
  /** Visible elements that stick out past their parent and the right edge, outside any horizontal scroll container. */
  readonly culprits: readonly string[];
}

/**
 * Measures page-level horizontal overflow and names the outermost offenders.
 *
 * Mobile emulation (isMobile) lets Chromium widen the layout viewport to fit
 * overflowing content, which makes window.innerWidth grow with the overflow.
 * The configured viewport width is therefore also used as the limit, so the
 * check cannot pass just because the browser zoomed out.
 */
export async function measureHorizontalOverflow(page: Page): Promise<OverflowReport> {
  const viewportWidth = page.viewportSize()?.width ?? Number.POSITIVE_INFINITY;
  return page.evaluate((configuredWidth) => {
    const innerWidth = window.innerWidth;
    const limit = Math.min(innerWidth, configuredWidth);
    const scrollWidth = document.documentElement.scrollWidth;
    const culprits: { right: number; label: string }[] = [];
    const describe = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const role = el.getAttribute('role');
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
      return `<${tag}${id}${role ? ` role=${role}` : ''}> "${text}"`;
    };
    const insideScroller = (el: Element): boolean => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) return true;
      }
      return false;
    };
    if (scrollWidth > limit) {
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right <= limit + 0.5) continue;
        if (insideScroller(el)) continue;
        const parent = el.parentElement;
        if (!parent) continue;
        const parentRect = parent.getBoundingClientRect();
        const parentStyle = getComputedStyle(parent);
        const contentRight = parentRect.right - parseFloat(parentStyle.paddingRight) - parseFloat(parentStyle.borderRightWidth);
        // An element wider than the box it lives in is where the overflow starts.
        if (rect.right <= contentRight + 1) continue;
        culprits.push({ right: Math.round(rect.right), label: `${describe(el)} right=${Math.round(rect.right)}px, parent content box ends at ${Math.round(contentRight)}px` });
      }
    }
    culprits.sort((a, b) => b.right - a.right);
    return { scrollWidth, innerWidth, limit, culprits: culprits.slice(0, 8).map((c) => c.label) };
  }, viewportWidth);
}

/** document.documentElement.scrollWidth must not exceed the viewport width (window.innerWidth). */
export async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const report = await measureHorizontalOverflow(page);
  expect(
    report.scrollWidth,
    `Horizontal overflow on ${context}: scrollWidth ${report.scrollWidth}px > viewport ${report.limit}px (window.innerWidth ${report.innerWidth}px). Where it starts:\n  ${report.culprits.join('\n  ')}`,
  ).toBeLessThanOrEqual(report.limit);
}

export interface SmallTarget {
  readonly name: string;
  readonly role: string;
  readonly width: number;
  readonly height: number;
}

/**
 * Every visible button, [role=button], link, input, select, textarea and
 * summary inside main and nav landmarks whose pointer target is smaller than
 * 44×44 CSS px. Exempt: links that sit in running text (an inline-level link
 * whose nearest block container holds other words). A checkbox or radio counts
 * its label as part of its target, because clicking the label operates it.
 */
export async function findSmallTargets(page: Page, minimum = 44): Promise<SmallTarget[]> {
  return page.evaluate((min) => {
    const MIN = min - 0.01;
    const containers = Array.from(document.querySelectorAll('main, nav, [role="main"], [role="navigation"]'));
    const selector = 'button, [role="button"], a[href], input:not([type="hidden"]), select, textarea, summary';
    const seen = new Set<Element>();
    const offenders: { name: string; role: string; width: number; height: number }[] = [];

    const textOf = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const accessibleName = (el: HTMLElement): string => {
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => textOf(document.getElementById(id)))
          .join(' ')
          .trim();
        if (text) return text;
      }
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        const labels = Array.from(el.labels ?? []).map((label) => textOf(label)).join(' ').trim();
        if (labels) return labels;
      }
      return textOf(el) || el.getAttribute('title') || `<${el.tagName.toLowerCase()}>`;
    };
    const isHidden = (el: HTMLElement): boolean => {
      if (el.closest('[aria-hidden="true"], [inert]')) return true;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return true;
      const rect = el.getBoundingClientRect();
      return rect.width === 0 && rect.height === 0;
    };
    const isBlockLevel = (el: Element): boolean => {
      const display = getComputedStyle(el).display;
      return !display.startsWith('inline') && display !== 'contents';
    };
    const inRunningText = (link: HTMLElement): boolean => {
      if (!getComputedStyle(link).display.startsWith('inline')) return false;
      let block: Element | null = link.parentElement;
      while (block && !isBlockLevel(block)) block = block.parentElement;
      if (!block) return false;
      return textOf(block).length > textOf(link).length;
    };
    const roleOf = (el: HTMLElement): string =>
      el.getAttribute('role') ?? (el instanceof HTMLInputElement ? `input[type=${el.type}]` : el.tagName.toLowerCase());

    for (const container of containers) {
      for (const node of Array.from(container.querySelectorAll<HTMLElement>(selector))) {
        if (seen.has(node)) continue;
        seen.add(node);
        if (isHidden(node)) continue;
        if (node instanceof HTMLAnchorElement && inRunningText(node)) continue;

        const boxes: DOMRect[] = [node.getBoundingClientRect()];
        if (node instanceof HTMLInputElement && (node.type === 'checkbox' || node.type === 'radio')) {
          for (const label of Array.from(node.labels ?? [])) boxes.push(label.getBoundingClientRect());
        }
        const big = boxes.some((box) => box.width >= MIN && box.height >= MIN);
        if (big) continue;
        const best = boxes.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
        offenders.push({
          name: accessibleName(node),
          role: roleOf(node),
          width: Math.round(best.width * 10) / 10,
          height: Math.round(best.height * 10) / 10,
        });
      }
    }
    return offenders;
  }, minimum);
}

export interface FocusStyle {
  readonly description: string;
  readonly outlineStyle: string;
  readonly outlineWidth: string;
  readonly boxShadow: string;
  /** True when the focused element is visually hidden and the style was read from its label. */
  readonly fromLabel: boolean;
  /**
   * Set when no part of the focused element (or its label) can be seen: it is
   * outside the viewport after the browser scrolled to it, or every sampled
   * point is covered by a fixed or sticky element such as the bottom "Main"
   * navigation or the top bar. Names what hides it.
   */
  readonly obscuredBy: string | null;
  /** The focused element's box after scrolling, in viewport CSS px. */
  readonly box: { readonly top: number; readonly bottom: number; readonly viewportHeight: number };
}

/**
 * Reads the focus indicator of document.activeElement (or its label, when the
 * control itself is visually hidden) after two animation frames, so scrolling
 * and the skip link's reveal have settled.
 */
export async function readActiveFocusStyle(page: Page): Promise<FocusStyle | null> {
  return page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body || active === document.documentElement) return null;
    const ownRect = active.getBoundingClientRect();
    const visuallyHidden = ownRect.width <= 2 || ownRect.height <= 2;
    let target: HTMLElement = active;
    let fromLabel = false;
    if (visuallyHidden) {
      const label =
        active.closest('label') ??
        (active instanceof HTMLInputElement ? (Array.from(active.labels ?? [])[0] ?? null) : null);
      if (label) {
        target = label as HTMLElement;
        fromLabel = true;
      }
    }
    const style = getComputedStyle(target);
    const tag = active.tagName.toLowerCase();
    const name =
      active.getAttribute('aria-label') ??
      (active instanceof HTMLInputElement ? Array.from(active.labels ?? []).map((l) => l.textContent).join(' ') : null) ??
      active.textContent ??
      '';

    const describe = (el: Element): string => {
      const label = el.getAttribute('aria-label');
      return `<${el.tagName.toLowerCase()}${label ? ` aria-label="${label}"` : ''}>`;
    };
    /** The nearest fixed or sticky ancestor-or-self of `el` that does not contain the focused element. */
    const overlayOf = (el: Element | null): Element | null => {
      for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
        const position = getComputedStyle(node).position;
        if ((position === 'fixed' || position === 'sticky') && !node.contains(target)) return node;
        if (node === target || target.contains(node)) return null;
      }
      return null;
    };

    const rect = target.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(rect.left, 0);
    const right = Math.min(rect.right, vw);
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, vh);
    let obscuredBy: string | null = null;
    if (right - left < 1 || bottom - top < 1) {
      obscuredBy = 'outside the viewport';
    } else {
      const coverers = new Set<string>();
      let visiblePoint = false;
      for (const fx of [0.1, 0.5, 0.9]) {
        for (const fy of [0.15, 0.5, 0.85]) {
          const hit = document.elementFromPoint(left + (right - left) * fx, top + (bottom - top) * fy);
          const overlay = overlayOf(hit);
          if (overlay) coverers.add(describe(overlay));
          else visiblePoint = true;
        }
      }
      if (!visiblePoint) obscuredBy = Array.from(coverers).join(', ');
    }

    return {
      description: `<${tag}${active.getAttribute('type') ? ` type=${active.getAttribute('type')}` : ''}> "${name.replace(/\s+/g, ' ').trim().slice(0, 60)}"`,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      fromLabel,
      obscuredBy,
      box: { top: Math.round(rect.top), bottom: Math.round(rect.bottom), viewportHeight: vh },
    };
  });
}

export interface RunningAnimation {
  readonly kind: string;
  readonly name: string;
  readonly durationMs: number;
  readonly element: string;
}

/**
 * Starts sampling document.getAnimations() on every animation frame. Any
 * running CSS animation or transition whose duration exceeds `maxMs` is
 * remembered until stopAnimationSampler() collects the list.
 */
export async function startAnimationSampler(page: Page, maxMs = 10): Promise<void> {
  await page.evaluate((limit) => {
    type Found = { kind: string; name: string; durationMs: number; element: string };
    const w = window as unknown as { __a11yAnimations?: Map<string, Found>; __a11yAnimationsStop?: () => void };
    w.__a11yAnimationsStop?.();
    const found = new Map<string, Found>();
    w.__a11yAnimations = found;
    let stopped = false;
    const sample = () => {
      for (const animation of document.getAnimations()) {
        if (animation.playState !== 'running') continue;
        const timing = animation.effect?.getComputedTiming();
        const durationMs = typeof timing?.duration === 'number' ? timing.duration : Number.POSITIVE_INFINITY;
        if (durationMs <= limit) continue;
        const target = (animation.effect as KeyframeEffect | null)?.target ?? null;
        const record = animation as unknown as { animationName?: string; transitionProperty?: string };
        const kind = animation.constructor.name;
        const name = record.animationName ?? record.transitionProperty ?? '';
        const element = target
          ? `<${target.tagName.toLowerCase()}${target.getAttribute('aria-label') ? ` aria-label="${target.getAttribute('aria-label')}"` : ''}> "${(target.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`
          : '(no target)';
        found.set(`${kind}|${name}|${element}`, { kind, name, durationMs, element });
      }
      if (!stopped) requestAnimationFrame(sample);
    };
    w.__a11yAnimationsStop = () => {
      stopped = true;
    };
    sample();
  }, maxMs);
}

/** Stops the sampler (after one final sample) and returns every long animation it saw. */
export async function stopAnimationSampler(page: Page): Promise<RunningAnimation[]> {
  return page.evaluate(async () => {
    type Found = { kind: string; name: string; durationMs: number; element: string };
    const w = window as unknown as { __a11yAnimations?: Map<string, Found>; __a11yAnimationsStop?: () => void };
    // Let at least two more frames be sampled before stopping.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    w.__a11yAnimationsStop?.();
    return Array.from(w.__a11yAnimations?.values() ?? []);
  });
}
