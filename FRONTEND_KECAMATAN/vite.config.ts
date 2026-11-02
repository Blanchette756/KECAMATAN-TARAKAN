import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // Saat pengembangan, /api diteruskan ke backend Fastify di BACKEND_KECAMATAN.
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
