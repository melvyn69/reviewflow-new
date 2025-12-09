
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Injection sécurisée pour le SDK Google Client-side
      // On injecte les clés spécifiques plutôt que d'écraser tout l'objet process.env
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      // Fallback safe pour NODE_ENV si nécessaire, mais Vite le gère généralement
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      target: 'esnext',
      // Ignorer l'API serverless lors du build frontend pour accélérer le build
      // html5-qrcode est géré via importmap (CDN) pour éviter les erreurs de build Rollup
      rollupOptions: {
        external: [/\/api\/.*/, /\/supabase\/.*/, 'html5-qrcode'],
      },
    },
  };
});
