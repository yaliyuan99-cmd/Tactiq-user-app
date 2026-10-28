/**
 * Landmark queries that count landmarks the way assistive technology does.
 *
 * HTML-AAM gives `<header>` the role "banner" only while the element is *not*
 * inside article/aside/main/nav/section. The shell's TopBar is a banner;
 * PageHeader — every page's `<header>` holding its h1, which the shell renders
 * inside `<main>` — is generic. Browsers, screen readers and axe-core all
 * treat it that way, so a shell screen has exactly one banner landmark.
 *
 * @testing-library/dom 10 does not implement that constraint. It reports every
 * `<header>` as a banner, so `getByRole('banner')` on a shell screen finds two
 * and throws "Found multiple elements". Applying the scope here keeps the
 * assertion the strict one it has always been — this page has exactly one
 * banner landmark, and here is what is inside it — instead of loosening it to
 * "the first banner of several", which would stop catching a real duplicate
 * landmark.
 */
import { screen } from '@testing-library/react';

/** Ancestors that take a nested `<header>` or `<footer>` out of landmark scope. */
const OUT_OF_LANDMARK_SCOPE = 'article, aside, main, nav, section';

/** Every banner landmark on the page, as assistive technology would count them. */
export function banners(): HTMLElement[] {
  return screen.queryAllByRole('banner').filter((element) => element.closest(OUT_OF_LANDMARK_SCOPE) === null);
}

/**
 * The page's single banner landmark. Throws unless there is exactly one, so a
 * screen that grows a second banner fails here instead of passing quietly.
 */
export function banner(): HTMLElement {
  const found = banners();
  const [only] = found;
  if (found.length !== 1 || !only) {
    throw new Error(`Expected exactly one banner landmark on the page, found ${found.length}.`);
  }
  return only;
}
