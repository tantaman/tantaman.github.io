import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
  ],
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
