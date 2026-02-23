import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/thoughts/',
  build: {
    outDir: '../../docs/thoughts',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '^(?!/thoughts/)': {
        target: 'https://tantaman.com',
        changeOrigin: true,
      },
    },
  },
});
