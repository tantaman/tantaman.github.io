import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: 'src/routes',
      generatedRouteTree: 'src/routeTree.gen.ts',
      autoCodeSplitting: false,
    }),
    react(),
  ],
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
