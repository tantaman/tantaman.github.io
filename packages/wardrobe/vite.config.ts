import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/wardrobe/',
  build: {
    outDir: '../../docs/wardrobe',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '^(?!/wardrobe/)': {
        target: 'https://tantaman.com',
        changeOrigin: true,
      },
    },
  },
});
