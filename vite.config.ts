import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge toutes les variables d'environnement
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // Polyfill global de process.env pour le navigateur
    // Cela permet au SDK @google/genai de fonctionner sans erreur
    define: {
      'process.env': env,
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});