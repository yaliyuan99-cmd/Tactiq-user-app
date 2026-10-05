import { openDetailsById, openSectionDisclosure, revealHelpTarget, scrollToId } from './revealTarget';

function mount(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe('revealHelpTarget', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  it('focuses the heading of a Help section', () => {
    container = mount('<section id="privacy"><h2 id="privacy-heading" tabindex="-1">Privacy</h2></section>');
    const focused = revealHelpTarget('privacy');
    expect(focused?.id).toBe('privacy-heading');
    expect(document.activeElement?.id).toBe('privacy-heading');
  });

  it('opens a details element and focuses its summary', () => {
    container = mount('<details id="ring-disconnected"><summary>The ring disconnected</summary><p>Answer</p></details>');
    const focused = revealHelpTarget('ring-disconnected');
    const details = document.getElementById('ring-disconnected') as HTMLDetailsElement;
    expect(details.open).toBe(true);
    expect(focused?.tagName).toBe('SUMMARY');
    expect(document.activeElement).toBe(focused);
  });

  it('makes any other target focusable before focusing it', () => {
    container = mount('<div id="other">Other</div>');
    const focused = revealHelpTarget('other');
    expect(focused?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement?.id).toBe('other');
  });

  it('returns null when the id is not on the page', () => {
    expect(revealHelpTarget('missing')).toBeNull();
  });
});

describe('openDetailsById and scrollToId', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  it('opens details only', () => {
    container = mount('<details id="a"><summary>A</summary></details><section id="b"></section>');
    expect(openDetailsById('a')).toBe(true);
    expect((document.getElementById('a') as HTMLDetailsElement).open).toBe(true);
    expect(openDetailsById('b')).toBe(false);
    expect(openDetailsById('missing')).toBe(false);
  });

  it('scrolls with the requested behaviour when scrolling is available', () => {
    container = mount('<section id="c"></section>');
    const section = document.getElementById('c') as HTMLElement;
    expect(scrollToId('c', 'auto')).toBe(false);
    const scrollIntoView = vi.fn();
    Object.defineProperty(section, 'scrollIntoView', { value: scrollIntoView, configurable: true });
    expect(scrollToId('c', 'smooth')).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
  });
});

describe('openSectionDisclosure', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    container?.remove();
    container = null;
  });

  it('opens the disclosure a collapsible section keeps its body in', () => {
    container = mount(
      '<section id="privacy"><details data-help-disclosure><summary><h2 id="privacy-heading" tabindex="-1">Privacy</h2></summary><p>Body</p></details></section>',
    );
    expect(openSectionDisclosure('privacy')).toBe(true);
    expect(container.querySelector('details')?.open).toBe(true);
  });

  it('opens the section when a link reveals it, and focuses its heading', () => {
    container = mount(
      '<section id="privacy"><details data-help-disclosure><summary><h2 id="privacy-heading" tabindex="-1">Privacy</h2></summary><p>Body</p></details></section>',
    );
    expect(revealHelpTarget('privacy')?.id).toBe('privacy-heading');
    expect(container.querySelector('details')?.open).toBe(true);
  });

  it('leaves a section without one alone, and never opens a nested answer', () => {
    container = mount('<section id="troubleshooting"><details id="an-answer"><summary>Q</summary></details></section>');
    expect(openSectionDisclosure('troubleshooting')).toBe(false);
    expect(container.querySelector('details')?.open).toBe(false);
    expect(openSectionDisclosure('missing')).toBe(false);
  });
});
