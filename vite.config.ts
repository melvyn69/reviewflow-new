import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Injection sécurisée pour le SDK Google Client-side
      'process.env': {
        API_KEY: env.API_KEY || env.VITE_API_KEY,
        NODE_ENV: JSON.stringify(mode),
      },
    },
    build: {
      // Ignorer l'API serverless lors du build frontend
      rollupOptions: {
        external: [/\/api\/.*/, /\/supabase\/.*/],
      },
    },
  };
});