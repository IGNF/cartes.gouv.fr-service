import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'cartes.gouv.fr-service': fileURLToPath(new URL('./node_modules/cartes.gouv.fr-service/src/index.js', import.meta.url))
    }
  }
})
