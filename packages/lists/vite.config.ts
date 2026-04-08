import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/lists/',
  build: {
    outDir: '../../docs/lists',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '^(?!/lists/)': {
        target: 'https://tantaman.com',
        changeOrigin: true,
      },
    },
  },
});
