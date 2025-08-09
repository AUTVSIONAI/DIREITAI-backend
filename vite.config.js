import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Configurações de desenvolvimento
  server: {
    port: 5121,
    host: true, // Permite acesso externo
    open: true, // Abre o navegador automaticamente
    cors: true,
    proxy: {
      // Proxy para API do backend
      '/api': {
        target: 'http://localhost:5120',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  // Configurações de preview
  preview: {
    port: 4173,
    host: true,
  },
  
  // Configurações de build
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar bibliotecas grandes em chunks separados
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
        },
      },
    },
    // Configurações de otimização
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
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