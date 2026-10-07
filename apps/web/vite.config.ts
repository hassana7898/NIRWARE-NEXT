import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nirware/config': path.resolve(__dirname, '../../packages/config/src'),
      '@nirware/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@nirware/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@nirware/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@nirware/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@nirware/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@nirware/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
    },
  },
});
