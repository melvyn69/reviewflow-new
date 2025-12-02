import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    define: {
      // On injecte uniquement la clé API Google de manière sûre
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      // IMPORTANT : Ne PAS définir 'process.env': {} car cela casse Supabase et d'autres libs
    }
  };
});