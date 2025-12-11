import { createClient } from '@supabase/supabase-js';

// Safely get env vars whether in Vite (import.meta.env) or potentially other contexts
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase is not configured – check Vercel env vars');
}

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
        },
        realtime: {
            params: {
                eventsPerSecond: 2,
            },
        },
        global: {
            headers: { 'x-application-name': 'reviewflow' },
        },
      })
    : null;

export const isSupabaseConfigured = () => supabase !== null;
