import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock('@/lib/env', () => ({
  SUPABASE_URL: 'https://example-project.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-long-enough-for-the-check',
  IS_SUPABASE_CONFIGURED: true,
}));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

describe('createAuthService (Supabase configured)', () => {
  it('uses the Supabase service and creates the client only on first use, with session options', async () => {
    const { createAuthService } = await import('./createAuthService');
    const { SupabaseAuthService } = await import('./SupabaseAuthService');
    createClient.mockReturnValue({
      auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) },
    });

    const service = createAuthService(new MemoryStorageAdapter());
    expect(service).toBeInstanceOf(SupabaseAuthService);
    expect(service.mode).toBe('supabase');
    expect(createClient).not.toHaveBeenCalled();

    expect(await service.getSession()).toBeNull();
    expect(await createAuthService(new MemoryStorageAdapter()).getSession()).toBeNull();
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://example-project.supabase.co', 'anon-key-long-enough-for-the-check', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  });
});
