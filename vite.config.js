import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

import { URL, fileURLToPath } from 'node:url'
import path from "path";
import pkg from './package.json'

export default defineConfig({
  plugins: [vue()],

  root: process.cwd(),

  envPrefix: ["VITE_", "IAM_"],
  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'ServiceLibrary',
      fileName: (format) => `service-library.${format}.js`,
      formats: ['es']
    },
    rollupOptions: {
      external: [...Object.keys(pkg.peerDependencies || {})]
    }
  }

})