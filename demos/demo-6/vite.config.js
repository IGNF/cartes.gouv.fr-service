import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: process.env.BASE_URL || '/demo',
  envDir: '.',
  envPrefix: ['VITE_', 'IAM_'],
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'cartes.gouv.fr-service': fileURLToPath(new URL('./node_modules/cartes.gouv.fr-service/src/index.js', import.meta.url))
    }
  }
});
