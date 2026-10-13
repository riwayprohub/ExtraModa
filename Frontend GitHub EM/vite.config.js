import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') }
  },

  build: {
    // Hash en el nombre de los assets: es lo que permite cachearlos un año en
    // el Express de producción sin riesgo de servir una versión vieja.
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 900
  },

  server: {
    port: 5173,
    // En desarrollo el frontend habla con el backend por /api, que Vite reenvía
    // a http://localhost:3000. Así no hay CORS ni doble dominio, y las cookies
    // httpOnly del refresh token funcionan igual que en producción.
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});