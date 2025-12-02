import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement en gérant le cas où process est undefined
  const cwd = typeof process !== 'undefined' ? (process as any).cwd() : '';
  const env = loadEnv(mode, cwd, '');

  return {
    plugins: [react()],
    // Empêche Vite de scanner le dossier API backend
    server: {
      watch: {
        ignored: ['**/api/**']
      }
    },
    build: {
      // Évite les erreurs sur les fichiers TS mélangés
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    // Polyfill pour que le SDK Google (qui utilise process.env) fonctionne dans le navigateur
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
      // On définit process.env vide pour éviter les crashs de librairies tierces
      'process.env': {} 
    }
  };
});