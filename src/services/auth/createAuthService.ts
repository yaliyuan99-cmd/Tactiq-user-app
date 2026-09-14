import { IS_SUPABASE_CONFIGURED } from '@/lib/env';
import type { StorageAdapter } from '@/services/storage/StorageAdapter';
import { LocalDemoAuthService } from './LocalDemoAuthService';
import { SupabaseAuthService } from './SupabaseAuthService';
import { createLazySupabaseAuthClient } from './supabaseClient';
import type { AuthService } from './types';

/**
 * Picks the auth backend. Synchronous: in Supabase mode the client library is
 * imported and `createClient` called lazily on the first auth call (see
 * supabaseClient.ts), so Demo Mode never loads or constructs a client.
 */
export function createAuthService(storage: StorageAdapter): AuthService {
  return IS_SUPABASE_CONFIGURED
    ? new SupabaseAuthService(createLazySupabaseAuthClient())
    : new LocalDemoAuthService(storage);
}
