import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocalStorageAdapter, MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import {
  ServicesProvider,
  createServices,
  useCalibration,
  useCommandMapping,
  useHistory,
  useServices,
  useTraining,
} from './ServicesProvider';
import { LocalHistoryService } from './history/LocalHistoryService';
import { LocalCalibrationService } from './calibration/LocalCalibrationService';
import { LocalTrainingService } from './training/LocalTrainingService';
import { LocalCommandMappingService } from './commands/LocalCommandMappingService';

describe('createServices', () => {
  it('builds every local service on one shared storage', () => {
    const storage = new MemoryStorageAdapter();
    const services = createServices(storage);
    expect(services.storage).toBe(storage);
    expect(services.history).toBeInstanceOf(LocalHistoryService);
    expect(services.calibration).toBeInstanceOf(LocalCalibrationService);
    expect(services.training).toBeInstanceOf(LocalTrainingService);
    expect(services.commands).toBeInstanceOf(LocalCommandMappingService);

    services.training.startRun('confirm_and_back');
    services.commands.set({ quick_action_1: 'unassigned', quick_action_2: 'unassigned' });
    expect(storage.keys().sort()).toEqual([STORAGE_KEYS.commandMapping, STORAGE_KEYS.training].sort());
  });
});

describe('ServicesProvider', () => {
  it('explains the problem when useServices is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useServices())).toThrow('useServices must be used inside <ServicesProvider>.');
  });

  it('uses the services it is given', () => {
    const services = createServices(new MemoryStorageAdapter());
    const wrapper = ({ children }: { children: ReactNode }) => <ServicesProvider services={services}>{children}</ServicesProvider>;
    const { result } = renderHook(() => useServices(), { wrapper });
    expect(result.current).toBe(services);
  });

  it('builds services on the storage it is given', () => {
    const storage = new MemoryStorageAdapter();
    const wrapper = ({ children }: { children: ReactNode }) => <ServicesProvider storage={storage}>{children}</ServicesProvider>;
    const { result, rerender } = renderHook(() => useServices(), { wrapper });
    const first = result.current;
    expect(first.storage).toBe(storage);
    rerender();
    expect(result.current).toBe(first);
  });

  it('falls back to localStorage when given nothing', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <ServicesProvider>{children}</ServicesProvider>;
    const { result } = renderHook(() => useServices(), { wrapper });
    expect(result.current.storage).toBeInstanceOf(LocalStorageAdapter);
    result.current.commands.set({ quick_action_1: 'announce_time', quick_action_2: 'play_pause' });
    expect(window.localStorage.getItem(`tactiq.${STORAGE_KEYS.commandMapping}`)).toContain('announce_time');
  });

  it('re-renders a component that appends to history', async () => {
    const user = userEvent.setup();
    function PracticeLog() {
      const history = useHistory();
      const services = useServices();
      return (
        <div>
          <p>{history.count()} practice records</p>
          <button
            type="button"
            className="target-44"
            onClick={() =>
              services.history.append({
                source: 'simulator',
                mode: 'free',
                targetContact: null,
                detectedContact: 'middle_base',
                token: 'next',
                durationMs: 230,
                outcome: 'recognised',
                evidence: 'simulated',
              })
            }
          >
            Record a tap
          </button>
        </div>
      );
    }
    const storage = new MemoryStorageAdapter();
    render(
      <ServicesProvider storage={storage}>
        <PracticeLog />
      </ServicesProvider>,
    );
    expect(screen.getByText('0 practice records')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record a tap' }));
    expect(screen.getByText('1 practice records')).toBeInTheDocument();
    expect(storage.get<unknown[]>(STORAGE_KEYS.history)).toHaveLength(1);
  });

  it('re-renders callers of the calibration, training and command hooks', () => {
    const services = createServices(new MemoryStorageAdapter());
    function Status() {
      const calibration = useCalibration();
      const training = useTraining();
      const commands = useCommandMapping();
      return (
        <ul>
          <li>Calibration: {calibration.summary().status}</li>
          <li>Lessons complete: {training.summary().lessonsCompleted}</li>
          <li>Shortcut 1: {commands.get().shortcuts.quick_action_1}</li>
        </ul>
      );
    }
    render(
      <ServicesProvider services={services}>
        <Status />
      </ServicesProvider>,
    );
    expect(screen.getByText('Calibration: not_started')).toBeInTheDocument();
    act(() => {
      services.calibration.start({ hand: 'right' });
    });
    expect(screen.getByText('Calibration: in_progress')).toBeInTheDocument();
    act(() => {
      services.training.startRun('squeeze_to_activate');
      services.training.completeRun('squeeze_to_activate');
    });
    expect(screen.getByText('Lessons complete: 1')).toBeInTheDocument();
    act(() => {
      services.commands.set({ quick_action_1: 'toggle_flashlight', quick_action_2: 'play_pause' });
    });
    expect(screen.getByText('Shortcut 1: toggle_flashlight')).toBeInTheDocument();
  });
});
