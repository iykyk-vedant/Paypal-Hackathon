import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/me': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/accounts': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/trades': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/refusals': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/rules': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/reserve': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/supply': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/regulator': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
