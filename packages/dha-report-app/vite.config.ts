import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/dha-report-app/',
  build: {
    outDir: '../../docs/dha-report-app',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api/dha': { target: 'https://tantaman.com', changeOrigin: true },
    },
  },
})
