import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // Bawaan Vite hanya mendukung browser sangat baru. Dilonggarkan supaya HP Android lama
    // (yang tidak bisa memperbarui Chrome) tidak mendapat layar putih karena sintaks yang tidak dikenal.
    target: ['chrome80', 'safari13', 'firefox78', 'edge88'],
  },
  server: {
    // Saat pengembangan, /api diteruskan ke backend Fastify di BACKEND_KECAMATAN.
    proxy: { '/api': 'http://127.0.0.1:3000' },
  },
});
