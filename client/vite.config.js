import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api and /uploads to the Express backend so the
// frontend and API share one origin in development (no CORS issues).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5050',
      '/uploads': 'http://localhost:5050',
      '/local-assets': 'http://localhost:5050',
    },
  },
  preview: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5050',
      '/uploads': 'http://localhost:5050',
      '/local-assets': 'http://localhost:5050',
    },
  },
});
