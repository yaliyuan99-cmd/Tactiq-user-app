import { useNavigate } from 'react-router';
import { ROUTES, helpRoute } from '@/app/routes';
import { WEB_BLUETOOTH_UNAVAILABLE_REASON } from '@/services/device/capabilities';
import { MockDeviceAdapter } from '@/services/device/MockDeviceAdapter';
import { screen, userEvent, waitFor, within } from '@/test/renderApp';
import HelpPage from './HelpPage';
import { renderHelpPage } from './helpTestUtils';
import { TROUBLESHOOTING_ENTRIES } from './troubleshooting';

/**
 * Browsers toggle a details element when its summary is focused and Enter
 * (keydown) or Space (keyup) is pressed. jsdom implements the click
 * activation but user-event does not turn those keys into a click on a
 * summary, so this mirrors the browser. It skips events the page cancelled,
 * so a handler that blocked keyboard use would still fail the test.
 */
function emulateSummaryKeyboardActivation(): () => void {
  const isSummary = (target: EventTarget | null): target is HTMLElement =>
    target instanceof HTMLElement && target.localName === 'summary';
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.defaultPrevented && isSummary(event.target)) event.target.click();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ' && !event.defaultPrevented && isSummary(event.target)) event.target.click();
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  return () => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  };
}

interface ScrollCall {
  readonly element: Element;
  readonly options: unknown;
}

let scrollCalls: ScrollCall[] = [];
let stopEmulation: (() => void) | null = null;

beforeEach(() => {
  scrollCalls = [];
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: function scrollIntoView(this: Element, options?: unknown) {
      scrollCalls.push({ element: this, options });
    },
  });
  stopEmulation = emulateSummaryKeyboardActivation();
});

afterEach(() => {
  stopEmulation?.();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

function troubleshootingRegion(): HTMLElement {
  return screen.getByRole('region', { name: 'Troubleshooting' });
}

function detailsFor(summaryText: string): HTMLDetailsElement {
  const summary = within(troubleshootingRegion()).getByText(summaryText).closest('summary');
  const details = summary?.parentElement;
  if (!(details instanceof HTMLDetailsElement)) throw new Error(`No details for ${summaryText}`);
  return details;
}

function NavigateTo({ to }: { readonly to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      Test navigate
    </button>
  );
}

describe('HelpPage troubleshooting', () => {
  it('renders each problem as a closed details item whose summary is the question', async () => {
    await renderHelpPage();
    const region = troubleshootingRegion();
    const summaries = Array.from(region.querySelectorAll('details > summary'));
    expect(summaries.map((summary) => summary.textContent)).toEqual(TROUBLESHOOTING_ENTRIES.map((e) => e.question));
    for (const entry of TROUBLESHOOTING_ENTRIES) {
      const details = detailsFor(entry.question);
      expect(details).toHaveAttribute('id', entry.id);
      expect(details.open).toBe(false);
      expect(within(details).getByText(entry.intro)).not.toBeVisible();
      const summary = details.querySelector('summary');
      expect(summary).toHaveClass('target-44');
    }
  });

  it('reaches a summary with Tab and opens it with Enter, then closes it with Space', async () => {
    const user = userEvent.setup();
    await renderHelpPage();
    screen.getByRole('link', { name: 'Change accessibility and feedback settings' }).focus();

    await user.tab();
    const first = TROUBLESHOOTING_ENTRIES[0];
    if (!first) throw new Error('No entries');
    const details = detailsFor(first.question);
    const summary = details.querySelector('summary');
    expect(summary).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(details.open).toBe(true);
    expect(within(details).getByText(first.intro)).toBeVisible();
    expect(within(details).getByRole('link', { name: 'Go to Connect' })).toHaveAttribute('href', ROUTES.connect);

    await user.keyboard(' ');
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it('numbers the permission steps, which must be followed in order', async () => {
    const user = userEvent.setup();
    await renderHelpPage();
    const details = detailsFor('I denied Bluetooth permission');
    await user.click(within(details).getByText('I denied Bluetooth permission'));
    const lists = within(details).getAllByRole('list');
    expect(lists[0]?.tagName).toBe('OL');
    expect(within(lists[0] as HTMLElement).getAllByRole('listitem')).toHaveLength(4);
  });

  it('shows what this browser reports about Web Bluetooth', async () => {
    const user = userEvent.setup();
    const adapter = new MockDeviceAdapter({
      capabilities: () => ({ webBluetooth: false, secureContext: true, reason: WEB_BLUETOOTH_UNAVAILABLE_REASON }),
    });
    await renderHelpPage({ deviceAdapter: adapter });
    const details = detailsFor('My browser says Bluetooth is unavailable');
    await user.click(within(details).getByText('My browser says Bluetooth is unavailable'));
    expect(within(details).getByText(WEB_BLUETOOTH_UNAVAILABLE_REASON)).toBeVisible();
    expect(within(details).getByText('In this browser:')).toBeVisible();
    adapter.destroy();
  });

  it('scrolls the troubleshooting section into view when the page loads with its hash', async () => {
    await renderHelpPage({ route: helpRoute('troubleshooting') });
    const section = document.getElementById('troubleshooting');
    expect(scrollCalls).toContainEqual({ element: section, options: { block: 'start', behavior: 'smooth' } });
  });

  it('scrolls without animation when reduced motion is on', async () => {
    await renderHelpPage({ route: helpRoute('limitations'), preferences: { reducedMotion: true } });
    const section = document.getElementById('limitations');
    expect(scrollCalls).toContainEqual({ element: section, options: { block: 'start', behavior: 'auto' } });
    expect(scrollCalls.every((call) => (call.options as { behavior: string }).behavior === 'auto')).toBe(true);
  });

  it('does not scroll for an unknown hash and leaves focus alone on load', async () => {
    await renderHelpPage({ route: `${ROUTES.help}#nothing-here` });
    expect(scrollCalls).toHaveLength(0);
    expect(document.body).toHaveFocus();
  });

  it('opens and scrolls to a troubleshooting answer named in the hash', async () => {
    await renderHelpPage({ route: helpRoute('ring-disconnected') });
    const details = detailsFor('The ring disconnected');
    expect(details.open).toBe(true);
    expect(scrollCalls.map((call) => call.element)).toContain(details);
    expect(detailsFor('The Bluetooth window shows no ring').open).toBe(false);
  });

  it('scrolls to a section chosen from the contents, instantly when reduced motion is on', async () => {
    const user = userEvent.setup();
    await renderHelpPage({ preferences: { reducedMotion: true } });
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    await user.click(within(nav).getByRole('link', { name: 'Privacy and your data' }));
    expect(scrollCalls).toContainEqual({
      element: document.getElementById('privacy'),
      options: { block: 'start', behavior: 'auto' },
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Privacy and your data' })).toHaveFocus();
  });

  it('scrolls smoothly from the contents when reduced motion is off', async () => {
    const user = userEvent.setup();
    await renderHelpPage();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    await user.click(within(nav).getByRole('link', { name: 'Contact' }));
    expect(scrollCalls).toContainEqual({
      element: document.getElementById('contact'),
      options: { block: 'start', behavior: 'smooth' },
    });
  });

  it('opens an answer when the hash changes to it after the page has loaded', async () => {
    const user = userEvent.setup();
    await renderHelpPage(
      {},
      <>
        <NavigateTo to={helpRoute('cannot-hear-announcements')} />
        <HelpPage />
      </>,
    );
    const details = detailsFor('I cannot hear announcements');
    expect(details.open).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Test navigate' }));
    await waitFor(() => expect(details.open).toBe(true));
  });
});
