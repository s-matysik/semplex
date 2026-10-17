import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — aplikacja działa z dowolnej ścieżki (GitHub Pages: https://<użytkownik>.github.io/<repozytorium>/).
// semplex-ui ładuje bundle przez top-level await, więc cel kompilacji to ES2022.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
  worker: { format: 'es' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
});
