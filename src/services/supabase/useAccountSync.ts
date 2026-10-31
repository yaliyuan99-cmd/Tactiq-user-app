/**
 * Runs the mirror once per sign-in, when there is an account to mirror to.
 *
 * Inert in Demo Mode, which is the configuration this project actually ships:
 * with no `VITE_SUPABASE_URL` the hook returns immediately, never imports the
 * library and never touches storage. It exists so that configuring a project
 * is all it takes to turn syncing on, rather than syncing being a thing the
 * code describes but cannot do.
 *
 * Deliberately not on the path between a gesture and the screen. It runs after
 * the session settles, reports what happened, and is cancelled if the profile
 * changes under it — a result arriving for the previous account must never be
 * applied to the next one.
 */
import { useEffect, useRef, useState } from 'react';
import { IS_SUPABASE_CONFIGURED } from '@/lib/env';
import { useAuth } from '@/services/auth/AuthProvider';
import { useServices } from '@/services/ServicesProvider';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';
import { SupabaseMirror, type MirrorClient, type MirrorResult } from './SupabaseMirror';
import { createSupabaseMirrorClient } from './supabaseMirrorClient';

export type AccountSyncState =
  | { readonly status: 'off' }
  | { readonly status: 'syncing' }
  | { readonly status: 'done'; readonly result: MirrorResult }
  | { readonly status: 'failed'; readonly reason: string };

export interface AccountSyncOptions {
  /** Injected by tests. Left alone, the real client is built on first use. */
  readonly client?: MirrorClient;
  readonly enabled?: boolean;
}

/** Whether there is anything to mirror to: a configured project and an account on it. */
export function shouldSync(configured: boolean, provider: string | undefined, scopeId: string | null): boolean {
  return configured && provider === 'supabase' && typeof scopeId === 'string' && scopeId.length > 0;
}

export function useAccountSync(options: AccountSyncOptions = {}): AccountSyncState {
  const { user } = useAuth();
  const { storage, scopeId } = useServices();
  const [state, setState] = useState<AccountSyncState>({ status: 'off' });
  const ran = useRef<string | null>(null);

  const enabled = options.enabled ?? IS_SUPABASE_CONFIGURED;
  const active = shouldSync(enabled, user?.provider, scopeId);
  // The scope the services are built on, not the signed-in id: they can differ
  // for one render while a profile change settles, and syncing the wrong one
  // would write this account's records under the other's.
  const matched = active && user?.id === scopeId;

  useEffect(() => {
    if (!matched || scopeId === null) {
      if (!active) setState({ status: 'off' });
      return undefined;
    }
    if (ran.current === scopeId) return undefined;
    ran.current = scopeId;

    let cancelled = false;
    setState({ status: 'syncing' });
    const client = options.client ?? createSupabaseMirrorClient();
    const mirror = new SupabaseMirror(client, storage as StorageAdapter, scopeId);
    mirror.sync().then(
      (result) => {
        if (!cancelled) setState({ status: 'done', result });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'failed', reason: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      cancelled = true;
    };
    // `storage` is rebuilt with the scope, so scopeId covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, scopeId, active]);

  return state;
}
