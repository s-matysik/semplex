import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' - the application works from any path (GitHub Pages: https://<user>.github.io/<repository>/).
// semplex-ui loads the bundle via top-level await, so the compilation target is ES2022.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  worker: { format: 'es' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
