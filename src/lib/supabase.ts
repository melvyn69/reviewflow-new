
import { createClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Configuration Supabase manquante. Vérifiez votre fichier .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Crucial pour la stabilité OAuth sur les navigateurs modernes
  },
});

// Helper pour vérifier la connexion
export const isSupabaseConfigured = () => {
    return !!supabaseUrl && !!supabaseAnonKey;
};
