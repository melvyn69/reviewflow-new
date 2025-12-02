import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement au niveau de la configuration
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    // Empêche Vite de scanner le dossier API backend
    server: {
      watch: {
        ignored: ['**/api/**']
      }
    },
    // Polyfill pour que le SDK Google (qui utilise process.env) fonctionne dans le navigateur
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      // On évite de définir tout 'process.env' pour ne pas écraser les autres variables
    }
  };
});