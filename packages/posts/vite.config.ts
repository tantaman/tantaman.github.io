import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/posts-editor/',
  build: {
    outDir: '../../docs/posts-editor',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://tantaman.com',
        changeOrigin: true,
      },
    },
  },
});
