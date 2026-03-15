import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: '/in-context/',
  build: {
    outDir: '../../docs/in-context',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'in-context.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'in-context.css';
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
