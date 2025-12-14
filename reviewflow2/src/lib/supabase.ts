
import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// On logue l'état pour le débogage en production
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase non configuré : Clés manquantes. Vérifiez le fichier .env ou les variables Vercel.');
} else {
  console.log('✅ Supabase configuré et prêt.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    })
    : null;

export const isSupabaseConfigured = () => !!supabase;
