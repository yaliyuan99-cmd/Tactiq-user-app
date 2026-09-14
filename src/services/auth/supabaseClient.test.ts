import type { SupabaseAuthLike } from './SupabaseAuthService';
import { createLazySupabaseAuthClient } from './supabaseClient';

function realishClient() {
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn<SupabaseAuthLike['auth']['onAuthStateChange']>(() => ({
    data: { subscription: { unsubscribe } },
  }));
  const client: SupabaseAuthLike = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange,
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
    },
  };
  return { client, onAuthStateChange, unsubscribe };
}

describe('createLazySupabaseAuthClient', () => {
  it('does not load the client until a method is called', async () => {
    const { client } = realishClient();
    const load = vi.fn(async () => client);
    const lazy = createLazySupabaseAuthClient(load);
    expect(load).not.toHaveBeenCalled();
    await expect(lazy.auth.getSession()).resolves.toEqual({ data: { session: null }, error: null });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('attaches a subscription once loaded and detaches it on unsubscribe', async () => {
    const { client, onAuthStateChange, unsubscribe } = realishClient();
    const lazy = createLazySupabaseAuthClient(async () => client);
    const { data } = lazy.auth.onAuthStateChange(() => {});
    await vi.waitFor(() => expect(onAuthStateChange).toHaveBeenCalledTimes(1));
    data.subscription.unsubscribe();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('never attaches a subscription cancelled before the client loaded', async () => {
    const { client, onAuthStateChange } = realishClient();
    let resolve: (c: SupabaseAuthLike) => void = () => {};
    const loading = new Promise<SupabaseAuthLike>((r) => {
      resolve = r;
    });
    const lazy = createLazySupabaseAuthClient(() => loading);
    lazy.auth.onAuthStateChange(() => {}).data.subscription.unsubscribe();
    resolve(client);
    await loading;
    await Promise.resolve();
    expect(onAuthStateChange).not.toHaveBeenCalled();
  });

  it('rejects calls when the library cannot be loaded', async () => {
    const lazy = createLazySupabaseAuthClient(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
    await expect(lazy.auth.signOut()).rejects.toThrow('Failed to fetch');
    expect(() => lazy.auth.onAuthStateChange(() => {})).not.toThrow();
  });
});
