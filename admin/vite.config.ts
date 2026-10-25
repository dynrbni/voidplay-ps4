import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)), base: './',
  publicDir: false, server: { host: '127.0.0.1', port: 5185, strictPort: true },
  preview: { host: '127.0.0.1', port: 4185, strictPort: true },
  build: { outDir: '../admin-dist', emptyOutDir: true }
});
