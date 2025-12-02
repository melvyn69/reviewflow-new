import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement
  // On utilise '.' au lieu de process.cwd() pour éviter les erreurs de typage
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Polyfill essentiel pour le SDK Google GenAI
      // On injecte explicitement API_KEY pour qu'elle soit disponible via process.env.API_KEY
      'process.env': {
        API_KEY: env.API_KEY || env.VITE_API_KEY,
        NODE_ENV: JSON.stringify(mode),
      },
    },
    build: {
      rollupOptions: {
        // On s'assure que le bundler ignore les fichiers backend
        external: [/\/api\/.*/, /\/supabase\/.*/],
      },
    },
  };
});