
import { createClient } from '@supabase/supabase-js';

// Récupération sécurisée des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("🚨 ERREUR CRITIQUE : Configuration Supabase manquante.");
  console.error("Vérifiez votre fichier .env ou les variables d'environnement Vercel.");
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce', // Indispensable pour la stabilité OAuth sur Chrome/Safari récents
        },
      })
    : null;

export const isSupabaseConfigured = () => {
    return !!supabaseUrl && !!supabaseAnonKey;
};
