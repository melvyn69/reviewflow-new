import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement basées sur le mode (development, production)
  // Fix: Use '.' instead of process.cwd() to avoid TS error if types for process are missing
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    build: {
      // Évite les erreurs sur les imports mixtes CJS/ESM
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    define: {
      // On injecte manuellement la clé API pour le SDK Google qui attend process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
    }
  };
});