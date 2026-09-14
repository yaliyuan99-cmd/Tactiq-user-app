import { Link, Route, Routes } from 'react-router';
import { RoutePage } from '@/app/routing/RoutePage';
import { PageHeader } from '@/components';
import { usePageTitle } from '@/lib/usePageTitle';
import { configure, renderApp, screen, userEvent, waitFor } from '@/test/renderApp';
import { RouteFocusProvider } from './RouteFocus';

function makePage(title: string) {
  return function TestPage() {
    usePageTitle(title);
    return (
      <>
        <PageHeader title={title} />
        <ul>
          <li>
            <Link to="/a">Go to A</Link>
          </li>
          <li>
            <Link to="/b">Go to B</Link>
          </li>
          <li>
            <Link to="#part">Jump to part</Link>
          </li>
          <li>
            <Link to="?filter=recent">Filter</Link>
          </li>
          <li>
            <Link to="/b#part">Part of B</Link>
          </li>
        </ul>
        <section id="part" aria-label={`${title} part`}>
          <p>Part of {title}</p>
        </section>
      </>
    );
  };
}

// Pages render behind Suspense; allow for a busy parallel test run.
configure({ asyncUtilTimeout: 5000 });

const PageA = makePage('Page A');
const PageB = makePage('Page B');

function renderPages(route = '/a') {
  return renderApp(
    <RouteFocusProvider>
      <Routes>
        <Route path="/a" element={<RoutePage page={PageA} />} />
        <Route path="/b" element={<RoutePage page={PageB} />} />
      </Routes>
    </RouteFocusProvider>,
    { route },
  );
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockReset();
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scrollIntoView });
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

describe('RouteFocus', () => {
  it('leaves focus alone on the first page of the app load', async () => {
    renderPages();
    expect(await screen.findByRole('heading', { level: 1, name: 'Page A' })).toBeInTheDocument();
    expect(document.body).toHaveFocus();
    expect(screen.getByTestId('live-region-polite')).toBeEmptyDOMElement();
  });

  it('moves focus to the new page heading and announces its title', async () => {
    const user = userEvent.setup();
    renderPages();
    await screen.findByRole('heading', { level: 1, name: 'Page A' });

    await user.click(screen.getByRole('link', { name: 'Go to B' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Page B' });
    await waitFor(() => expect(heading).toHaveFocus());
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent('Page B'));
  });

  it('scrolls to a hash target on the same page without moving focus', async () => {
    const user = userEvent.setup();
    renderPages();
    await screen.findByRole('heading', { level: 1, name: 'Page A' });

    const jump = screen.getByRole('link', { name: 'Jump to part' });
    await user.click(jump);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('part'));
    expect(jump).toHaveFocus();
  });

  it('does nothing when only the search string changes', async () => {
    const user = userEvent.setup();
    renderPages();
    await screen.findByRole('heading', { level: 1, name: 'Page A' });

    const filter = screen.getByRole('link', { name: 'Filter' });
    await user.click(filter);
    expect(filter).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('focuses the hash target when a link opens another page at a section', async () => {
    const user = userEvent.setup();
    renderPages();
    await screen.findByRole('heading', { level: 1, name: 'Page A' });

    await user.click(screen.getByRole('link', { name: 'Part of B' }));
    await screen.findByRole('heading', { level: 1, name: 'Page B' });
    const part = screen.getByRole('region', { name: 'Page B part' });
    await waitFor(() => expect(part).toHaveFocus());
    expect(part).toHaveAttribute('tabindex', '-1');
    await waitFor(() => expect(screen.getByTestId('live-region-polite')).toHaveTextContent('Page B'));
  });
});
