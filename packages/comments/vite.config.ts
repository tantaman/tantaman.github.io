import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: '/comments/',
  build: {
    outDir: '../../docs/comments',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'comments.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'comments.css';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
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
