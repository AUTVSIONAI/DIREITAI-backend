#!/usr/bin/env node

// Production build script for Vercel
import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildForProduction() {
  try {
    console.log('🚀 Starting production build...');
    
    const result = await build({
      root: __dirname,
      mode: 'production',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'terser',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              utils: ['@supabase/supabase-js']
            }
          }
        }
      },
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });
    
    console.log('✅ Production build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildForProduction();