const { build } = require('vite');
const path = require('path');

async function buildForProduction() {
  try {
    console.log('🚀 Starting production build...');
    
    await build({
      root: process.cwd(),
      mode: 'production',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        minify: 'terser',
        sourcemap: false
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