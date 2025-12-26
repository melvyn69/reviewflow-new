import { createClient } from '@supabase/supabase-js';

// NOTE:
// - In Vite, env vars are exposed via import.meta.env (recommended).
// - process.env is kept only as a fallback for non-browser runtimes/tests.
const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const v = (import.meta as any).env[key];
      return typeof v === 'string' ? v : '';
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && (process as any).env) {
      const v = (process as any).env[key];
      return typeof v === 'string' ? v : '';
    }
  } catch {
    // ignore
  }

  return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] Not configured. Check Vercel env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          // Keep users logged in across refresh
          persistSession: true,
          // Keep tokens fresh
          autoRefreshToken: true,
          // Required for OAuth redirects to be detected (especially on Vercel)
          detectSessionInUrl: false,
          // Safer default for modern OAuth flows
          flowType: 'pkce',
        },
      })
    : null;

export const isSupabaseConfigured = () => supabase !== null;
