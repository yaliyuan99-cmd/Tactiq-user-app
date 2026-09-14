import { ROUTES } from '@/app/routes';
import type { GestureEvent } from '@/domain/models';
import { downloadTextFile } from '@/lib/download';
import { LocalHistoryService } from '@/services/history/LocalHistoryService';
import { useHistory } from '@/services/ServicesProvider';
import { MemoryStorageAdapter, STORAGE_KEYS } from '@/services/storage/StorageAdapter';
import { renderApp, screen, userEvent, within } from '@/test/renderApp';
import { SAMPLE_RECORDS_NOTICE } from './EvidenceBanner';
import HistoryPage, { STORAGE_WARNING } from './HistoryPage';
import { TEST_NOW, manyEvents, minutesAgo, standardEvents, storageWith } from './historyTestData';

// The browser plumbing is tested in src/lib/download.test.ts; the real datedFilename names the file.
vi.mock('@/lib/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/download')>();
  return { ...actual, downloadTextFile: vi.fn() };
});

const polite = () => within(screen.getByTestId('live-region-polite'));

describe('HistoryPage data', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sample records', () => {
    function seededStorage() {
      return storageWith([
        ...standardEvents(),
        ...manyEvents(2, { seeded: true, targetContact: 'ring_base', detectedContact: 'ring_base', token: 'previous' }),
      ]);
    }

    it('says when sample records are included and labels them Sample', async () => {
      renderApp(<HistoryPage />, { route: ROUTES.history, storage: seededStorage() });
      expect(await screen.findByText(SAMPLE_RECORDS_NOTICE)).toBeInTheDocument();
      expect(SAMPLE_RECORDS_NOTICE).toBe(
        'Includes sample records created for Demo Mode so this page is not empty. They are marked Sample.',
      );
      const recent = screen.getByRole('table', { name: 'Newest first, showing 12 of 12' });
      expect(within(recent).getAllByText('Sample')).toHaveLength(2);
      expect(within(recent).getAllByText('Simulated')).toHaveLength(10);
    });

    it('does not show the notice without sample records', async () => {
      renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
      await screen.findByRole('region', { name: 'Summary' });
      expect(screen.queryByText(SAMPLE_RECORDS_NOTICE)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remove sample records' })).not.toBeInTheDocument();
    });

    it('removes only sample records after confirmation', async () => {
      const user = userEvent.setup();
      const storage = seededStorage();
      const removeSeeded = vi.spyOn(LocalHistoryService.prototype, 'removeSeeded');
      const clear = vi.spyOn(LocalHistoryService.prototype, 'clear');
      const append = vi.spyOn(LocalHistoryService.prototype, 'append');
      renderApp(<HistoryPage />, { route: ROUTES.history, storage });
      await user.click(await screen.findByRole('button', { name: 'Remove sample records' }));

      const dialog = screen.getByRole('dialog', { name: 'Remove sample records?' });
      expect(dialog).toHaveTextContent('This deletes the 2 sample records created for Demo Mode.');
      await user.click(within(dialog).getByRole('button', { name: 'Remove samples' }));

      expect(await polite().findByText('Removed 2 sample records.')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(SAMPLE_RECORDS_NOTICE)).not.toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'Newest first, showing 10 of 10' })).not.toHaveTextContent('Sample');
      expect(screen.getByRole('heading', { level: 2, name: 'Filters' })).toHaveFocus();
      const stored = storage.get<GestureEvent[]>(STORAGE_KEYS.history);
      expect(stored).toHaveLength(standardEvents().length);
      expect(stored?.every((e) => !e.seeded)).toBe(true);
      // The user's own records are kept unchanged, oldest first, by one call to the history service.
      expect(stored).toEqual(storageWith(standardEvents()).get(STORAGE_KEYS.history));
      expect(removeSeeded).toHaveBeenCalledTimes(1);
      expect(clear).not.toHaveBeenCalled();
      expect(append).not.toHaveBeenCalled();
    });

    it('moves focus to the page title when every record was a sample', async () => {
      const user = userEvent.setup();
      const storage = storageWith(manyEvents(3, { seeded: true }));
      renderApp(<HistoryPage />, { route: ROUTES.history, storage });
      await user.click(await screen.findByRole('button', { name: 'Remove sample records' }));
      expect(screen.getByRole('dialog', { name: 'Remove sample records?' })).toHaveTextContent(
        'This deletes the 3 sample records created for Demo Mode.',
      );
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove samples' }));

      expect(await polite().findByText('Removed 3 sample records.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'No activity yet' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Activity' })).toHaveFocus();
      expect(storage.get(STORAGE_KEYS.history)).toEqual([]);
    });

    it('keeps everything when the removal is cancelled', async () => {
      const user = userEvent.setup();
      renderApp(<HistoryPage />, { route: ROUTES.history, storage: seededStorage() });
      await user.click(await screen.findByRole('button', { name: 'Remove sample records' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
      expect(screen.getByText(SAMPLE_RECORDS_NOTICE)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove sample records' })).toHaveFocus();
    });
  });

  describe('export', () => {
    it('downloads every record as JSON, whatever the filters', async () => {
      const user = userEvent.setup();
      renderApp(<HistoryPage />, { route: `${ROUTES.history}?range=today`, storage: storageWith(standardEvents()) });
      await user.click(await screen.findByRole('button', { name: 'Download JSON' }));

      const mock = vi.mocked(downloadTextFile);
      expect(mock).toHaveBeenCalledTimes(1);
      const [content, filename, contentType] = mock.mock.calls[0] ?? [];
      expect(filename).toBe('tactiq-activity-2026-09-15.json');
      expect(contentType).toBe('application/json');
      const parsed = JSON.parse(content ?? '') as { format: string; note: string; events: unknown[] };
      expect(parsed.format).toBe('tactiq.history');
      expect(parsed.note).toMatch(/Not hardware measurements/);
      expect(parsed.events).toHaveLength(12);
      expect(await polite().findByText('Download started: tactiq-activity-2026-09-15.json.')).toBeInTheDocument();
    });

    it('downloads CSV with a CSV content type', async () => {
      const user = userEvent.setup();
      renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
      await user.click(await screen.findByRole('button', { name: 'Download CSV' }));

      const [content, filename, contentType] = vi.mocked(downloadTextFile).mock.calls[0] ?? [];
      expect(filename).toBe('tactiq-activity-2026-09-15.csv');
      expect(contentType).toBe('text/csv;charset=utf-8');
      const lines = (content ?? '').split('\r\n');
      expect(lines[0]).toBe(
        'id,at,source,mode,targetContact,detectedContact,token,durationMs,outcome,evidence,seeded,lessonId,targetToken',
      );
      expect(lines).toHaveLength(13);
    });

    it('names the file with the local calendar date, zero-padded', async () => {
      vi.setSystemTime(new Date(2026, 0, 5, 23, 59));
      const user = userEvent.setup();
      renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
      await user.click(await screen.findByRole('button', { name: 'Download CSV' }));
      expect(vi.mocked(downloadTextFile).mock.calls[0]?.[1]).toBe('tactiq-activity-2026-01-05.csv');
      expect(await polite().findByText('Download started: tactiq-activity-2026-01-05.csv.')).toBeInTheDocument();
    });
  });

  describe('clear all activity', () => {
    it('needs the word "clear", then removes everything and announces it', async () => {
      const user = userEvent.setup();
      const storage = storageWith(standardEvents());
      renderApp(<HistoryPage />, { route: ROUTES.history, storage });
      await user.click(await screen.findByRole('button', { name: 'Clear all activity' }));

      const dialog = screen.getByRole('dialog', { name: 'Clear all activity?' });
      const confirm = within(dialog).getByRole('button', { name: 'Clear activity' });
      expect(confirm).toHaveAttribute('aria-disabled', 'true');
      await user.click(confirm);
      expect(storage.get(STORAGE_KEYS.history)).toHaveLength(12);

      await user.type(within(dialog).getByRole('textbox', { name: 'Type “clear” to confirm' }), 'clear');
      await user.click(within(dialog).getByRole('button', { name: 'Clear activity' }));

      expect(await polite().findByText('Activity cleared.')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'No activity yet' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Activity' })).toHaveFocus();
      expect(storage.get(STORAGE_KEYS.history)).toBeNull();
    });

    it('keeps activity when cancelled', async () => {
      const user = userEvent.setup();
      renderApp(<HistoryPage />, { route: ROUTES.history, storage: storageWith(standardEvents()) });
      await user.click(await screen.findByRole('button', { name: 'Clear all activity' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Summary' })).toBeInTheDocument();
    });
  });

  describe('storage', () => {
    class HistoryRefusingStorage extends MemoryStorageAdapter {
      set<T>(key: string, value: T): boolean {
        if (key === STORAGE_KEYS.history) return false;
        return super.set(key, value);
      }
    }

    function AppendButton() {
      const history = useHistory();
      return (
        <button
          type="button"
          onClick={() =>
            history.append({
              at: minutesAgo(1),
              source: 'simulator',
              mode: 'free',
              targetContact: null,
              detectedContact: 'middle_base',
              token: 'next',
              durationMs: 180,
              outcome: 'recognised',
              evidence: 'simulated',
            })
          }
        >
          Record a test tap
        </button>
      );
    }

    it('warns when the browser is not saving activity', async () => {
      const user = userEvent.setup();
      renderApp(
        <>
          <AppendButton />
          <HistoryPage />
        </>,
        { route: ROUTES.history, storage: new HistoryRefusingStorage() },
      );
      expect(await screen.findByRole('heading', { name: 'No activity yet' })).toBeInTheDocument();
      expect(screen.queryByText(STORAGE_WARNING)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Record a test tap' }));
      expect(await screen.findByText(STORAGE_WARNING)).toBeInTheDocument();
      expect(STORAGE_WARNING).toBe('This browser is not saving activity, so it will be lost when you close the tab.');
      expect(screen.getByRole('table', { name: 'Newest first, showing 1 of 1' })).toBeInTheDocument();
    });
  });
});
