import { createClient, SupabaseClient } from '@supabase/supabase-js';

// On lit les valeurs depuis les variables d'environnement Vite
// à définir dans Vercel : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Création du client Supabase pour le FRONT (navigateur)
// On ne crée le client que si les deux valeurs existent
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Petit helper pour vérifier si Supabase est bien configuré
export const isSupabaseConfigured = () => supabase !== null;
