import { ROUTES, helpRoute, lessonRoute } from '@/app/routes';
import { COMMANDS } from '@/domain/commands';
import { DESIGN_TARGETS, EMERGENCY_SIMULATION_NOTICE } from '@/domain/evidence';
import { BATTERY_UNAVAILABLE_NOTE } from '@/domain/protocol';
import { screen, userEvent, within } from '@/test/renderApp';
import { renderHelpPage } from './helpTestUtils';
import { HELP_SECTIONS, HELP_SECTION_IDS, helpHeadingId } from './helpSections';

function region(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

describe('HelpPage', () => {
  it('has one h1, the title and the lede', async () => {
    await renderHelpPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toHaveAttribute('id', 'page-title');
    expect(
      screen.getByText('How to use Tactiq, what to do when something goes wrong, and what this project can and cannot do yet.'),
    ).toBeInTheDocument();
    expect(document.title).toBe('Help · Tactiq');
  });

  it('renders every section as a labelled region with its public id, in order', async () => {
    await renderHelpPage();
    const h2s = screen.getAllByRole('heading', { level: 2 });
    expect(h2s.map((h) => h.textContent)).toEqual(HELP_SECTIONS.map((section) => section.title));
    for (const section of HELP_SECTIONS) {
      const element = region(section.title);
      expect(element).toHaveAttribute('id', section.id);
      expect(element.tagName).toBe('SECTION');
      expect(within(element).getByRole('heading', { level: 2 })).toHaveAttribute('id', helpHeadingId(section.id));
    }
    expect(document.getElementById('troubleshooting')).not.toBeNull();
    expect(document.getElementById('limitations')).not.toBeNull();
  });

  it('keeps heading levels in order: h3 only inside sections, never before an h2', async () => {
    await renderHelpPage();
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)));
    for (let i = 1; i < levels.length; i += 1) {
      expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it('lists every section in the "On this page" contents, linking to the matching ids', async () => {
    await renderHelpPage();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(HELP_SECTIONS.map((section) => section.title));
    expect(links.map((link) => link.getAttribute('href'))).toEqual(HELP_SECTION_IDS.map((id) => helpRoute(id)));
    for (const id of HELP_SECTION_IDS) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('moves focus to the chosen section heading from the contents, by keyboard', async () => {
    const user = userEvent.setup();
    await renderHelpPage();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    within(nav).getByRole('link', { name: 'Project limitations' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 2, name: 'Project limitations' })).toHaveFocus();
  });

  it('shows the five steps as a numbered sequence with links to set up and practise', async () => {
    await renderHelpPage();
    const section = region('Getting started');
    const steps = within(section).getAllByRole('list')[0];
    expect(steps?.tagName).toBe('OL');
    const items = within(steps as HTMLElement).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent(/^Step 1Squeeze/);
    expect(within(section).getByRole('link', { name: /^Connect/ })).toHaveAttribute('href', ROUTES.connect);
    expect(within(section).getByRole('link', { name: /^Calibrate/ })).toHaveAttribute('href', ROUTES.calibrate);
    expect(within(section).getByRole('link', { name: /^Train/ })).toHaveAttribute('href', ROUTES.train);
    expect(within(section).getByRole('link', { name: /^Simulator/ })).toHaveAttribute('href', ROUTES.simulator);
  });

  it('lists the nine interactions and links to the command map', async () => {
    await renderHelpPage();
    const section = region('The nine commands');
    const list = within(section).getByRole('list', { name: 'Contact points and their commands' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(COMMANDS.length);
    expect(items[0]).toHaveTextContent('Index fingertip, · Brief tap: Confirm, Fixed');
    expect(items[8]).toHaveTextContent('Pinky fingertip, · Hold for 5 s: Emergency, Fixed, never remappable');
    expect(within(section).getByText(/it can never be changed or remapped/)).toBeInTheDocument();
    expect(
      within(section).getByRole('link', { name: 'See the full command map and customise your shortcuts' }),
    ).toHaveAttribute('href', ROUTES.commands);
  });

  it('explains practising with timing values, their sources and the emergency notice', async () => {
    await renderHelpPage();
    const section = region('Practising');
    const table = within(section).getByRole('table', { name: 'Timing values and where they come from' });
    expect(within(table).getByRole('rowheader', { name: 'Command window after a squeeze' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Command window with Longer interaction time' })).toBeInTheDocument();
    expect(within(table).getByText('Bench firmware ARM_WINDOW_MS')).toBeInTheDocument();
    expect(within(table).getByText('Placeholder')).toBeInTheDocument();
    expect(within(section).getByText('Design intent')).toBeInTheDocument();
    for (const name of ['Hand view and list view', 'The emergency hold button', 'What “Not recognised” means']) {
      expect(within(section).getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(within(section).getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
  });

  it('opens the linked troubleshooting answer from Practising and focuses its summary', async () => {
    const user = userEvent.setup();
    await renderHelpPage();
    const details = document.getElementById('commands-not-recognised') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    await user.click(within(region('Practising')).getByRole('link', { name: 'Commands are not recognised' }));
    expect(details.open).toBe(true);
    expect(details.querySelector('summary')).toHaveFocus();
  });

  it('covers keyboard, screen readers and display settings, with a link to Settings', async () => {
    await renderHelpPage();
    const section = region('Accessibility');
    expect(within(section).getByText(/VoiceOver, TalkBack, NVDA and JAWS/)).toBeInTheDocument();
    expect(within(section).getByText(/Safari on\s+iPhone and iPad cannot vibrate/)).toBeInTheDocument();
    expect(within(section).getByText(/200% browser zoom/)).toBeInTheDocument();
    expect(within(section).getAllByText('Escape').length).toBeGreaterThan(0);
    expect(within(section).getByText(/In this browser:/)).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Change accessibility and feedback settings' })).toHaveAttribute(
      'href',
      ROUTES.settings,
    );
  });

  it('states the limitations with the emergency notice verbatim and design targets labelled Design target', async () => {
    await renderHelpPage();
    const section = region('Project limitations');
    expect(within(section).getByText('No finished wearable ring exists.')).toBeInTheDocument();
    expect(within(section).getByText(EMERGENCY_SIMULATION_NOTICE)).toBeInTheDocument();
    expect(within(section).getByText(BATTERY_UNAVAILABLE_NOTE)).toBeInTheDocument();

    const table = within(section).getByRole('table', { name: 'Design targets, fixed before testing' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(DESIGN_TARGETS.length);
    DESIGN_TARGETS.forEach((target, index) => {
      const row = rows[index] as HTMLElement;
      expect(within(row).getByRole('rowheader', { name: target.label })).toBeInTheDocument();
      expect(within(row).getByText(target.target)).toBeInTheDocument();
      expect(within(row).getByText('Design target')).toBeInTheDocument();
    });
    expect(within(section).getByText('Simulated')).toBeInTheDocument();
  });

  it('never shows a battery percentage', async () => {
    const { container } = await renderHelpPage();
    const text = container.textContent ?? '';
    const sentences = text.split(/(?<=[.!?])\s*/);
    for (const sentence of sentences.filter((s) => /battery/i.test(s))) {
      expect(sentence).not.toMatch(/\d\s*%/);
    }
    expect(text).not.toMatch(/100\s*%/);
  });

  it('explains local storage, export and deletion, and says there are no analytics', async () => {
    await renderHelpPage();
    const section = region('Privacy and your data');
    expect(within(section).getByText(/stored in this browser on this device/)).toBeInTheDocument();
    expect(within(section).getByText(/no analytics, advertising or tracking/)).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Your activity in History' })).toHaveAttribute('href', ROUTES.history);
    expect(within(section).getByRole('link', { name: 'Privacy and your data in Settings' })).toHaveAttribute(
      'href',
      `${ROUTES.settings}#privacy`,
    );
  });

  it('offers email and the project website, clearly labelled and in the same tab', async () => {
    await renderHelpPage();
    const section = region('Contact');
    expect(within(section).getByRole('link', { name: 'Email hello@tactiq.app' })).toHaveAttribute(
      'href',
      'mailto:hello@tactiq.app',
    );
    const website = within(section).getByRole('link', { name: /Tactiq project website/ });
    expect(website).toHaveAttribute('href', 'https://tactiq0.netlify.app/');
    expect(website).not.toHaveAttribute('target');
    expect(website).toHaveAccessibleName(/leaves the app/);
  });

  it('links troubleshooting answers to real app routes', async () => {
    await renderHelpPage();
    const details = document.getElementById('emergency-hold-incomplete') as HTMLElement;
    expect(within(details).getByRole('link', { name: 'Practise in lesson 5', hidden: true })).toHaveAttribute(
      'href',
      lessonRoute('emergency_hold'),
    );
  });
});
