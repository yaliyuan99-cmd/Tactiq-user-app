import { useCommandMapping } from '@/services/ServicesProvider';
import { act, renderApp, screen } from '@/test/renderApp';
import { settleProviders } from './testing/practiceTestUtils';
import { useShortcutLabels } from './useShortcutLabels';

function Labels() {
  const { labelFor, labelForToken } = useShortcutLabels();
  const commands = useCommandMapping();
  return (
    <div>
      <p>{labelFor('index_tip')}</p>
      <p>{labelFor('pinky_tip')}</p>
      <p>{labelFor('pinky_base')}</p>
      <p>{labelForToken('emergency')}</p>
      <button
        type="button"
        onClick={() => commands.set({ quick_action_1: 'unassigned', quick_action_2: 'open_assistant' })}
      >
        Change shortcuts
      </button>
    </div>
  );
}

describe('useShortcutLabels', () => {
  it('labels points and tokens with the default shortcuts', async () => {
    renderApp(<Labels />);
    await settleProviders();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Shortcut 1: Play or pause media')).toBeInTheDocument();
    expect(screen.getByText('Shortcut 2: Announce the time')).toBeInTheDocument();
    expect(screen.getByText('Emergency')).toBeInTheDocument();
  });

  it('follows changes to the shortcut mapping', async () => {
    renderApp(<Labels />);
    await settleProviders();
    act(() => screen.getByRole('button', { name: 'Change shortcuts' }).click());
    expect(screen.getByText('Shortcut 1 (nothing assigned)')).toBeInTheDocument();
    expect(screen.getByText('Shortcut 2: Open the voice assistant')).toBeInTheDocument();
  });
});
