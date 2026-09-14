import { IS_SUPABASE_CONFIGURED } from '@/lib/env';
import { MemoryStorageAdapter } from '@/services/storage/StorageAdapter';
import { createAuthService } from './createAuthService';
import { LocalDemoAuthService } from './LocalDemoAuthService';

describe('createAuthService (no backend configured)', () => {
  it('uses the local Demo Mode service when the Supabase env is blank', async () => {
    expect(IS_SUPABASE_CONFIGURED).toBe(false);
    const storage = new MemoryStorageAdapter();
    const service = createAuthService(storage);
    expect(service).toBeInstanceOf(LocalDemoAuthService);
    expect(service.mode).toBe('demo');
    const user = await service.continueAsGuest();
    expect(await createAuthService(storage).getSession()).toEqual(user);
  });
});
