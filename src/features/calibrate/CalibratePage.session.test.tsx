import { CONTACT_KEYS, type ContactKey } from '@/domain/contacts';
import { screen, within } from '@/test/renderApp';
import { RESULTS_WHAT_WAS_RECORDED } from './calibrationCopy';
import { evidenceSentence } from './calibrationWording';
import {
  calibrationProgress,
  clickAndOpenWindow,
  findPolite,
  promptHeading,
  renderCalibrate,
  storageWithIncompleteProfile,
  storedProfile,
  tap,
  type TestUser,
} from './testing/calibrateTestUtils';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function statusCells(): string[] {
  const table = screen.getByRole('table', { name: 'Samples per point' });
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').at(-1)?.textContent ?? '');
}

async function tapThrough(user: TestUser, points: readonly ContactKey[]): Promise<void> {
  for (const contact of points) await tap(user, contact, 3);
}

describe('Pausing, resuming and stopping', () => {
  it('pauses to the start screen with progress, then resumes at the right point', async () => {
    const { user, storage } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await tap(user, 'index_tip', 3);
    await tap(user, 'index_base');
    await findPolite('Got it. 1 of 3 on the index finger base.');

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    const heading = screen.getByRole('heading', { level: 2, name: 'Pick up where you left off' });
    expect(heading).toHaveFocus();
    await findPolite('Calibration paused. 4 of 24 taps accepted.');
    expect(screen.getByText(/Resuming carries on from the index finger base\./)).toBeInTheDocument();
    expect(calibrationProgress()).toHaveAttribute('aria-valuetext', '4 of 24 taps');
    const last = screen.getByRole('region', { name: 'Last calibration' });
    expect(within(last).getByText('Paused')).toBeInTheDocument();
    expect(storedProfile(storage)?.status).toBe('incomplete');
    expect(screen.getByRole('button', { name: 'Start again' })).toBeInTheDocument();

    await clickAndOpenWindow(user, 'Resume calibration');
    expect(promptHeading()).toHaveTextContent('Tap your Index finger base');
    expect(promptHeading()).toHaveFocus();
    expect(screen.getByText('Point 1 of 7')).toBeInTheDocument();
    expect(screen.getByText('Sample 2 of 3')).toBeInTheDocument();
    await findPolite('Calibration resumed.');
    await tap(user, 'index_base');
    await findPolite('Got it. 2 of 3 on the index finger base.');
  });

  it('asks before stopping, keeps the taps and returns to the dashboard', async () => {
    const { user, storage } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await tap(user, 'index_tip', 2);

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    const dialog = screen.getByRole('dialog', { name: 'Stop calibration?' });
    expect(dialog).toHaveAccessibleDescription('Taps so far are kept, and you can resume later.');
    await user.click(within(dialog).getByRole('button', { name: 'Keep calibrating' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(promptHeading()).toHaveTextContent('Tap your Index fingertip');

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stop calibration' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard stub' })).toBeInTheDocument();
    const profile = storedProfile(storage);
    expect(profile?.status).toBe('incomplete');
    expect(profile?.samples.filter((s) => s.accepted)).toHaveLength(2);
  });

  it('asks before starting again over an unfinished calibration', async () => {
    const { user, storage } = await renderCalibrate({ storage: storageWithIncompleteProfile(['ring_tip']) });
    await user.click(screen.getByRole('button', { name: 'Start again' }));
    const dialog = screen.getByRole('dialog', { name: 'Start calibration again?' });
    expect(dialog).toHaveAccessibleDescription('This replaces your unfinished calibration (21 of 24 taps accepted).');
    await clickAndOpenWindow(user, 'Start again');
    expect(promptHeading()).toHaveTextContent('Tap your Index fingertip');
    expect(screen.getByText('Point 1 of 8')).toBeInTheDocument();
    expect(storedProfile(storage)?.samples).toHaveLength(0);
  });
});

describe('Results', () => {
  it('completes after 24 accepted taps and shows eight Done rows', async () => {
    const { user, storage } = await renderCalibrate();
    await clickAndOpenWindow(user, 'Start calibration');
    await tapThrough(user, CONTACT_KEYS);

    const heading = screen.getByRole('heading', { level: 2, name: 'Calibration complete' });
    expect(heading).toHaveFocus();
    await findPolite('Pinky finger base done. All eight points have three accepted taps.');
    expect(screen.getByText('All eight points have three accepted taps.')).toBeInTheDocument();
    expect(statusCells()).toEqual(Array.from({ length: 8 }, () => 'Done'));
    const rows = within(screen.getByRole('table', { name: 'Samples per point' })).getAllByRole('row');
    expect(within(rows[1] as HTMLElement).getByRole('rowheader')).toHaveTextContent('Index fingertip');
    expect(within(rows[1] as HTMLElement).getAllByRole('cell').map((c) => c.textContent)).toEqual(['3', '3', 'Done']);
    expect(screen.getByText(/^Last performed/)).toBeInTheDocument();
    // The results must still say what was recorded and what the record is worth.
    expect(screen.getByText(RESULTS_WHAT_WAS_RECORDED)).toBeInTheDocument();
    expect(screen.getByText(evidenceSentence('simulated'))).toBeInTheDocument();
    expect(evidenceSentence('simulated')).toMatch(/reports whichever point you choose/);
    expect(evidenceSentence('simulated')).toMatch(/nothing was adjusted/);
    expect(screen.getByRole('link', { name: 'Practise in the simulator' })).toHaveAttribute('href', '/dashboard/simulator');
    expect(screen.getByRole('link', { name: 'Back to the dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByRole('button', { name: 'Repeat these points' })).not.toBeInTheDocument();
    expect(storedProfile(storage)?.status).toBe('complete');
  });

  it('shows Repeat rows for an incomplete run, and repeats only those points', async () => {
    const { user, storage } = await renderCalibrate({ storage: storageWithIncompleteProfile(['index_base', 'ring_tip']) });
    const last = screen.getByRole('region', { name: 'Last calibration' });
    expect(within(last).getByText('Index finger base and Ring fingertip')).toBeInTheDocument();
    expect(within(last).getByText('Incomplete')).toBeInTheDocument();

    await clickAndOpenWindow(user, 'Resume calibration');
    expect(promptHeading()).toHaveTextContent('Tap your Index finger base');
    expect(screen.getByText('Point 1 of 2')).toBeInTheDocument();
    await tap(user, 'index_tip', 3);
    expect(promptHeading()).toHaveTextContent('Tap your Ring fingertip');
    expect(screen.getByText('Point 2 of 2')).toBeInTheDocument();
    await tap(user, 'ring_base', 3);

    expect(screen.getByRole('heading', { level: 2, name: 'Calibration incomplete' })).toHaveFocus();
    expect(screen.getByText('Two points need repeating: Index finger base and Ring fingertip.')).toBeInTheDocument();
    expect(statusCells()).toEqual(['Done', 'Repeat', 'Done', 'Done', 'Repeat', 'Done', 'Done', 'Done']);
    const toRepeat = screen.getByRole('heading', { level: 3, name: 'Points to repeat' }).parentElement as HTMLElement;
    expect(within(toRepeat).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Index finger base', 'Ring fingertip']);
    expect(storedProfile(storage)?.status).toBe('incomplete');

    await clickAndOpenWindow(user, 'Repeat these points');
    await findPolite('Repeating two points.');
    expect(promptHeading()).toHaveTextContent('Tap your Index finger base');
    expect(screen.getByText('Point 1 of 2')).toBeInTheDocument();
    await tap(user, 'index_base', 3);
    expect(promptHeading()).toHaveTextContent('Tap your Ring fingertip');
    await tap(user, 'ring_tip', 3);

    expect(screen.getByRole('heading', { level: 2, name: 'Calibration complete' })).toHaveFocus();
    expect(statusCells()).toEqual(Array.from({ length: 8 }, () => 'Done'));
    const samples = storedProfile(storage)?.samples ?? [];
    expect(new Set(samples.slice(18).map((s) => s.contact))).toEqual(new Set(['index_base', 'ring_tip']));
  });
});
