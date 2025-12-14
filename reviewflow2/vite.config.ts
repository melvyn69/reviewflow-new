
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Injection sécurisée pour le SDK Google Client-side
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    server: {
      // Ouvre automatiquement le navigateur et écoute sur toutes les interfaces
      host: true, 
      open: true,
      hmr: {
        // Désactive l'overlay d'erreur plein écran si ça bug sur votre machine
        overlay: false
      }
    },
    build: {
      target: 'es2015', // Cible plus large pour compatibilité max
      rollupOptions: {
        external: [/\/api\/.*/, /\/supabase\/.*/, 'html5-qrcode'],
      },
    },
  };
});
