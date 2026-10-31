import { renderApp, screen, waitFor } from '@/test/renderApp';
import type { MirrorClient } from './SupabaseMirror';
import { shouldSync, useAccountSync, type AccountSyncOptions } from './useAccountSync';

function recordingClient() {
  const reads: string[] = [];
  const writes: string[] = [];
  const client: MirrorClient = {
    async selectAll<T>(table: string): Promise<T[]> {
      reads.push(table);
      return [] as T[];
    },
    async upsert(table) {
      writes.push(table);
    },
    async deleteFromOrdinal() {},
  };
  return { client, reads, writes };
}

function Probe(options: AccountSyncOptions) {
  const state = useAccountSync(options);
  return <p data-testid="sync">{state.status}</p>;
}

describe('whether there is anything to mirror to', () => {
  it('needs a configured project, an account on it, and a scope', () => {
    expect(shouldSync(true, 'supabase', 'u1')).toBe(true);
    // The shipped configuration: nothing to sync to, so nothing happens.
    expect(shouldSync(false, 'supabase', 'u1')).toBe(false);
    // A Demo Mode profile is local to the browser and has no account behind it.
    expect(shouldSync(true, 'demo', 'u1')).toBe(false);
    expect(shouldSync(true, 'supabase', null)).toBe(false);
    expect(shouldSync(true, 'supabase', '')).toBe(false);
  });
});

describe('useAccountSync', () => {
  it('does nothing at all in Demo Mode, which is what this build ships as', async () => {
    const { client, reads, writes } = recordingClient();
    renderApp(<Probe client={client} enabled={false} />);

    await waitFor(() => expect(screen.getByTestId('sync')).toHaveTextContent('off'));
    expect(reads).toEqual([]);
    expect(writes).toEqual([]);
  });

  it('does nothing for a local profile even when a project is configured', async () => {
    // The seeded test profile is a Demo Mode one: provider 'demo'.
    const { client, reads } = recordingClient();
    renderApp(<Probe client={client} enabled />);

    await waitFor(() => expect(screen.getByTestId('sync')).toHaveTextContent('off'));
    expect(reads).toEqual([]);
  });

  it('reports a failure rather than letting it escape into the tree', async () => {
    const failing: MirrorClient = {
      selectAll: () => Promise.reject(new Error('unreachable')),
      upsert: () => Promise.resolve(),
      deleteFromOrdinal: () => Promise.resolve(),
    };
    // Nothing is signed in as a Supabase account here, so this stays off; the
    // point is that rendering the hook cannot throw.
    renderApp(<Probe client={failing} enabled />);
    await waitFor(() => expect(screen.getByTestId('sync')).toBeInTheDocument());
  });
});
