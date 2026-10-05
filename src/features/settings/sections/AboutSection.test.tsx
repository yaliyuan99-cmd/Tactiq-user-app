import { DESIGN_TARGETS } from '@/domain/evidence';
import { screen, within } from '@/test/renderApp';
import { renderSettings } from '../testing/renderSettings';
import { AboutSection } from './AboutSection';

describe('AboutSection', () => {
  it('states the research status plainly', async () => {
    await renderSettings({}, <AboutSection />);
    expect(screen.getByText(/No finished Tactiq ring exists/)).toBeInTheDocument();
    expect(screen.getByText(/bench prototype firmware and a simulation pipeline/)).toBeInTheDocument();
    expect(screen.getByText(/physical performance has not been validated/)).toBeInTheDocument();
    expect(screen.getByText('Student research prototype from Sydney, Australia. "Tactiq" is a working title.')).toBeInTheDocument();
  });

  it('lists every design target, each labelled Design target', async () => {
    await renderSettings({}, <AboutSection />);
    const table = screen.getByRole('table', { name: 'Design targets' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(DESIGN_TARGETS.length);
    DESIGN_TARGETS.forEach((target, index) => {
      const row = rows[index];
      expect(row).toBeDefined();
      if (!row) return;
      expect(within(row).getByRole('rowheader')).toHaveTextContent(target.label);
      expect(within(row).getByText(target.target)).toBeInTheDocument();
      expect(within(row).getByText('Design target')).toBeInTheDocument();
    });
    expect(table.querySelectorAll('[data-evidence="design_target"]')).toHaveLength(DESIGN_TARGETS.length);
  });

  it('explains the abbreviations and code names the Source column quotes', async () => {
    await renderSettings({}, <AboutSection />);
    // The table quotes the research material, which the app must not leave as
    // unexplained jargon (AUSSEF, GATE_TAU_MS).
    const glossary = screen.getByText(/AUSSEF is the Australian science fair/);
    expect(glossary).toBeInTheDocument();
    expect(glossary).toHaveTextContent(/GATE_TAU_MS, is a setting in the bench firmware code/);
  });

  it('links to the limitations in Help', async () => {
    await renderSettings({}, <AboutSection />);
    expect(screen.getByRole('link', { name: 'Read about the prototype’s limitations' })).toHaveAttribute(
      'href',
      '/dashboard/help#limitations',
    );
  });
});
