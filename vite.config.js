import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Configurações de desenvolvimento
  server: {
    port: 5121,
    host: true,
    open: true,
    cors: true,
  },
  
  // Configurações de preview
  preview: {
    port: 4173,
    host: true,
  },
  
  // Configurações de build simplificadas
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2015',
    chunkSizeWarningLimit: 1000,
    // Reduzir preload automático
    modulePreload: {
      polyfill: false,
    },
  },
  
  // Configurações de resolução
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  
  // Configurações de CSS
  css: {
    devSourcemap: true,
  },
  
  // Configurações de otimização de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@headlessui/react',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
    ],
  },
  
  // Configurações de ambiente
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
});