/** Optional backend configuration. Blank or placeholder values mean Demo Mode. */
function read(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = (import.meta.env[name] as string | undefined) ?? '';
  return value.trim();
}

export const SUPABASE_URL = read('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = read('VITE_SUPABASE_ANON_KEY');

export const IS_SUPABASE_CONFIGURED =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_URL.includes('YOUR-PROJECT') &&
  !SUPABASE_ANON_KEY.includes('YOUR-ANON');
